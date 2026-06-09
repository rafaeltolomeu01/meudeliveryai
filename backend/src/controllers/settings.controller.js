const { query } = require('../config/database');
const { validationResult } = require('express-validator');

/**
 * GET /api/v1/settings
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await query(
      'SELECT * FROM restaurant_settings WHERE restaurant_id = ? LIMIT 1',
      [req.user.restaurant_id]
    );

    if (settings.length === 0) {
      // Cria configurações padrão se não existirem
      await query(
        `INSERT INTO restaurant_settings (restaurant_id, is_open, auto_accept_orders, opening_hours)
         VALUES (?, 0, 0, ?)`,
        [req.user.restaurant_id, JSON.stringify({
          monday: { open: '11:00', close: '23:00', enabled: true },
          tuesday: { open: '11:00', close: '23:00', enabled: true },
          wednesday: { open: '11:00', close: '23:00', enabled: true },
          thursday: { open: '11:00', close: '23:00', enabled: true },
          friday: { open: '11:00', close: '00:00', enabled: true },
          saturday: { open: '11:00', close: '00:00', enabled: true },
          sunday: { open: '12:00', close: '22:00', enabled: false },
        })]
      );

      // Cria tema padrão se não existir
      const theme = await query('SELECT id FROM restaurant_theme WHERE restaurant_id = ? LIMIT 1', [req.user.restaurant_id]);
      if (theme.length === 0) {
        await query(
          `INSERT INTO restaurant_theme (restaurant_id, primary_color, secondary_color)
           VALUES (?, '#FF6B35', '#1A0533')`,
          [req.user.restaurant_id]
        );
      }

      const newSettings = await query(
        'SELECT * FROM restaurant_settings WHERE restaurant_id = ? LIMIT 1',
        [req.user.restaurant_id]
      );
      return res.json({ success: true, data: newSettings[0] });
    }

    const s = settings[0];
    if (s.opening_hours && typeof s.opening_hours === 'string') {
      s.opening_hours = JSON.parse(s.opening_hours);
    }

    return res.json({ success: true, data: s });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/settings
 */
const updateSettings = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const restaurant_id = req.user.restaurant_id;
    const {
      delivery_radius_km, min_order_value, delivery_fee, estimated_delivery_time,
      auto_accept_orders, whatsapp_number, instagram_url, facebook_url,
      accept_orders_when_closed, welcome_message, order_confirmed_message,
      order_dispatched_message, support_phone, is_open, default_print_format, auto_print_enabled, kitchen_print_enabled
    } = req.body;

    await query(
      `INSERT INTO restaurant_settings (
        restaurant_id, delivery_radius_km, min_order_value, delivery_fee,
        estimated_delivery_time, auto_accept_orders, whatsapp_number,
        instagram_url, facebook_url, accept_orders_when_closed, welcome_message,
        order_confirmed_message, order_dispatched_message, support_phone, is_open,
        default_print_format, auto_print_enabled, kitchen_print_enabled
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        delivery_radius_km = COALESCE(VALUES(delivery_radius_km), delivery_radius_km),
        min_order_value = COALESCE(VALUES(min_order_value), min_order_value),
        delivery_fee = COALESCE(VALUES(delivery_fee), delivery_fee),
        estimated_delivery_time = COALESCE(VALUES(estimated_delivery_time), estimated_delivery_time),
        auto_accept_orders = COALESCE(VALUES(auto_accept_orders), auto_accept_orders),
        whatsapp_number = COALESCE(VALUES(whatsapp_number), whatsapp_number),
        instagram_url = COALESCE(VALUES(instagram_url), instagram_url),
        facebook_url = COALESCE(VALUES(facebook_url), facebook_url),
        accept_orders_when_closed = COALESCE(VALUES(accept_orders_when_closed), accept_orders_when_closed),
        welcome_message = COALESCE(VALUES(welcome_message), welcome_message),
        order_confirmed_message = COALESCE(VALUES(order_confirmed_message), order_confirmed_message),
        order_dispatched_message = COALESCE(VALUES(order_dispatched_message), order_dispatched_message),
        support_phone = COALESCE(VALUES(support_phone), support_phone),
        is_open = COALESCE(VALUES(is_open), is_open),
        default_print_format = COALESCE(VALUES(default_print_format), default_print_format),
        auto_print_enabled = COALESCE(VALUES(auto_print_enabled), auto_print_enabled),
        kitchen_print_enabled = COALESCE(VALUES(kitchen_print_enabled), kitchen_print_enabled)`,
      [
        restaurant_id,
        delivery_radius_km || null, min_order_value || null, delivery_fee || null,
        estimated_delivery_time || null,
        auto_accept_orders !== undefined ? (auto_accept_orders ? 1 : 0) : null,
        whatsapp_number || null, instagram_url || null, facebook_url || null,
        accept_orders_when_closed !== undefined ? (accept_orders_when_closed ? 1 : 0) : null,
        welcome_message || null, order_confirmed_message || null,
        order_dispatched_message || null, support_phone || null,
        is_open !== undefined ? (is_open ? 1 : 0) : null,
        default_print_format || 'ask',
        req.body.auto_print_enabled !== undefined ? (req.body.auto_print_enabled ? 1 : 0) : null,
        req.body.kitchen_print_enabled !== undefined ? (req.body.kitchen_print_enabled ? 1 : 0) : null
      ]
    );

    const updated = await query('SELECT * FROM restaurant_settings WHERE restaurant_id = ? LIMIT 1', [restaurant_id]);
    const s = updated[0];
    if (s.opening_hours && typeof s.opening_hours === 'string') {
      s.opening_hours = JSON.parse(s.opening_hours);
    }

    return res.json({ success: true, message: 'Configurações atualizadas com sucesso!', data: s });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/settings/opening-hours
 */
