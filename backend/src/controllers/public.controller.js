const { query, beginTransaction, queryTransaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Gera número único do pedido para clientes
 */
async function generatePublicOrderNumber(restaurant_id) {
  const date = new Date();
  const datePart = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');

  const [{ count }] = await query(
    "SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ? AND DATE(created_at) = CURDATE()",
    [restaurant_id]
  );

  const seq = String(parseInt(count) + 1).padStart(4, '0');
  return `#${datePart}-${seq}`;
}

/**
 * Busca detalhes de um restaurante por seu slug público.
 */
const getRestaurantBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const restaurants = await query(
      `SELECT r.id, r.name, r.slug, COALESCE(rt.logo, r.logo) AS logo, COALESCE(rt.cover_image, r.cover_image) AS cover_image, r.status,
              rt.primary_color, rt.secondary_color, rt.accent_color, rt.background_color, rt.button_color, rt.text_color, rt.font_family,
              rt.card_style, rt.border_radius, rt.theme_mode,
              rs.is_open, rs.delivery_enabled, rs.delivery_fee, rs.min_order_value, rs.estimated_delivery_time, rs.pickup_enabled, rs.estimated_pickup_time,
              rs.accept_orders_when_closed, rs.welcome_message, rs.order_confirmed_message, rs.order_dispatched_message, rs.support_phone, rs.opening_hours,
              ps.accepts_cash, ps.accepts_credit_card, ps.accepts_debit_card, ps.accepts_pix, ps.pix_key, ps.pix_key_type,
              ps.pix_receiver_name, ps.pix_receiver_city, ps.pix_instructions
       FROM restaurants r
       LEFT JOIN restaurant_theme rt ON rt.restaurant_id = r.id
       LEFT JOIN restaurant_settings rs ON rs.restaurant_id = r.id
       LEFT JOIN payment_settings ps ON ps.restaurant_id = r.id
       WHERE r.slug = ? LIMIT 1`,
      [slug]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }

    const restaurant = restaurants[0];

    if (restaurant.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Este restaurante está indisponível no momento.' });
    }

    if (restaurant.opening_hours && typeof restaurant.opening_hours === 'string') {
      try {
        restaurant.opening_hours = JSON.parse(restaurant.opening_hours);
      } catch (err) {
        restaurant.opening_hours = null;
      }
    }

    return res.json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
};

/**
 * Retorna as categorias e produtos com seus complementos (estilo iFood)
 */
