const { query } = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * GET /api/v1/customers
 */
const getAll = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const { search, page = 1, limit = 20 } = req.query;

    let sql = 'SELECT * FROM customers WHERE restaurant_id = ?';
    const params = [restaurant_id];

    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name ASC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const customers = await query(sql, params);

    let countSql = 'SELECT COUNT(*) as total FROM customers WHERE restaurant_id = ?';
    const countParams = [restaurant_id];
    if (search) {
      countSql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const [{ total }] = await query(countSql, countParams);

    return res.json({
      success: true,
      data: customers,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers/:id
 */
const getOne = async (req, res, next) => {
  try {
    const customers = await query(
      'SELECT * FROM customers WHERE id = ? AND restaurant_id = ? LIMIT 1',
      [req.params.id, req.user.restaurant_id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
    }

    return res.json({ success: true, data: customers[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/customers
 */
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { name, email, phone, address, city, neighborhood, complement, zip_code, notes } = req.body;
    const restaurant_id = req.user.restaurant_id;

    const result = await query(
      `INSERT INTO customers (restaurant_id, name, email, phone, address, city, neighborhood, complement, zip_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurant_id, name, email || null, phone || null, address || null, city || null,
       neighborhood || null, complement || null, zip_code || null, notes || null]
    );

    const created = await query('SELECT * FROM customers WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, message: 'Cliente cadastrado com sucesso!', data: created[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/customers/:id
 */
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM customers WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
    }

    const { name, email, phone, address, city, neighborhood, complement, zip_code, notes } = req.body;

    await query(
      `UPDATE customers SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        neighborhood = COALESCE(?, neighborhood),
        complement = COALESCE(?, complement),
        zip_code = COALESCE(?, zip_code),
        notes = COALESCE(?, notes)
       WHERE id = ? AND restaurant_id = ?`,
      [name, email, phone, address, city, neighborhood, complement, zip_code, notes, id, restaurant_id]
    );

    const updated = await query('SELECT * FROM customers WHERE id = ? LIMIT 1', [id]);
    return res.json({ success: true, message: 'Cliente atualizado com sucesso!', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/customers/:id
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM customers WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
    }

    await query('DELETE FROM customers WHERE id = ? AND restaurant_id = ?', [id, restaurant_id]);
    return res.json({ success: true, message: 'Cliente removido com sucesso.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customers/:id/orders
 */
const getOrderHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM customers WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
    }

    const orders = await query(
      `SELECT o.*, COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.customer_id = ? AND o.restaurant_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [id, restaurant_id]
    );

    return res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove, getOrderHistory };
