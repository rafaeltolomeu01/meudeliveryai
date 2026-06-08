const { query } = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * GET /api/v1/drivers
 */
const getAll = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const { is_active, is_available, vehicle_type } = req.query;

    let sql = 'SELECT * FROM delivery_drivers WHERE restaurant_id = ?';
    const params = [restaurant_id];

    if (is_active !== undefined) { sql += ' AND is_active = ?'; params.push(is_active === 'true' ? 1 : 0); }
    if (is_available !== undefined) { sql += ' AND is_available = ?'; params.push(is_available === 'true' ? 1 : 0); }
    if (vehicle_type) { sql += ' AND vehicle_type = ?'; params.push(vehicle_type); }

    sql += ' ORDER BY name ASC';

    const drivers = await query(sql, params);
    return res.json({ success: true, data: drivers });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/drivers/:id
 */
const getOne = async (req, res, next) => {
  try {
    const drivers = await query(
      'SELECT * FROM delivery_drivers WHERE id = ? AND restaurant_id = ? LIMIT 1',
      [req.params.id, req.user.restaurant_id]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ success: false, message: 'Entregador não encontrado.' });
    }

    return res.json({ success: true, data: drivers[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/drivers
 */
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { name, email, phone, vehicle_type = 'motorcycle', vehicle_model, license_plate } = req.body;
    const restaurant_id = req.user.restaurant_id;

    const result = await query(
      `INSERT INTO delivery_drivers (restaurant_id, name, email, phone, vehicle_type, vehicle_model, license_plate, is_available, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [restaurant_id, name, email || null, phone || null, vehicle_type, vehicle_model || null, license_plate || null]
    );

    const created = await query('SELECT * FROM delivery_drivers WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, message: 'Entregador cadastrado com sucesso!', data: created[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/drivers/:id
 */
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM delivery_drivers WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Entregador não encontrado.' });
    }

    const { name, email, phone, vehicle_type, vehicle_model, license_plate, is_active } = req.body;

    await query(
      `UPDATE delivery_drivers SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        vehicle_type = COALESCE(?, vehicle_type),
        vehicle_model = COALESCE(?, vehicle_model),
        license_plate = COALESCE(?, license_plate),
        is_active = COALESCE(?, is_active)
       WHERE id = ? AND restaurant_id = ?`,
      [
        name !== undefined ? name : null,
        email !== undefined ? email : null,
        phone !== undefined ? phone : null,
        vehicle_type !== undefined ? vehicle_type : null,
        vehicle_model !== undefined ? vehicle_model : null,
        license_plate !== undefined ? license_plate : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id, restaurant_id
      ]
    );

    const updated = await query('SELECT * FROM delivery_drivers WHERE id = ? LIMIT 1', [id]);
    return res.json({ success: true, message: 'Entregador atualizado com sucesso!', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/drivers/:id
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM delivery_drivers WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Entregador não encontrado.' });
    }

    // Soft delete
    await query('UPDATE delivery_drivers SET is_active = 0 WHERE id = ? AND restaurant_id = ?', [id, restaurant_id]);
    return res.json({ success: true, message: 'Entregador desativado com sucesso.' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/drivers/:id/toggle
 */
const toggleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const drivers = await query(
      'SELECT id, is_available FROM delivery_drivers WHERE id = ? AND restaurant_id = ? LIMIT 1',
      [id, restaurant_id]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ success: false, message: 'Entregador não encontrado.' });
    }

    const newValue = drivers[0].is_available ? 0 : 1;
    await query('UPDATE delivery_drivers SET is_available = ? WHERE id = ? AND restaurant_id = ?', [newValue, id, restaurant_id]);

    return res.json({
      success: true,
      message: `Entregador marcado como ${newValue ? 'disponível' : 'indisponível'}.`,
      data: { is_available: newValue === 1 },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/drivers/:id/deliveries
 */
const getActiveDeliveries = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM delivery_drivers WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Entregador não encontrado.' });
    }

    const deliveries = await query(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.driver_id = ? AND o.restaurant_id = ? AND o.status = 'out_for_delivery'
       ORDER BY o.created_at DESC`,
      [id, restaurant_id]
    );

    return res.json({ success: true, data: deliveries });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove, toggleAvailability, getActiveDeliveries };
