const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const path = require('path');
const { optimizeAndSaveImage } = require('../utils/image.helper');

/**
 * GET /api/v1/restaurant
 */
const getMyRestaurant = async (req, res, next) => {
  try {
    const restaurants = await query(
      `SELECT r.id, r.name, r.slug, r.owner_name, r.email, r.phone, r.whatsapp, r.document, r.city, r.state, r.address,
              r.logo, r.logo AS logo_url, r.cover_image, r.cover_image AS cover_url, r.status, r.created_at, r.updated_at,
              p.slug AS plan, s.status as subscription_status, s.trial_ends_at,
              rs.delivery_fee, rs.min_order_value, rs.estimated_delivery_time,
              rs.is_open, rt.primary_color, rt.secondary_color, rs.whatsapp_number,
              rs.instagram_url, rs.facebook_url
       FROM restaurants r
       LEFT JOIN subscriptions s ON s.restaurant_id = r.id
       LEFT JOIN plans p ON p.id = s.plan_id
       LEFT JOIN restaurant_settings rs ON rs.restaurant_id = r.id
       LEFT JOIN restaurant_theme rt ON rt.restaurant_id = r.id
       WHERE r.id = ? LIMIT 1`,
      [req.user.restaurant_id]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }

    return res.json({ success: true, data: restaurants[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/restaurant
 */
const updateRestaurant = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const {
      name, owner_name, email, phone, whatsapp, document, city, state, address, slug
    } = req.body;

    const restaurant_id = req.user.restaurant_id;

    // Se o slug foi enviado, precisamos validar duplicidade
    let formattedSlug = undefined;
    if (slug !== undefined && slug !== null) {
      formattedSlug = slug
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      if (formattedSlug.length > 0) {
        const existingSlug = await query(
          'SELECT id FROM restaurants WHERE slug = ? AND id != ? LIMIT 1',
          [formattedSlug, restaurant_id]
        );

        if (existingSlug.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Este link de acesso (slug) já está em uso por outro restaurante.',
            errors: [{ param: 'slug', msg: 'Link já está em uso.' }]
          });
        }
      }
    }

    await query(
      `UPDATE restaurants SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        owner_name = COALESCE(?, owner_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        whatsapp = COALESCE(?, whatsapp),
        document = COALESCE(?, document),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        address = COALESCE(?, address)
       WHERE id = ?`,
      [
        name || null,
        formattedSlug || null,
        owner_name || null,
        email || null,
        phone || null,
        whatsapp || null,
        document || null,
        city || null,
        state || null,
        address || null,
        restaurant_id
      ]
    );

    const updated = await query(
      `SELECT *, logo AS logo_url, cover_image AS cover_url 
       FROM restaurants 
       WHERE id = ? LIMIT 1`, 
      [restaurant_id]
    );

    return res.json({
      success: true,
      message: 'Restaurante atualizado com sucesso!',
      data: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/restaurant/logo
 */
const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada.' });
    }

    const result = await optimizeAndSaveImage(req.file, 'restaurantes');
    const logo = result.imageUrl;

    await query(
      'UPDATE restaurants SET logo = ? WHERE id = ?',
      [logo, req.user.restaurant_id]
    );

    return res.json({
      success: true,
      message: 'Logo atualizada com sucesso!',
      data: { logo, logo_url: logo, thumbUrl: result.thumbUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/restaurant/cover
 */
const uploadCover = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada.' });
    }

    const result = await optimizeAndSaveImage(req.file, 'restaurantes');
    const cover_image = result.imageUrl;

    await query(
      'UPDATE restaurants SET cover_image = ? WHERE id = ?',
      [cover_image, req.user.restaurant_id]
    );

    return res.json({
      success: true,
      message: 'Capa atualizada com sucesso!',
      data: { cover_image, cover_url: cover_image, thumbUrl: result.thumbUrl },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/restaurant
 * Soft delete - desativa o restaurante
 */
const deleteRestaurant = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Senha obrigatória para confirmar exclusão.' });
    }

    const bcrypt = require('bcryptjs');
    const users = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const isValid = await bcrypt.compare(password, users[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Senha incorreta.' });
    }

    await query("UPDATE restaurants SET status = 'inactive' WHERE id = ?", [req.user.restaurant_id]);

    return res.json({ success: true, message: 'Restaurante desativado com sucesso.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyRestaurant, updateRestaurant, uploadLogo, uploadCover, deleteRestaurant };
