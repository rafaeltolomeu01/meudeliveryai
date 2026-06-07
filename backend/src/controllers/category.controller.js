const { query } = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * GET /api/v1/categories
 */
const getAll = async (req, res, next) => {
  try {
    const { is_active } = req.query;
    let sql = 'SELECT * FROM categories WHERE restaurant_id = ?';
    const params = [req.user.restaurant_id];

    if (is_active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY position ASC, name ASC';

    const categories = await query(sql, params);

    // Adiciona contagem de produtos
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const [{ count }] = await query(
          'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND restaurant_id = ?',
          [cat.id, req.user.restaurant_id]
        );
        return { ...cat, product_count: count };
      })
    );

    return res.json({ success: true, data: categoriesWithCount });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/categories/:id
 */
const getOne = async (req, res, next) => {
  try {
    const categories = await query(
      'SELECT * FROM categories WHERE id = ? AND restaurant_id = ? LIMIT 1',
      [req.params.id, req.user.restaurant_id]
    );

    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    }

    // Busca produtos desta categoria
    const products = await query(
      'SELECT * FROM products WHERE category_id = ? AND restaurant_id = ? ORDER BY position ASC',
      [req.params.id, req.user.restaurant_id]
    );

    return res.json({ success: true, data: { ...categories[0], products } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/categories
 */
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { name, description, position = 0, is_active = 1 } = req.body;
    const restaurant_id = req.user.restaurant_id;

    const result = await query(
      'INSERT INTO categories (restaurant_id, name, description, position, is_active) VALUES (?, ?, ?, ?, ?)',
      [restaurant_id, name, description || null, position, is_active ? 1 : 0]
    );

    const created = await query('SELECT * FROM categories WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, message: 'Categoria criada com sucesso!', data: created[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/categories/:id
 */
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM categories WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    }

    const { name, description, position, is_active } = req.body;

    await query(
      `UPDATE categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        position = COALESCE(?, position),
        is_active = COALESCE(?, is_active)
       WHERE id = ? AND restaurant_id = ?`,
      [name, description, position,
       is_active !== undefined ? (is_active ? 1 : 0) : null,
       id, restaurant_id]
    );

    const updated = await query('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
    return res.json({ success: true, message: 'Categoria atualizada com sucesso!', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/categories/:id
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM categories WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    }

    // Desvincula produtos desta categoria antes de remover
    await query('UPDATE products SET category_id = NULL WHERE category_id = ? AND restaurant_id = ?', [id, restaurant_id]);
    await query('DELETE FROM categories WHERE id = ? AND restaurant_id = ?', [id, restaurant_id]);

    return res.json({ success: true, message: 'Categoria removida com sucesso.' });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/categories/reorder
 * Body: [{ id, position }]
 */
const reorder = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Lista de itens inválida.' });
    }

    const restaurant_id = req.user.restaurant_id;

    await Promise.all(
      items.map(({ id, position }) =>
        query('UPDATE categories SET position = ? WHERE id = ? AND restaurant_id = ?', [position, id, restaurant_id])
      )
    );

    return res.json({ success: true, message: 'Ordem das categorias atualizada!' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove, reorder };
