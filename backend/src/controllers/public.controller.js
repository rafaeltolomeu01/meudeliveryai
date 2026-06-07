const { query, beginTransaction, queryTransaction } = require('../config/database');

/**
 * Gera número único do pedido para clientes anônimos
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
 * Busca detalhes de um restaurante (incluindo configurações, cores e tema) por seu slug público.
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
 * Retorna as categorias e produtos disponíveis no cardápio de um restaurante.
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
      'SELECT id, name, description, position FROM categories WHERE restaurant_id = ? AND is_active = 1 ORDER BY position ASC',
      [restaurant.id]
    );
    
    // Seleciona produtos disponíveis
    const products = await query(
      `SELECT id, category_id, name, description, price, promotional_price, image_url, 
              is_available, is_featured, serves_how_many, preparation_time, position 
       FROM products 
       WHERE restaurant_id = ? AND is_available = 1 
       ORDER BY position ASC, name ASC`,
      [restaurant.id]
    );
    
    // Seleciona opcionais/adicionais dos produtos
    const options = await query(
      `SELECT id, product_id, group_name, name, price, is_required, min_quantity, max_quantity 
       FROM product_options 
       WHERE restaurant_id = ? AND is_active = 1 
       ORDER BY group_name ASC, position ASC`,
      [restaurant.id]
    );
    
    // Agrupa opções por ID de produto
    const optionsByProduct = {};
    options.forEach(opt => {
      if (!optionsByProduct[opt.product_id]) {
        optionsByProduct[opt.product_id] = [];
      }
      optionsByProduct[opt.product_id].push(opt);
    });
    
    // Anexa as opções correspondentes a cada produto
    const productsWithOptions = products.map(prod => {
      return {
        ...prod,
        options: optionsByProduct[prod.id] || []
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
 * Cria um pedido no cardápio de forma anônima (checkout público)
 */
const createPublicOrder = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const {
      customer_name, customer_phone, customer_email,
      order_type = 'delivery', payment_method = 'cash',
      delivery_address, delivery_number, delivery_complement, delivery_neighborhood, delivery_city, delivery_state, delivery_zip_code,
      items, notes, change_for
    } = req.body;

    // 1. Busca restaurante pelo slug
    const restaurants = await query('SELECT id, status, name FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }

    const restaurant = restaurants[0];
    if (restaurant.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Este restaurante não está aceitando pedidos.' });
    }

    // 2. Valida Status de Assinatura (Regra: bloquear pedidos se assinatura estiver vencida)
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
        'SELECT id, name, price, promotional_price, is_available FROM products WHERE id = ? AND restaurant_id = ? LIMIT 1',
        [item.product_id, restaurant.id]
      );

      if (products.length === 0) {
        return res.status(400).json({ success: false, message: `Produto ID ${item.product_id} não encontrado.` });
      }

      const product = products[0];
      if (!product.is_available) {
        return res.status(400).json({ success: false, message: `Produto "${product.name}" está temporariamente esgotado.` });
      }

      const unit_price = parseFloat(product.promotional_price || product.price);
      let optionsPrice = 0;
      const optionsArray = [];

      if (item.options && item.options.length > 0) {
        for (const optId of item.options) {
          const opts = await query(
            'SELECT name, price FROM product_options WHERE id = ? AND product_id = ? LIMIT 1',
            [optId, product.id]
          );
          if (opts.length > 0) {
            optionsPrice += parseFloat(opts[0].price || 0);
            optionsArray.push({ id: optId, name: opts[0].name, price: opts[0].price });
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
        options: optionsArray.length > 0 ? JSON.stringify(optionsArray) : null
      });
    }

    if (subtotal < minOrderVal) {
      return res.status(400).json({
        success: false,
        message: `O valor mínimo para pedidos no estabelecimento é R$ ${minOrderVal.toFixed(2)}.`
      });
    }

    const total = subtotal + deliveryFee;

    // 4b. Valida duplicidade de pedido no backend (mesmo telefone, mesmo total, nos últimos 2 minutos)
    if (customer_phone) {
      const duplicateOrders = await query(
        `SELECT o.id FROM orders o
         JOIN customers c ON c.id = o.customer_id
         WHERE o.restaurant_id = ?
           AND c.phone = ?
           AND o.total = ?
           AND o.status = 'pending'
           AND o.created_at >= NOW() - INTERVAL 2 MINUTE
         LIMIT 1`,
        [restaurant.id, customer_phone, total]
      );

      if (duplicateOrders.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Um pedido idêntico foi enviado nos últimos 2 minutos. Aguarde a confirmação do estabelecimento.'
        });
      }
    }

    const order_number = await generatePublicOrderNumber(restaurant.id);

    // 5. Inicia gravação atômica do pedido
    const connection = await beginTransaction();
    try {
      // Cria ou vincula cliente
      let customerId = null;
      if (customer_phone) {
        const existingCust = await queryTransaction(connection,
          'SELECT id FROM customers WHERE restaurant_id = ? AND phone = ? LIMIT 1',
          [restaurant.id, customer_phone]
        );
        if (existingCust.length > 0) {
          customerId = existingCust[0].id;
          await queryTransaction(connection,
            `UPDATE customers SET
              name = ?, email = COALESCE(?, email),
              address = COALESCE(?, address), address_number = COALESCE(?, address_number),
              complement = COALESCE(?, complement), neighborhood = COALESCE(?, neighborhood),
              city = COALESCE(?, city), state = COALESCE(?, state), zip_code = COALESCE(?, zip_code)
             WHERE id = ?`,
            [customer_name, customer_email || null,
             delivery_address || null, delivery_number || null,
             delivery_complement || null, delivery_neighborhood || null,
             delivery_city || null, delivery_state || null, delivery_zip_code || null, customerId]
          );
        } else {
          const custResult = await queryTransaction(connection,
            `INSERT INTO customers (restaurant_id, name, phone, email, address, address_number, complement, neighborhood, city, state, zip_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [restaurant.id, customer_name, customer_phone, customer_email || null,
             delivery_address || null, delivery_number || null,
             delivery_complement || null, delivery_neighborhood || null,
             delivery_city || null, delivery_state || null, delivery_zip_code || null]
          );
          customerId = custResult.insertId;
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

      // Grava itens
      for (const item of validatedItems) {
        await queryTransaction(connection,
          'INSERT INTO order_items (order_id, restaurant_id, product_id, product_name, quantity, unit_price, total_price, options, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [order_id, restaurant.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.options, item.notes]
        );
      }

      // Adiciona histórico de status inicial
      await queryTransaction(connection,
        'INSERT INTO order_status_logs (order_id, restaurant_id, to_status, notes) VALUES (?, ?, \'pending\', \'Pedido enviado pelo cardápio público\')',
        [order_id, restaurant.id]
      );

      // Incrementa estatísticas do cliente
      if (customerId) {
        await queryTransaction(connection,
          'UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_order_at = NOW() WHERE id = ?',
          [total, customerId]
        );
      }

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
 * Retorna os detalhes de um pedido público para a tela de acompanhamento de status do cliente.
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

module.exports = {
  getRestaurantBySlug,
  getRestaurantMenu,
  createPublicOrder,
  getPublicOrder
};