const getRestaurantMenu = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // Identifica o restaurante ativo pelo slug
    const restaurants = await query('SELECT id, status FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }
    
    const restaurant = restaurants[0];
    if (restaurant.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Este restaurante está indisponível.' });
    }
    
    // Seleciona categorias ativas do cardápio
    const categories = await query(
      'SELECT id, name, description, position, icon, color, image_url FROM categories WHERE restaurant_id = ? AND is_active = 1 ORDER BY position ASC',
      [restaurant.id]
    );
    
    // Seleciona produtos disponíveis (oculta automaticamente se is_available for 0)
    const products = await query(
      `SELECT id, category_id, name, description, price, promotional_price, image_url, images,
              is_available, is_featured, serves_how_many, preparation_time, position, sku, track_stock, stock_quantity 
       FROM products 
       WHERE restaurant_id = ? AND is_available = 1 
       ORDER BY position ASC, name ASC`,
      [restaurant.id]
    );
    
    // Seleciona complementos/opcionais dos produtos
    const productComplements = await query(
      `SELECT pc.product_id, cg.id AS group_id, cg.name AS group_name, cg.description, cg.is_required, cg.min_quantity, cg.max_quantity, cg.position
       FROM product_complements pc
       JOIN complement_groups cg ON cg.id = pc.complement_group_id
       WHERE cg.restaurant_id = ? AND cg.is_active = 1
       ORDER BY cg.position ASC`,
      [restaurant.id]
    );

    const complementItems = await query(
      `SELECT ci.id, ci.complement_group_id, ci.name, ci.price, ci.max_quantity, ci.position
       FROM complement_items ci
       JOIN complement_groups cg ON cg.id = ci.complement_group_id
       WHERE cg.restaurant_id = ? AND ci.is_active = 1
       ORDER BY ci.position ASC`,
      [restaurant.id]
    );

    const itemsByGroup = {};
    complementItems.forEach(item => {
      if (!itemsByGroup[item.complement_group_id]) {
        itemsByGroup[item.complement_group_id] = [];
      }
      itemsByGroup[item.complement_group_id].push(item);
    });

    const groupsByProduct = {};
    productComplements.forEach(pc => {
      if (!groupsByProduct[pc.product_id]) {
        groupsByProduct[pc.product_id] = [];
      }
      const groupWithItems = {
        id: pc.group_id,
        name: pc.group_name,
        description: pc.description,
        is_required: pc.is_required,
        min_quantity: pc.min_quantity,
        max_quantity: pc.max_quantity,
        position: pc.position,
        items: itemsByGroup[pc.group_id] || []
      };
      groupsByProduct[pc.product_id].push(groupWithItems);
    });
    
    // Anexa as opções correspondentes a cada produto
    const productsWithOptions = products.map(prod => {
      try {
        prod.images = prod.images ? (typeof prod.images === 'string' ? JSON.parse(prod.images) : prod.images) : [];
      } catch (err) {
        prod.images = [];
      }
      return {
        ...prod,
        complements: groupsByProduct[prod.id] || [],
        options: [] // Compatibilidade com frontend legado se necessário
      };
    });
    
    return res.json({
      success: true,
      data: {
        categories,
        products: productsWithOptions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cria um pedido no cardápio - Requer autenticação do cliente
 */
const createPublicOrder = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const {
      order_type = 'delivery', payment_method = 'cash',
      delivery_address, delivery_number, delivery_complement, delivery_neighborhood, delivery_city, delivery_state, delivery_zip_code, reference,
      items, notes, change_for
    } = req.body;

    const customerId = req.customer.id;
    const customer_name = req.customer.name;
    const customer_phone = req.customer.phone;
    const customer_email = req.customer.email;

    // 1. Busca restaurante pelo slug
    const restaurants = await query('SELECT id, status, name FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }

    const restaurant = restaurants[0];
    if (restaurant.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Este restaurante não está aceitando pedidos.' });
    }

    // 2. Valida Status de Assinatura
    const subscriptions = await query(
      `SELECT * FROM subscriptions WHERE restaurant_id = ? ORDER BY id DESC LIMIT 1`,
      [restaurant.id]
    );

    const now = new Date();
    let isBlocked = false;

    if (subscriptions.length === 0) {
      isBlocked = true;
    } else {
      const sub = subscriptions[0];
      if (sub.status === 'canceled' || sub.status === 'overdue') {
        isBlocked = true;
      } else if (sub.due_date && new Date(sub.due_date) < now) {
        isBlocked = true;
      }
    }

    if (isBlocked) {
      return res.status(402).json({
        success: false,
        message: 'O estabelecimento está temporariamente indisponível para receber pedidos.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'O pedido deve conter itens no carrinho.' });
    }

    // 3. Busca taxas operacionais do restaurante e status de funcionamento
    const settings = await query(
      'SELECT delivery_fee, min_order_value, is_open, accept_orders_when_closed FROM restaurant_settings WHERE restaurant_id = ? LIMIT 1',
      [restaurant.id]
    );

    if (settings.length > 0) {
      const isOpenStatus = settings[0].is_open;
      const acceptWhenClosed = settings[0].accept_orders_when_closed;
      if (!isOpenStatus && !acceptWhenClosed) {
        return res.status(403).json({
          success: false,
          message: 'O estabelecimento está fechado no momento e não está aceitando novos pedidos.'
        });
      }
    }

    const deliveryFee = order_type === 'delivery' ? parseFloat(settings[0]?.delivery_fee || 0) : 0;
    const minOrderVal = parseFloat(settings[0]?.min_order_value || 0);

    // 4. Valida valores dos itens e opcionais selecionados
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const products = await query(
        'SELECT id, name, price, promotional_price, is_available, track_stock, stock_quantity FROM products WHERE id = ? AND restaurant_id = ? LIMIT 1',
        [item.product_id, restaurant.id]
      );

      if (products.length === 0) {
        return res.status(400).json({ success: false, message: `Produto ID ${item.product_id} não encontrado.` });
      }

      const product = products[0];
      if (!product.is_available) {
        return res.status(400).json({ success: false, message: `Produto "${product.name}" está temporariamente esgotado.` });
      }

      // Verifica estoque se ativo
      if (product.track_stock && product.stock_quantity !== null && product.stock_quantity < item.quantity) {
        return res.status(400).json({ success: false, message: `O produto "${product.name}" possui apenas ${product.stock_quantity} unidades em estoque.` });
      }

      const unit_price = parseFloat(product.promotional_price || product.price);
      let optionsPrice = 0;
      const optionsArray = [];

      // Processa complementos estilo iFood
      if (item.complements && item.complements.length > 0) {
        for (const compSelection of item.complements) {
          const compItems = await query(
            `SELECT ci.name, ci.price, ci.max_quantity
             FROM complement_items ci
             JOIN complement_groups cg ON cg.id = ci.complement_group_id
             WHERE ci.id = ? AND cg.is_active = 1 LIMIT 1`,
            [compSelection.id]
          );

          if (compItems.length > 0) {
            const ci = compItems[0];
            const selQty = parseInt(compSelection.quantity) || 1;
            
            if (selQty > ci.max_quantity) {
              return res.status(400).json({ success: false, message: `Quantidade do item "${ci.name}" excede o limite máximo permitido (${ci.max_quantity}).` });
            }

            const itemTotalPrice = parseFloat(ci.price || 0) * selQty;
            optionsPrice += itemTotalPrice;
            optionsArray.push({
              id: compSelection.id,
              name: ci.name,
              price: ci.price,
              quantity: selQty
            });
          }
        }
      }

      const final_unit_price = unit_price + optionsPrice;
      const total_price = final_unit_price * item.quantity;
      subtotal += total_price;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: final_unit_price,
        total_price,
        notes: item.notes || null,
        options: optionsArray.length > 0 ? JSON.stringify(optionsArray) : null,
        track_stock: product.track_stock,
        stock_quantity: product.stock_quantity
      });
    }

    if (subtotal < minOrderVal) {
      return res.status(400).json({
        success: false,
        message: `O valor mínimo para pedidos no estabelecimento é R$ ${minOrderVal.toFixed(2)}.`
      });
    }

    const total = subtotal + deliveryFee;

    // 4b. Valida duplicidade de pedido no backend (nos últimos 2 minutos)
    const duplicateOrders = await query(
      `SELECT o.id FROM orders o
       WHERE o.restaurant_id = ?
         AND o.customer_id = ?
         AND o.total = ?
         AND o.status = 'pending'
         AND o.created_at >= NOW() - INTERVAL 2 MINUTE
       LIMIT 1`,
      [restaurant.id, customerId, total]
    );

    if (duplicateOrders.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Um pedido idêntico foi enviado nos últimos 2 minutos. Aguarde a confirmação do estabelecimento.'
      });
    }

    const order_number = await generatePublicOrderNumber(restaurant.id);

    // 5. Inicia gravação atômica do pedido
    const connection = await beginTransaction();
    try {
      // Salva endereço no histórico do cliente se for novo
      if (order_type === 'delivery' && delivery_zip_code && delivery_address && delivery_number) {
        const addressCheck = await queryTransaction(connection,
          'SELECT id FROM customer_addresses WHERE customer_id = ? AND zip_code = ? AND street = ? AND number = ? LIMIT 1',
          [customerId, delivery_zip_code, delivery_address, delivery_number]
        );
        if (addressCheck.length === 0) {
          await queryTransaction(connection,
            `INSERT INTO customer_addresses (customer_id, zip_code, street, number, complement, neighborhood, city, state, reference, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [customerId, delivery_zip_code, delivery_address, delivery_number, delivery_complement || null, delivery_neighborhood, delivery_city, delivery_state, reference || null]
          );
        }
      }

      // Cria pedido
      const orderResult = await queryTransaction(connection,
        `INSERT INTO orders (restaurant_id, customer_id, order_number, order_type, source, status, payment_method, payment_status,
          subtotal, delivery_fee, total, notes, change_for,
          delivery_address, delivery_number, delivery_complement, delivery_neighborhood, delivery_city, delivery_state, delivery_zip_code)
         VALUES (?, ?, ?, ?, 'site', 'pending', ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [restaurant.id, customerId, order_number, order_type, payment_method,
         subtotal, deliveryFee, total, notes || null, change_for ? parseFloat(change_for) : null,
         delivery_address || null, delivery_number || null, delivery_complement || null,
         delivery_neighborhood || null, delivery_city || null, delivery_state || null, delivery_zip_code || null]
      );
      const order_id = orderResult.insertId;

      // Grava itens e deduz estoque se rastreado
      for (const item of validatedItems) {
        await queryTransaction(connection,
          'INSERT INTO order_items (order_id, restaurant_id, product_id, product_name, quantity, unit_price, total_price, options, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [order_id, restaurant.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.options, item.notes]
        );

        if (item.track_stock) {
          await queryTransaction(connection,
            'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }

      // Adiciona histórico de status inicial
      await queryTransaction(connection,
        'INSERT INTO order_status_logs (order_id, restaurant_id, to_status, notes) VALUES (?, ?, \'pending\', \'Pedido enviado pelo cardápio público\')',
        [order_id, restaurant.id]
      );

      // Inicializa o chat do pedido
      await queryTransaction(connection,
        'INSERT INTO order_messages (order_id, restaurant_id, sender_type, message) VALUES (?, ?, \'system\', \'Pedido enviado! Aguardando confirmação do estabelecimento. ⏳\')',
        [order_id, restaurant.id]
      );

      // Incrementa estatísticas do cliente
      await queryTransaction(connection,
        'UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_order_at = NOW() WHERE id = ?',
        [total, customerId]
      );

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: 'Pedido realizado com sucesso!',
        data: {
          id: order_id,
          order_number,
          total
        }
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Retorna os detalhes de um pedido público
 */
const getPublicOrder = async (req, res, next) => {
  try {
    const { slug, id } = req.params;

    // Busca o ID do restaurante
    const restaurants = await query('SELECT id FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }
    const restaurant = restaurants[0];

    const orders = await query(
      `SELECT o.*,
              c.name as customer_name, c.phone as customer_phone,
              d.name as driver_name, d.phone as driver_phone
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN delivery_drivers d ON d.id = o.driver_id
       WHERE o.id = ? AND o.restaurant_id = ? LIMIT 1`,
      [id, restaurant.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }

    const order = orders[0];

    const items = await query(
      `SELECT oi.*, p.image_url as product_image
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ? AND oi.restaurant_id = ?`,
      [id, restaurant.id]
    );

    const logs = await query(
      'SELECT to_status, notes, created_at FROM order_status_logs WHERE order_id = ? AND restaurant_id = ? ORDER BY created_at ASC',
      [id, restaurant.id]
    );

    return res.json({
      success: true,
      data: {
        ...order,
        items,
        logs
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retorna mensagens do chat de um pedido
 */
const getPublicMessages = async (req, res, next) => {
  try {
    const { slug, id } = req.params;

    const restaurants = await query('SELECT id FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }
    const restaurant_id = restaurants[0].id;

    const messages = await query(
      `SELECT * FROM order_messages 
       WHERE order_id = ? AND restaurant_id = ? 
       ORDER BY created_at ASC`,
      [id, restaurant_id]
    );

    return res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

/**
 * Envia uma mensagem no chat do pedido
 */
const sendPublicMessage = async (req, res, next) => {
  try {
    const { slug, id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A mensagem não pode ser vazia.' });
    }

    const restaurants = await query('SELECT id FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }
    const restaurant_id = restaurants[0].id;

    const orders = await query('SELECT id FROM orders WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }

    const result = await query(
      'INSERT INTO order_messages (order_id, restaurant_id, sender_type, message) VALUES (?, ?, ?, ?)',
      [id, restaurant_id, 'customer', message.trim()]
    );

    const newMessage = {
      id: result.insertId,
      order_id: parseInt(id),
      restaurant_id,
      sender_type: 'customer',
      message: message.trim(),
      created_at: new Date()
    };

    return res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    next(error);
  }
};

// === CUSTOMER AUTH ACTIONS ===

const customerRegister = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, email, phone, document, password } = req.body;

    if (!name || !phone || !document || !password) {
      return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios (Nome, WhatsApp, CPF e Senha).' });
    }

    const restaurants = await query('SELECT id FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }
    const restaurant_id = restaurants[0].id;

    const existing = await query(
      'SELECT id FROM customers WHERE restaurant_id = ? AND (phone = ? OR (email IS NOT NULL AND email = ?) OR document = ?) LIMIT 1',
      [restaurant_id, phone, email || null, document]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Este WhatsApp, E-mail ou CPF já está cadastrado para este estabelecimento.' });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO customers (restaurant_id, name, email, phone, document, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [restaurant_id, name, email || null, phone, document, password_hash]
    );

    const customerId = result.insertId;

    const token = jwt.sign(
      { id: customerId, email, name, restaurant_id, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso!',
      data: {
        token,
        customer: { id: customerId, name, email, phone, document }
      }
    });
  } catch (error) {
    next(error);
  }
};

const customerLogin = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Informe seu identificador (WhatsApp/E-mail) e sua Senha.' });
    }

    const restaurants = await query('SELECT id FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }
    const restaurant_id = restaurants[0].id;

    const customers = await query(
      'SELECT * FROM customers WHERE restaurant_id = ? AND (email = ? OR phone = ? OR document = ?) LIMIT 1',
      [restaurant_id, email, email, email]
    );

    if (customers.length === 0) {
      return res.status(401).json({ success: false, message: 'WhatsApp/E-mail ou senha incorretos.' });
    }

    const customer = customers[0];

    if (customer.is_blocked) {
      return res.status(403).json({ success: false, message: 'Sua conta está suspensa neste estabelecimento.' });
    }

    if (!customer.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Esta conta ainda não possui senha. Por favor, registre-se para criar sua senha.'
      });
    }

    const isValid = await bcrypt.compare(password, customer.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'WhatsApp/E-mail ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: customer.id, email: customer.email, name: customer.name, restaurant_id: customer.restaurant_id, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      data: {
        token,
        customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, document: customer.document }
      }
    });
  } catch (error) {
    next(error);
  }
};

const customerMe = async (req, res, next) => {
  try {
    return res.json({
      success: true,
      data: {
        id: req.customer.id,
        name: req.customer.name,
        email: req.customer.email,
        phone: req.customer.phone,
        document: req.customer.document
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerOrders = async (req, res, next) => {
  try {
    const customerId = req.customer.id;
    const orders = await query(
      `SELECT o.* 
       FROM orders o
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC`,
      [customerId]
    );

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await query(
          'SELECT oi.*, p.image_url as product_image FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?',
          [order.id]
        );
        return { ...order, items };
      })
    );

    return res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    next(error);
  }
};

// === SAVED ADDRESSES ACTIONS ===

const getCustomerAddresses = async (req, res, next) => {
  try {
    const customerId = req.customer.id;
    const addresses = await query(
      'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC',
      [customerId]
    );
    return res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

const addCustomerAddress = async (req, res, next) => {
  try {
    const customerId = req.customer.id;
    const { zip_code, street, number, complement, neighborhood, city, state, reference, is_default = 0 } = req.body;

    if (!zip_code || !street || !number || !neighborhood || !city || !state) {
      return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios do endereço.' });
    }

    if (is_default) {
      await query('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [customerId]);
    }

    const result = await query(
      `INSERT INTO customer_addresses (customer_id, zip_code, street, number, complement, neighborhood, city, state, reference, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, zip_code, street, number, complement || null, neighborhood, city, state, reference || null, is_default ? 1 : 0]
    );

    const created = await query('SELECT * FROM customer_addresses WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, message: 'Endereço salvo com sucesso!', data: created[0] });
  } catch (error) {
    next(error);
  }
};

const deleteCustomerAddress = async (req, res, next) => {
  try {
    const customerId = req.customer.id;
    const { id } = req.params;

    const check = await query('SELECT id FROM customer_addresses WHERE id = ? AND customer_id = ? LIMIT 1', [id, customerId]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Endereço não encontrado.' });
    }

    await query('DELETE FROM customer_addresses WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Endereço removido com sucesso.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRestaurantBySlug,
  getRestaurantMenu,
  createPublicOrder,
  getPublicOrder,
  getPublicMessages,
  sendPublicMessage,
  customerRegister,
  customerLogin,
  customerMe,
  getCustomerOrders,
  getCustomerAddresses,
  addCustomerAddress,
  deleteCustomerAddress
};