const updateOpeningHours = async (req, res, next) => {
  try {
    const { opening_hours } = req.body;

    if (!opening_hours || typeof opening_hours !== 'object') {
      return res.status(400).json({ success: false, message: 'Horários inválidos.' });
    }

    const restaurant_id = req.user.restaurant_id;

    await query(
      `INSERT INTO restaurant_settings (restaurant_id, opening_hours)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE opening_hours = VALUES(opening_hours)`,
      [restaurant_id, JSON.stringify(opening_hours)]
    );

    return res.json({ success: true, message: 'Horários de funcionamento atualizados!', data: { opening_hours } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/settings/toggle-open
 */
const toggleOpen = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;

    const settings = await query(
      'SELECT is_open FROM restaurant_settings WHERE restaurant_id = ? LIMIT 1',
      [restaurant_id]
    );

    let currentState = 0;
    if (settings.length > 0) {
      currentState = settings[0].is_open;
    }

    const newState = currentState ? 0 : 1;

    await query(
      `INSERT INTO restaurant_settings (restaurant_id, is_open)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE is_open = VALUES(is_open)`,
      [restaurant_id, newState]
    );

    return res.json({
      success: true,
      message: newState ? '🟢 Restaurante aberto!' : '🔴 Restaurante fechado.',
      data: { is_open: newState === 1 },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/settings/appearance
 */
const getAppearance = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    let theme = await query(
      'SELECT * FROM restaurant_theme WHERE restaurant_id = ? LIMIT 1',
      [restaurant_id]
    );

    if (theme.length === 0) {
      // Create default theme settings
      await query(
        `INSERT INTO restaurant_theme (restaurant_id, primary_color, secondary_color, background_color, button_color, text_color, font_family, card_style, border_radius, theme_mode)
         VALUES (?, '#FF6B35', '#1A0533', '#0F0F0F', '#FF6B35', '#FFFFFF', 'Inter', 'moderno', 'arredondada', 'dark')`,
        [restaurant_id]
      );

      theme = await query(
        'SELECT * FROM restaurant_theme WHERE restaurant_id = ? LIMIT 1',
        [restaurant_id]
      );
    }

    return res.json({ success: true, data: theme[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/settings/appearance
 */
const updateAppearance = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const {
      primary_color, secondary_color, background_color, button_color, text_color,
      font_family, card_style, border_radius, theme_mode, logo, cover_image
    } = req.body;

    await query(
      `INSERT IGNORE INTO restaurant_theme (restaurant_id) VALUES (?)`,
      [restaurant_id]
    );

    await query(
      `UPDATE restaurant_theme SET
        primary_color = COALESCE(?, primary_color),
        secondary_color = COALESCE(?, secondary_color),
        background_color = COALESCE(?, background_color),
        button_color = COALESCE(?, button_color),
        text_color = COALESCE(?, text_color),
        font_family = COALESCE(?, font_family),
        card_style = COALESCE(?, card_style),
        border_radius = COALESCE(?, border_radius),
        theme_mode = COALESCE(?, theme_mode),
        logo = COALESCE(?, logo),
        cover_image = COALESCE(?, cover_image)
       WHERE restaurant_id = ?`,
      [
        primary_color !== undefined && primary_color !== null && primary_color !== '' ? primary_color : null,
        secondary_color !== undefined && secondary_color !== null && secondary_color !== '' ? secondary_color : null,
        background_color !== undefined && background_color !== null && background_color !== '' ? background_color : null,
        button_color !== undefined && button_color !== null && button_color !== '' ? button_color : null,
        text_color !== undefined && text_color !== null && text_color !== '' ? text_color : null,
        font_family !== undefined && font_family !== null && font_family !== '' ? font_family : null,
        card_style !== undefined && card_style !== null && card_style !== '' ? card_style : null,
        border_radius !== undefined && border_radius !== null && border_radius !== '' ? border_radius : null,
        theme_mode !== undefined && theme_mode !== null && theme_mode !== '' ? theme_mode : null,
        logo !== undefined && logo !== null && logo !== '' ? logo : null,
        cover_image !== undefined && cover_image !== null && cover_image !== '' ? cover_image : null,
        restaurant_id
      ]
    );

    // Also sync logo and cover_image in the restaurants table for backward compatibility!
    if (logo) {
      await query('UPDATE restaurants SET logo = ? WHERE id = ?', [logo, restaurant_id]);
    }
    if (cover_image) {
      await query('UPDATE restaurants SET cover_image = ? WHERE id = ?', [cover_image, restaurant_id]);
    }

    const updated = await query('SELECT * FROM restaurant_theme WHERE restaurant_id = ? LIMIT 1', [restaurant_id]);
    return res.json({ success: true, message: 'Tema visual atualizado com sucesso!', data: updated[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/settings/payments
 */
const getPayments = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    let payments = await query(
      'SELECT * FROM payment_settings WHERE restaurant_id = ? LIMIT 1',
      [restaurant_id]
    );

    if (payments.length === 0) {
      // Cria configurações padrão se não existirem
      await query(
        `INSERT INTO payment_settings (restaurant_id, accepts_cash, accepts_credit_card, accepts_debit_card, accepts_pix, credit_card_brands)
         VALUES (?, 1, 1, 1, 1, ?)`,
        [restaurant_id, JSON.stringify(['visa', 'mastercard', 'elo', 'amex'])]
      );

      payments = await query(
        'SELECT * FROM payment_settings WHERE restaurant_id = ? LIMIT 1',
        [restaurant_id]
      );
    }

    const p = payments[0];
    if (p.credit_card_brands && typeof p.credit_card_brands === 'string') {
      try { p.credit_card_brands = JSON.parse(p.credit_card_brands); } catch (e) { p.credit_card_brands = []; }
    }
    if (p.meal_voucher_brands && typeof p.meal_voucher_brands === 'string') {
      try { p.meal_voucher_brands = JSON.parse(p.meal_voucher_brands); } catch (e) { p.meal_voucher_brands = []; }
    }

    return res.json({ success: true, data: p });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/settings/payments
 */
const updatePayments = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const {
      accepts_cash,
      accepts_credit_card,
      accepts_debit_card,
      accepts_pix,
      pix_key,
      pix_key_type,
      pix_receiver_name,
      pix_receiver_city,
      pix_instructions,
      credit_card_brands,
      card_surcharge_percent,
      accepts_meal_voucher,
      meal_voucher_brands
    } = req.body;

    await query(
      `INSERT INTO payment_settings (
        restaurant_id, accepts_cash, accepts_credit_card, accepts_debit_card, accepts_pix,
        pix_key, pix_key_type, pix_receiver_name, pix_receiver_city, pix_instructions,
        credit_card_brands, card_surcharge_percent, accepts_meal_voucher, meal_voucher_brands
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        accepts_cash = VALUES(accepts_cash),
        accepts_credit_card = VALUES(accepts_credit_card),
        accepts_debit_card = VALUES(accepts_debit_card),
        accepts_pix = VALUES(accepts_pix),
        pix_key = VALUES(pix_key),
        pix_key_type = VALUES(pix_key_type),
        pix_receiver_name = VALUES(pix_receiver_name),
        pix_receiver_city = VALUES(pix_receiver_city),
        pix_instructions = VALUES(pix_instructions),
        credit_card_brands = VALUES(credit_card_brands),
        card_surcharge_percent = VALUES(card_surcharge_percent),
        accepts_meal_voucher = VALUES(accepts_meal_voucher),
        meal_voucher_brands = VALUES(meal_voucher_brands)`,
      [
        restaurant_id,
        accepts_cash !== undefined ? (accepts_cash ? 1 : 0) : 1,
        accepts_credit_card !== undefined ? (accepts_credit_card ? 1 : 0) : 1,
        accepts_debit_card !== undefined ? (accepts_debit_card ? 1 : 0) : 1,
        accepts_pix !== undefined ? (accepts_pix ? 1 : 0) : 1,
        pix_key || null,
        pix_key_type || null,
        pix_receiver_name || null,
        pix_receiver_city || null,
        pix_instructions || null,
        credit_card_brands ? JSON.stringify(credit_card_brands) : null,
        card_surcharge_percent || 0.00,
        accepts_meal_voucher !== undefined ? (accepts_meal_voucher ? 1 : 0) : 0,
        meal_voucher_brands ? JSON.stringify(meal_voucher_brands) : null
      ]
    );

    const updated = await query('SELECT * FROM payment_settings WHERE restaurant_id = ? LIMIT 1', [restaurant_id]);
    const p = updated[0];
    if (p.credit_card_brands && typeof p.credit_card_brands === 'string') {
      try { p.credit_card_brands = JSON.parse(p.credit_card_brands); } catch (e) { p.credit_card_brands = []; }
    }
    if (p.meal_voucher_brands && typeof p.meal_voucher_brands === 'string') {
      try { p.meal_voucher_brands = JSON.parse(p.meal_voucher_brands); } catch (e) { p.meal_voucher_brands = []; }
    }

    return res.json({ success: true, message: 'Configurações de pagamento atualizadas com sucesso!', data: p });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  updateOpeningHours,
  toggleOpen,
  getAppearance,
  updateAppearance,
  getPayments,
  updatePayments
};
