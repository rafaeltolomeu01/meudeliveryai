const { query, beginTransaction, queryTransaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { autoSendOrderNotification } = require('./whatsapp.controller');

const cleanPhone = (value = '') => String(value || '').replace(/\D/g, '');
const cleanEmail = (value = '') => String(value || '').trim().toLowerCase();
const cleanText = (value = '') => String(value || '').trim();

function publicCustomerPayload(customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    document: customer.document,
  };
}

function signCustomerToken(customer) {
  return jwt.sign(
    {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      restaurant_id: customer.restaurant_id,
      role: 'customer',
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

async function notifyWhatsappSafely(restaurantId, order, status) {
  try {
    if (order) await autoSendOrderNotification(restaurantId, order, status);
  } catch (err) {
    console.error('[PublicOrder] Falha ao notificar WhatsApp:', err.message);
  }
}

async function getRestaurantIdBySlug(slug) {
  const rows = await query('SELECT id, status, name FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
}

async function generatePublicOrderNumber(restaurant_id) {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

  for (let attempt = 0; attempt < 10; attempt++) {
    const rows = await query(
      `SELECT order_number FROM orders
        WHERE restaurant_id = ? AND order_number LIKE ?
        ORDER BY id DESC LIMIT 1`,
      [restaurant_id, `#${datePart}-%`]
    );

    let nextSeq = 1 + attempt;
    if (rows.length && rows[0].order_number) {
      const match = String(rows[0].order_number).match(/-(\d+)$/);
      if (match) nextSeq = parseInt(match[1], 10) + 1 + attempt;
    }

    const candidate = `#${datePart}-${String(nextSeq).padStart(4, '0')}`;
    const exists = await query('SELECT id FROM orders WHERE restaurant_id = ? AND order_number = ? LIMIT 1', [restaurant_id, candidate]);
    if (!exists.length) return candidate;
  }

  return `#${datePart}-${Date.now()}`;
}

const getRestaurantBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const restaurants = await query(
      `SELECT r.id, r.name, r.slug, COALESCE(rt.logo, r.logo) AS logo,
              COALESCE(rt.cover_image, r.cover_image) AS cover_image,
              r.status, rt.primary_color, rt.secondary_color, rt.accent_color,
              rt.background_color, rt.button_color, rt.text_color, rt.font_family,
              rt.card_style, rt.border_radius, rt.theme_mode,
              rs.is_open, rs.delivery_enabled, rs.delivery_fee, rs.min_order_value,
              rs.estimated_delivery_time, rs.pickup_enabled, rs.estimated_pickup_time,
              rs.accept_orders_when_closed, rs.welcome_message, rs.order_confirmed_message,
              rs.order_dispatched_message, rs.support_phone, rs.whatsapp_number, rs.opening_hours,
              ps.accepts_cash, ps.accepts_credit_card, ps.accepts_debit_card,
              ps.accepts_pix, ps.pix_key, ps.pix_key_type, ps.pix_receiver_name,
              ps.pix_receiver_city, ps.pix_instructions
         FROM restaurants r
         LEFT JOIN restaurant_theme rt ON rt.restaurant_id = r.id
         LEFT JOIN restaurant_settings rs ON rs.restaurant_id = r.id
         LEFT JOIN payment_settings ps ON ps.restaurant_id = r.id
        WHERE r.slug = ?
        LIMIT 1`,
      [slug]
    );

    if (!restaurants.length) return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    const restaurant = restaurants[0];
    if (restaurant.status !== 'active') return res.status(403).json({ success: false, message: 'Este restaurante está indisponível no momento.' });

    if (restaurant.opening_hours && typeof restaurant.opening_hours === 'string') {
      try { restaurant.opening_hours = JSON.parse(restaurant.opening_hours); } catch { restaurant.opening_hours = null; }
    }

    return res.json({ success: true, data: restaurant });
  } catch (error) { next(error); }
};

const getRestaurantMenu = async (req, res, next) => {
  try {
    const restaurant = await getRestaurantIdBySlug(req.params.slug);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    if (restaurant.status !== 'active') return res.status(403).json({ success: false, message: 'Este restaurante está indisponível.' });

    const categories = await query(
      'SELECT id, name, description, position, icon, color, image_url FROM categories WHERE restaurant_id = ? AND is_active = 1 ORDER BY position ASC',
      [restaurant.id]
    );
    const products = await query(
      `SELECT id, category_id, name, description, price, promotional_price, image_url, images,
              is_available, is_featured, serves_how_many, preparation_time, position, sku,
              track_stock, stock_quantity
         FROM products
        WHERE restaurant_id = ? AND is_available = 1
        ORDER BY position ASC, name ASC`,
      [restaurant.id]
    );
    const productComplements = await query(
      `SELECT pc.product_id, cg.id AS group_id, cg.name AS group_name, cg.description,
              cg.is_required, cg.min_quantity, cg.max_quantity, cg.position
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
      if (!itemsByGroup[item.complement_group_id]) itemsByGroup[item.complement_group_id] = [];
      itemsByGroup[item.complement_group_id].push(item);
    });

    const groupsByProduct = {};
    productComplements.forEach(pc => {
      if (!groupsByProduct[pc.product_id]) groupsByProduct[pc.product_id] = [];
      groupsByProduct[pc.product_id].push({
        id: pc.group_id,
        name: pc.group_name,
        description: pc.description,
        is_required: pc.is_required,
        min_quantity: pc.min_quantity,
        max_quantity: pc.max_quantity,
        position: pc.position,
        items: itemsByGroup[pc.group_id] || [],
      });
    });

    const productsWithOptions = products.map(prod => {
      try { prod.images = prod.images ? (typeof prod.images === 'string' ? JSON.parse(prod.images) : prod.images) : []; }
      catch { prod.images = []; }
      return { ...prod, complements: groupsByProduct[prod.id] || [], options: [] };
    });

    return res.json({ success: true, data: { categories, products: productsWithOptions } });
  } catch (error) { next(error); }
};

const customerRegister = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const name = cleanText(req.body.name);
    const email = cleanEmail(req.body.email);
    const phone = cleanPhone(req.body.phone);
    const document = cleanPhone(req.body.document);
    const password = String(req.body.password || '');

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Nome, WhatsApp e senha são obrigatórios.' });
    }
    if (phone.length < 10 || phone.length > 13) {
      return res.status(400).json({ success: false, message: 'Informe um WhatsApp válido com DDD.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Informe um e-mail válido.' });
    }

    const restaurant = await getRestaurantIdBySlug(slug);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    const restaurant_id = restaurant.id;

    let checkQuery = 'SELECT id, name, email, phone FROM customers WHERE restaurant_id = ? AND (phone = ?';
    const checkParams = [restaurant_id, phone];
    if (email) { checkQuery += ' OR email = ?'; checkParams.push(email); }
    if (document) { checkQuery += ' OR document = ?'; checkParams.push(document); }
    checkQuery += ') LIMIT 1';
    const existing = await query(checkQuery, checkParams);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Este WhatsApp, e-mail ou CPF já está cadastrado. Use Entrar na Conta.' });
    }

    const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12);
    const result = await query(
      `INSERT INTO customers (restaurant_id, name, email, phone, document, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [restaurant_id, name, email || null, phone, document || null, password_hash]
    );

    const customer = { id: result.insertId, restaurant_id, name, email: email || null, phone, document: document || null };
    const token = signCustomerToken(customer);
    return res.status(201).json({ success: true, message: 'Cadastro realizado com sucesso!', token, customer: publicCustomerPayload(customer), data: { token, customer: publicCustomerPayload(customer) } });
  } catch (error) { next(error); }
};

const customerLogin = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const identifierRaw = req.body.identifier || req.body.email || req.body.phone;
    const password = String(req.body.password || '');
    const identifierDigits = cleanPhone(identifierRaw);
    const identifierEmail = cleanEmail(identifierRaw);
    const identifier = identifierDigits.length >= 10 ? identifierDigits : identifierEmail;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Informe WhatsApp/e-mail e senha.' });
    }

    const restaurant = await getRestaurantIdBySlug(slug);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });

    const customers = await query(
      `SELECT * FROM customers
        WHERE restaurant_id = ?
          AND (phone = ? OR email = ? OR document = ?)
        LIMIT 1`,
      [restaurant.id, identifier, identifier, identifier]
    );

    if (!customers.length) {
      return res.status(401).json({ success: false, message: 'WhatsApp/e-mail ou senha incorretos.' });
    }

    const customer = customers[0];
    if (customer.is_blocked) return res.status(403).json({ success: false, message: 'Sua conta está suspensa neste estabelecimento.' });
    if (!customer.password_hash) return res.status(400).json({ success: false, message: 'Esta conta ainda não possui senha. Crie um cadastro para definir sua senha.' });

    const ok = await bcrypt.compare(password, customer.password_hash);
    if (!ok) return res.status(401).json({ success: false, message: 'WhatsApp/e-mail ou senha incorretos.' });

    const token = signCustomerToken(customer);
    return res.json({ success: true, message: 'Login realizado com sucesso!', token, customer: publicCustomerPayload(customer), data: { token, customer: publicCustomerPayload(customer) } });
  } catch (error) { next(error); }
};

