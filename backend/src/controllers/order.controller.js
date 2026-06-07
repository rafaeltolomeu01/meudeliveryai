const { query, beginTransaction, queryTransaction } = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * Gera número único do pedido: #YYYYMMDD-XXXX
 */
async function generateOrderNumber(restaurant_id) {
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
 * GET /api/v1/orders
 * Filtros: status, date_from, date_to, customer_id, payment_method
 */
const getAll = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const { status, date_from, date_to, customer_id, payment_method, page = 1, limit = 20 } = req.query;

    let driverId = null;
    if (req.user.role === 'entregador') {
      const drivers = await query(
        'SELECT id FROM delivery_drivers WHERE email = ? AND restaurant_id = ? LIMIT 1',
        [req.user.email, restaurant_id]
      );
      driverId = drivers.length > 0 ? drivers[0].id : -1;
    }

    let sql = `
      SELECT o.*,
        c.name as customer_name, c.phone as customer_phone,
        d.name as driver_name, d.phone as driver_phone
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN delivery_drivers d ON d.id = o.driver_id
      WHERE o.restaurant_id = ?
    `;
    const params = [restaurant_id];

    if (driverId !== null) {
      sql += ' AND o.driver_id = ?';
      params.push(driverId);
    }

    if (status) { sql += ' AND o.status = ?'; params.push(status); }
    if (date_from) { sql += ' AND DATE(o.created_at) >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND DATE(o.created_at) <= ?'; params.push(date_to); }
    if (customer_id) { sql += ' AND o.customer_id = ?'; params.push(customer_id); }
    if (payment_method) { sql += ' AND o.payment_method = ?'; params.push(payment_method); }

    sql += ' ORDER BY o.created_at DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const orders = await query(sql, params);

    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const items = await query(
        `SELECT oi.*, COALESCE(oi.product_name, p.name) as product_name
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${orderIds.join(',')}) AND oi.restaurant_id = ?`,
        [restaurant_id]
      );

      const itemsByOrder = {};
      items.forEach(item => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item);
      });

      orders.forEach(o => {
        o.items = itemsByOrder[o.id] || [];
      });
    }

    let countSql = 'SELECT COUNT(*) as total FROM orders WHERE restaurant_id = ?';
    const countParams = [restaurant_id];
    
    if (driverId !== null) {
      countSql += ' AND driver_id = ?';
      countParams.push(driverId);
    }

    if (status) { countSql += ' AND status = ?'; countParams.push(status); }
    if (date_from) { countSql += ' AND DATE(created_at) >= ?'; countParams.push(date_from); }
    if (date_to) { countSql += ' AND DATE(created_at) <= ?'; countParams.push(date_to); }
    if (customer_id) { countSql += ' AND customer_id = ?'; countParams.push(customer_id); }

    const [{ total }] = await query(countSql, countParams);

    return res.json({
      success: true,
      data: orders,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/orders/:id
 */
const getOne = async (req, res, next) => {
  try {
    const orders = await query(
      `SELECT o.*,
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        d.name as driver_name, d.phone as driver_phone
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN delivery_drivers d ON d.id = o.driver_id
       WHERE o.id = ? AND o.restaurant_id = ? LIMIT 1`,
      [req.params.id, req.user.restaurant_id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }

    if (req.user.role === 'entregador') {
      const drivers = await query(
        'SELECT id FROM delivery_drivers WHERE email = ? AND restaurant_id = ? LIMIT 1',
        [req.user.email, req.user.restaurant_id]
      );
      const driverId = drivers.length > 0 ? drivers[0].id : -1;
      if (orders[0].driver_id !== driverId) {
        return res.status(403).json({ success: false, message: 'Acesso negado. Este pedido não está atribuído a você.' });
      }
    }

    const items = await query(
      `SELECT oi.*, p.name as product_name, p.image_url as product_image
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ? AND oi.restaurant_id = ?`,
      [req.params.id, req.user.restaurant_id]
    );

    const logs = await query(
      `SELECT osl.*
       FROM order_status_logs osl
       WHERE osl.order_id = ? AND osl.restaurant_id = ?
       ORDER BY osl.created_at ASC`,
      [req.params.id, req.user.restaurant_id]
    );

    return res.json({ success: true, data: { ...orders[0], items, logs } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/orders
 */
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const restaurant_id = req.user.restaurant_id;
    const {
      customer_id, items, payment_method = 'cash',
      delivery_fee = 0, discount = 0, notes,
      delivery_address, delivery_city, delivery_neighborhood, estimated_time,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'O pedido deve ter pelo menos 1 item.' });
    }

    // Valida e calcula subtotal
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const products = await query(
        'SELECT id, name, price, promotional_price, is_available FROM products WHERE id = ? AND restaurant_id = ? LIMIT 1',
        [item.product_id, restaurant_id]
      );

      if (products.length === 0) {
        return res.status(400).json({ success: false, message: `Produto ID ${item.product_id} não encontrado.` });
      }

      const product = products[0];
      if (!product.is_available) {
        return res.status(400).json({ success: false, message: `Produto "${product.name}" não está disponível.` });
      }

      const unit_price = parseFloat(product.promotional_price || product.price);
      const total_price = unit_price * item.quantity;
      subtotal += total_price;

      validatedItems.push({
        product_id: product.id,
        quantity: item.quantity,
        unit_price,
        total_price,
        notes: item.notes || null,
      });
    }

    const total = subtotal + parseFloat(delivery_fee) - parseFloat(discount);
    const order_number = await generateOrderNumber(restaurant_id);

    const connection = await beginTransaction();
    try {
      const orderResult = await queryTransaction(connection,
        `INSERT INTO orders (restaurant_id, customer_id, order_number, status, payment_method, payment_status,
          subtotal, delivery_fee, discount, total, notes, delivery_address, delivery_city,
          delivery_neighborhood, estimated_time)
         VALUES (?, ?, ?, 'pending', ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [restaurant_id, customer_id || null, order_number, payment_method,
         subtotal, delivery_fee, discount, total, notes || null,
         delivery_address || null, delivery_city || null, delivery_neighborhood || null,
         estimated_time || null]
      );

      const order_id = orderResult.insertId;

      // Insere itens
      for (const item of validatedItems) {
        await queryTransaction(connection,
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, notes) VALUES (?, ?, ?, ?, ?, ?)',
          [order_id, item.product_id, item.quantity, item.unit_price, item.total_price, item.notes]
        );
      }

      // Atualiza stats do cliente
      if (customer_id) {
        await queryTransaction(connection,
          'UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ? AND restaurant_id = ?',
          [total, customer_id, restaurant_id]
        );
      }

      await connection.commit();
      connection.release();

      const newOrder = await query('SELECT * FROM orders WHERE id = ? LIMIT 1', [order_id]);
      const newItems = await query('SELECT * FROM order_items WHERE order_id = ?', [order_id]);

      return res.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso!',
        data: { ...newOrder[0], items: newItems },
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
 * PATCH /api/v1/orders/:id/status
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;
    const restaurant_id = req.user.restaurant_id;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'picked_up'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status inválido.' });
    }

    const orders = await query('SELECT id, driver_id FROM orders WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }

    if (req.user.role === 'entregador') {
      const drivers = await query(
        'SELECT id FROM delivery_drivers WHERE email = ? AND restaurant_id = ? LIMIT 1',
        [req.user.email, restaurant_id]
      );
      const driverId = drivers.length > 0 ? drivers[0].id : -1;
      if (orders[0].driver_id !== driverId) {
        return res.status(403).json({ success: false, message: 'Acesso negado. Este pedido não está atribuído a você.' });
      }
    }

    let sql = 'UPDATE orders SET status = ?';
    const params = [status];

    if (payment_status) {
      sql += ', payment_status = ?';
      params.push(payment_status);
    }

    sql += ' WHERE id = ? AND restaurant_id = ?';
    params.push(id, restaurant_id);

    await query(sql, params);

    const statusLabels = {
      pending: 'Aguardando Aprovação',
      confirmed: 'Confirmado',
      preparing: 'Em Preparo',
      ready: 'Pronto',
      out_for_delivery: 'Saiu para Entrega',
      delivered: 'Entregue',
      picked_up: 'Retirado',
      cancelled: 'Cancelado',
    };
    const label = statusLabels[status] || status;

    await query(
      'INSERT INTO order_status_logs (order_id, restaurant_id, to_status, notes) VALUES (?, ?, ?, ?)',
      [id, restaurant_id, status, `Status alterado para "${label}" pelo estabelecimento`]
    );

    const updated = await query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    return res.json({ success: true, message: 'Status do pedido atualizado!', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/orders/:id/assign-driver
 */
const assignDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const driver_id = req.body.driver_id || req.body.driverId;
    const restaurant_id = req.user.restaurant_id;

    const orders = await query('SELECT id, status FROM orders WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }

    let driverName = null;
    if (driver_id) {
      const drivers = await query('SELECT id, name FROM delivery_drivers WHERE id = ? AND restaurant_id = ? LIMIT 1', [driver_id, restaurant_id]);
      if (drivers.length === 0) {
        return res.status(404).json({ success: false, message: 'Entregador não encontrado.' });
      }
      driverName = drivers[0].name;
    }

    await query('UPDATE orders SET driver_id = ? WHERE id = ? AND restaurant_id = ?', [driver_id || null, id, restaurant_id]);

    const note = driverName
      ? `Entregador "${driverName}" vinculado ao pedido pelo estabelecimento`
      : 'Entregador desvinculado do pedido pelo estabelecimento';
    
    await query(
      'INSERT INTO order_status_logs (order_id, restaurant_id, to_status, notes) VALUES (?, ?, ?, ?)',
      [id, restaurant_id, orders[0].status, note]
    );

    return res.json({ success: true, message: driver_id ? 'Entregador atribuído com sucesso!' : 'Entregador removido.' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/orders/:id/cancel
 */
const cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const restaurant_id = req.user.restaurant_id;

    const orders = await query('SELECT id, status, customer_id, total FROM orders WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }

    if (['delivered', 'cancelled'].includes(orders[0].status)) {
      return res.status(400).json({ success: false, message: 'Este pedido não pode ser cancelado.' });
    }

    await query("UPDATE orders SET status = 'cancelled' WHERE id = ? AND restaurant_id = ?", [id, restaurant_id]);

    await query(
      'INSERT INTO order_status_logs (order_id, restaurant_id, to_status, notes) VALUES (?, ?, \'cancelled\', ?)',
      [id, restaurant_id, reason || 'Pedido cancelado pelo estabelecimento']
    );

    // Reverte stats do cliente se necessário
    if (orders[0].customer_id && orders[0].status !== 'pending') {
      await query(
        'UPDATE customers SET total_orders = GREATEST(0, total_orders - 1), total_spent = GREATEST(0, total_spent - ?) WHERE id = ?',
        [orders[0].total, orders[0].customer_id]
      );
    }

    return res.json({ success: true, message: 'Pedido cancelado.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/orders/stats
 */
const getStats = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;

    const stats = await query(
      `SELECT
        status,
        COUNT(*) as count,
        SUM(total) as total_value
       FROM orders
       WHERE restaurant_id = ? AND DATE(created_at) = CURDATE()
       GROUP BY status`,
      [restaurant_id]
    );

    const total = await query(
      'SELECT COUNT(*) as total, SUM(total) as revenue FROM orders WHERE restaurant_id = ? AND DATE(created_at) = CURDATE()',
      [restaurant_id]
    );

    return res.json({
      success: true,
      data: {
        today: total[0],
        by_status: stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/orders/:id/mark-as-paid
 */
const markAsPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const orders = await query('SELECT id, payment_status, status FROM orders WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }

    await query(
      'UPDATE orders SET payment_status = ? WHERE id = ? AND restaurant_id = ?',
      ['paid', id, restaurant_id]
    );

    const currentStatus = orders[0].status;
    await query(
      'INSERT INTO order_status_logs (order_id, restaurant_id, to_status, notes) VALUES (?, ?, ?, ?)',
      [id, restaurant_id, currentStatus, 'Pagamento Pix marcado como pago manualmente pelo estabelecimento']
    );

    const updated = await query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    return res.json({ success: true, message: 'Pedido marcado como pago!', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, updateStatus, assignDriver, cancel, getStats, markAsPaid };
