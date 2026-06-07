const { query } = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * GET /api/v1/products
 * Filtros: category_id, is_available, search, is_featured
 */
const getAll = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const { category_id, is_available, search, is_featured, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.restaurant_id = ?
    `;
    const params = [restaurant_id];

    if (category_id) { sql += ' AND p.category_id = ?'; params.push(category_id); }
    if (is_available !== undefined) { sql += ' AND p.is_available = ?'; params.push(is_available === 'true' ? 1 : 0); }
    if (is_featured !== undefined) { sql += ' AND p.is_featured = ?'; params.push(is_featured === 'true' ? 1 : 0); }
    if (search) { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY p.position ASC, p.name ASC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const products = await query(sql, params);

    // Count total
    let countSql = 'SELECT COUNT(*) as total FROM products WHERE restaurant_id = ?';
    const countParams = [restaurant_id];
    if (category_id) { countSql += ' AND category_id = ?'; countParams.push(category_id); }
    if (is_available !== undefined) { countSql += ' AND is_available = ?'; countParams.push(is_available === 'true' ? 1 : 0); }
    if (search) { countSql += ' AND (name LIKE ? OR description LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`); }

    const [{ total }] = await query(countSql, countParams);

    return res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/products/:id
 */
const getOne = async (req, res, next) => {
  try {
    const products = await query(
      `SELECT p.*, c.name as category_name,
       (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', po.id, 'name', po.name, 'price', po.price, 'is_required', po.is_required, 'max_quantity', po.max_quantity))
        FROM product_options po WHERE po.product_id = p.id) as options
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? AND p.restaurant_id = ? LIMIT 1`,
      [req.params.id, req.user.restaurant_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    const product = products[0];
    if (product.options && typeof product.options === 'string') {
      product.options = JSON.parse(product.options);
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/products
 */
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const {
      category_id, name, description, price, promotional_price,
      is_available = 1, is_featured = 0, serves_how_many,
      preparation_time, position = 0, image_url,
    } = req.body;

    const restaurant_id = req.user.restaurant_id;

    const result = await query(
      `INSERT INTO products (restaurant_id, category_id, name, description, price, promotional_price,
        is_available, is_featured, serves_how_many, preparation_time, position, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [restaurant_id, category_id || null, name, description || null, price,
       promotional_price || null, is_available ? 1 : 0, is_featured ? 1 : 0,
       serves_how_many || null, preparation_time || null, position, image_url || null]
    );

    const products = await query('SELECT * FROM products WHERE id = ? LIMIT 1', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Produto criado com sucesso!',
      data: products[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/products/:id
 */
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM products WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    const {
      category_id, name, description, price, promotional_price,
      is_available, is_featured, serves_how_many, preparation_time, position, image_url,
    } = req.body;

    await query(
      `UPDATE products SET
        category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        promotional_price = ?,
        is_available = COALESCE(?, is_available),
        is_featured = COALESCE(?, is_featured),
        serves_how_many = COALESCE(?, serves_how_many),
        preparation_time = COALESCE(?, preparation_time),
        position = COALESCE(?, position),
        image_url = COALESCE(?, image_url)
       WHERE id = ? AND restaurant_id = ?`,
      [category_id, name, description, price, promotional_price !== undefined ? promotional_price : null,
       is_available !== undefined ? (is_available ? 1 : 0) : null,
       is_featured !== undefined ? (is_featured ? 1 : 0) : null,
       serves_how_many, preparation_time, position, image_url, id, restaurant_id]
    );

    const updated = await query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    return res.json({ success: true, message: 'Produto atualizado com sucesso!', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/products/:id
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const existing = await query('SELECT id FROM products WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    await query('DELETE FROM products WHERE id = ? AND restaurant_id = ?', [id, restaurant_id]);
    return res.json({ success: true, message: 'Produto removido com sucesso.' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/products/:id/toggle
 */
const toggleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const products = await query('SELECT id, is_available FROM products WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    const newValue = products[0].is_available ? 0 : 1;
    await query('UPDATE products SET is_available = ? WHERE id = ? AND restaurant_id = ?', [newValue, id, restaurant_id]);

    return res.json({
      success: true,
      message: `Produto ${newValue ? 'ativado' : 'desativado'} com sucesso!`,
      data: { is_available: newValue === 1 },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/products/featured
 */
const getFeatured = async (req, res, next) => {
  try {
    const products = await query(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.restaurant_id = ? AND p.is_featured = 1 AND p.is_available = 1
       ORDER BY p.position ASC LIMIT 20`,
      [req.user.restaurant_id]
    );
    return res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/products/:id/image
 */
const uploadImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada.' });
    }

    const products = await query('SELECT id FROM products WHERE id = ? AND restaurant_id = ? LIMIT 1', [id, restaurant_id]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    const image_url = `/uploads/${req.file.filename}`;
    await query('UPDATE products SET image_url = ? WHERE id = ? AND restaurant_id = ?', [image_url, id, restaurant_id]);

    return res.json({
      success: true,
      message: 'Imagem do produto atualizada com sucesso!',
      data: { image_url },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getOne, create, update, remove, toggleAvailability, getFeatured, uploadImage };