const customerMe = async (req, res, next) => {
  try {
    const restaurant = await getRestaurantIdBySlug(req.params.slug);
    if (!restaurant || restaurant.id !== req.customer.restaurant_id) {
      return res.status(401).json({ success: false, message: 'Sessão não pertence a este restaurante.' });
    }
    return res.json({ success: true, data: publicCustomerPayload(req.customer) });
  } catch (error) { next(error); }
};

const createPublicOrder = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const customerId = req.customer.id;
    const customer_name = req.customer.name;
    const customer_phone = req.customer.phone;
    const customer_email = req.customer.email;

    const {
      order_type = 'delivery', payment_method = 'cash', delivery_address, delivery_number,
      delivery_complement, delivery_neighborhood, delivery_city, delivery_state, delivery_zip_code,
      reference, items, notes, change_for
    } = req.body;

    const restaurant = await getRestaurantIdBySlug(slug);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    if (restaurant.status !== 'active') return res.status(403).json({ success: false, message: 'Este restaurante não está aceitando pedidos.' });
    if (restaurant.id !== req.customer.restaurant_id) return res.status(403).json({ success: false, message: 'Cliente não pertence a este restaurante.' });

    if (!items || !Array.isArray(items) || !items.length) return res.status(400).json({ success: false, message: 'O pedido deve conter itens no carrinho.' });

    const settings = await query('SELECT delivery_fee, min_order_value, is_open, accept_orders_when_closed FROM restaurant_settings WHERE restaurant_id = ? LIMIT 1', [restaurant.id]);
    const setting = settings[0] || {};
    if (!setting.is_open && !setting.accept_orders_when_closed) return res.status(403).json({ success: false, message: 'O estabelecimento está fechado no momento.' });

    let subtotal = 0;
    const validatedItems = [];
    for (const item of items) {
      const products = await query('SELECT id, name, price, promotional_price, is_available, track_stock, stock_quantity FROM products WHERE id = ? AND restaurant_id = ? LIMIT 1', [item.product_id, restaurant.id]);
      if (!products.length) return res.status(400).json({ success: false, message: `Produto ID ${item.product_id} não encontrado.` });
      const product = products[0];
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      if (!product.is_available) return res.status(400).json({ success: false, message: `Produto "${product.name}" está temporariamente esgotado.` });
      if (product.track_stock && product.stock_quantity !== null && product.stock_quantity < quantity) return res.status(400).json({ success: false, message: `O produto "${product.name}" possui apenas ${product.stock_quantity} unidades em estoque.` });

      const unit_price = parseFloat(product.promotional_price || product.price);
      const total_price = unit_price * quantity;
      subtotal += total_price;
      validatedItems.push({ product_id: product.id, product_name: product.name, quantity, unit_price, total_price, notes: item.notes || null, options: item.options ? JSON.stringify(item.options) : null, track_stock: product.track_stock });
    }

    const deliveryFee = order_type === 'delivery' ? parseFloat(setting.delivery_fee || 0) : 0;
    const total = subtotal + deliveryFee;
    const minOrderVal = parseFloat(setting.min_order_value || 0);
    if (subtotal < minOrderVal) return res.status(400).json({ success: false, message: `O valor mínimo para pedidos no estabelecimento é R$ ${minOrderVal.toFixed(2)}.` });

    const duplicateOrders = await query(
      `SELECT id FROM orders
        WHERE restaurant_id = ? AND customer_id = ? AND total = ? AND status = 'pending'
          AND created_at >= NOW() - INTERVAL 2 MINUTE
        LIMIT 1`,
      [restaurant.id, customerId, total]
    );
    if (duplicateOrders.length) return res.status(409).json({ success: false, message: 'Um pedido idêntico foi enviado nos últimos 2 minutos. Aguarde a confirmação.' });

    const order_number = await generatePublicOrderNumber(restaurant.id);
    const connection = await beginTransaction();
    try {
      const orderResult = await queryTransaction(connection,
        `INSERT INTO orders
          (restaurant_id, customer_id, order_number, order_type, source, status, payment_method,
           payment_status, subtotal, delivery_fee, total, notes, change_for,
           delivery_address, delivery_number, delivery_complement, delivery_neighborhood,
           delivery_city, delivery_state, delivery_zip_code)
         VALUES (?, ?, ?, ?, 'site', 'pending', ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [restaurant.id, customerId, order_number, order_type, payment_method, subtotal, deliveryFee, total, notes || null, change_for ? parseFloat(change_for) : null, delivery_address || null, delivery_number || null, delivery_complement || null, delivery_neighborhood || null, delivery_city || null, delivery_state || null, delivery_zip_code || null]
      );
      const order_id = orderResult.insertId;

      for (const item of validatedItems) {
        await queryTransaction(connection,
          'INSERT INTO order_items (order_id, restaurant_id, product_id, product_name, quantity, unit_price, total_price, options, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [order_id, restaurant.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total_price, item.options, item.notes]
        );
        if (item.track_stock) await queryTransaction(connection, 'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND restaurant_id = ?', [item.quantity, item.product_id, restaurant.id]);
      }

      await queryTransaction(connection, 'INSERT INTO order_status_logs (order_id, restaurant_id, to_status, notes) VALUES (?, ?, ?, ?)', [order_id, restaurant.id, 'pending', 'Pedido enviado pelo cardápio público']);
      await queryTransaction(connection, 'INSERT INTO order_messages (order_id, restaurant_id, sender_type, message) VALUES (?, ?, ?, ?)', [order_id, restaurant.id, 'system', 'Pedido enviado! Aguardando confirmação do estabelecimento. ⏳']);
      await queryTransaction(connection, 'UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_order_at = NOW() WHERE id = ? AND restaurant_id = ?', [total, customerId, restaurant.id]);

      await connection.commit();
      connection.release();

      const orderForWhatsapp = { id: order_id, order_number, total, status: 'pending', customer_name, customer_phone, customer_email, items: validatedItems };
      await notifyWhatsappSafely(restaurant.id, orderForWhatsapp, 'pending');

      return res.status(201).json({ success: true, message: 'Pedido realizado com sucesso!', data: { id: order_id, order_number, total } });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error) { next(error); }
};

const getPublicOrder = async (req, res, next) => {
  try {
    const restaurant = await getRestaurantIdBySlug(req.params.slug);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    const orders = await query(`SELECT o.*, c.name as customer_name, c.phone as customer_phone, d.name as driver_name, d.phone as driver_phone FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN delivery_drivers d ON d.id = o.driver_id WHERE o.id = ? AND o.restaurant_id = ? LIMIT 1`, [req.params.id, restaurant.id]);
    if (!orders.length) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    const items = await query('SELECT oi.*, p.image_url as product_image FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? AND oi.restaurant_id = ?', [req.params.id, restaurant.id]);
    const logs = await query('SELECT to_status, notes, created_at FROM order_status_logs WHERE order_id = ? AND restaurant_id = ? ORDER BY created_at ASC', [req.params.id, restaurant.id]);
    return res.json({ success: true, data: { ...orders[0], items, logs } });
  } catch (error) { next(error); }
};

const getPublicMessages = async (req, res, next) => {
  try {
    const restaurant = await getRestaurantIdBySlug(req.params.slug);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    const messages = await query('SELECT * FROM order_messages WHERE order_id = ? AND restaurant_id = ? ORDER BY created_at ASC', [req.params.id, restaurant.id]);
    return res.json({ success: true, data: messages });
  } catch (error) { next(error); }
};

const sendPublicMessage = async (req, res, next) => {
  try {
    const message = cleanText(req.body.message);
    if (!message) return res.status(400).json({ success: false, message: 'A mensagem não pode ser vazia.' });
    const restaurant = await getRestaurantIdBySlug(req.params.slug);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    const orders = await query('SELECT id FROM orders WHERE id = ? AND restaurant_id = ? LIMIT 1', [req.params.id, restaurant.id]);
    if (!orders.length) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    const result = await query('INSERT INTO order_messages (order_id, restaurant_id, sender_type, message) VALUES (?, ?, ?, ?)', [req.params.id, restaurant.id, 'customer', message]);
    return res.status(201).json({ success: true, data: { id: result.insertId, order_id: parseInt(req.params.id, 10), restaurant_id: restaurant.id, sender_type: 'customer', message, created_at: new Date() } });
  } catch (error) { next(error); }
};

const getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await query('SELECT * FROM orders WHERE customer_id = ? AND restaurant_id = ? ORDER BY created_at DESC', [req.customer.id, req.customer.restaurant_id]);
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await query('SELECT oi.*, p.image_url as product_image FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? AND oi.restaurant_id = ?', [order.id, req.customer.restaurant_id]);
      return { ...order, items };
    }));
    return res.json({ success: true, data: ordersWithItems });
  } catch (error) { next(error); }
};

const getCustomerAddresses = async (req, res, next) => {
  try {
    const addresses = await query('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC', [req.customer.id]);
    return res.json({ success: true, data: addresses });
  } catch (error) { next(error); }
};

const addCustomerAddress = async (req, res, next) => {
  try {
    const { zip_code, street, number, complement, neighborhood, city, state, reference, is_default = 0 } = req.body;
    if (!street || !number || !neighborhood || !city || !state) return res.status(400).json({ success: false, message: 'Preencha rua, número, bairro, cidade e UF.' });
    if (is_default) await query('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [req.customer.id]);
    const result = await query('INSERT INTO customer_addresses (customer_id, zip_code, street, number, complement, neighborhood, city, state, reference, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [req.customer.id, zip_code || null, street, number, complement || null, neighborhood, city, state, reference || null, is_default ? 1 : 0]);
    const created = await query('SELECT * FROM customer_addresses WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, message: 'Endereço salvo com sucesso!', data: created[0] });
  } catch (error) { next(error); }
};

const deleteCustomerAddress = async (req, res, next) => {
  try {
    const check = await query('SELECT id FROM customer_addresses WHERE id = ? AND customer_id = ? LIMIT 1', [req.params.id, req.customer.id]);
    if (!check.length) return res.status(404).json({ success: false, message: 'Endereço não encontrado.' });
    await query('DELETE FROM customer_addresses WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Endereço removido com sucesso.' });
  } catch (error) { next(error); }
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
  deleteCustomerAddress,
};
