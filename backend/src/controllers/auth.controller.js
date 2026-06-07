const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query, beginTransaction, queryTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Gera JWT para o usuário
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      restaurant_id: user.restaurant_id,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/v1/auth/register
 * Cria restaurante + usuário owner atomicamente
 */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { restaurant_name, email, password, name, phone, whatsapp, city, state } = req.body;

    // Verifica email duplicado
    const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Este e-mail já está cadastrado.' });
    }

    // Gera slug do restaurante
    let slug = req.body.slug;
    if (slug) {
      slug = slug
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    } else {
      slug = restaurant_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Verifica slug duplicado
    const existingSlug = await query('SELECT id FROM restaurants WHERE slug = ? LIMIT 1', [slug]);
    if (existingSlug.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'O link de acesso do restaurante (slug) já está em uso. Por favor, escolha outro nome ou link.',
        errors: [{ param: 'restaurant_name', msg: 'Este link já está em uso.' }]
      });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const connection = await beginTransaction();

    try {
      // Cria restaurante
      const restaurantResult = await queryTransaction(connection,
        `INSERT INTO restaurants (name, slug, owner_name, email, phone, whatsapp, city, state, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [restaurant_name, slug, name, email, phone || null, whatsapp || null, city || null, state || null]
      );
      const restaurant_id = restaurantResult.insertId;

      // Cria usuário dono
      const userResult = await queryTransaction(connection,
        `INSERT INTO users (restaurant_id, name, email, password_hash, phone, role, status) VALUES (?, ?, ?, ?, ?, 'dono', 'active')`,
        [restaurant_id, name, email, password_hash, phone || null]
      );
      const user_id = userResult.insertId;

      // Cria assinatura trial (30 dias)
      await queryTransaction(connection,
        `INSERT INTO subscriptions (restaurant_id, plan_id, status, start_date, due_date, trial_days, monthly_price)
         VALUES (?, 1, 'trial', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 30, 0.00)`,
         [restaurant_id]
      );

      // Cria configurações padrão
      await queryTransaction(connection,
        `INSERT INTO restaurant_settings (restaurant_id, delivery_fee, estimated_delivery_time, is_open, opening_hours)
         VALUES (?, 5.00, 45, 0, ?)`,
         [restaurant_id, JSON.stringify({
           monday: { open: '11:00', close: '23:00', enabled: true },
           tuesday: { open: '11:00', close: '23:00', enabled: true },
           wednesday: { open: '11:00', close: '23:00', enabled: true },
           thursday: { open: '11:00', close: '23:00', enabled: true },
           friday: { open: '11:00', close: '00:00', enabled: true },
           saturday: { open: '11:00', close: '00:00', enabled: true },
           sunday: { open: '12:00', close: '22:00', enabled: false },
         })]
      );

      // Cria tema padrão
      await queryTransaction(connection,
        `INSERT INTO restaurant_theme (restaurant_id, primary_color, secondary_color)
         VALUES (?, '#FF6B35', '#1A0533')`,
         [restaurant_id]
      );

      await connection.commit();
      connection.release();

      const user = { id: user_id, email, restaurant_id, role: 'dono', name };
      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        message: 'Restaurante cadastrado com sucesso! Bem-vindo ao MeuDeliveryAI!',
        data: {
          token,
          user: { id: user_id, name, email, role: 'dono', restaurant_id },
          restaurant: { id: restaurant_id, name: restaurant_name, slug },
        },
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
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { email, password } = req.body;

    const users = await query(
      `SELECT u.*, r.name as restaurant_name, r.slug as restaurant_slug, r.status as restaurant_status, rs.is_open as restaurant_is_open
       FROM users u
       LEFT JOIN restaurants r ON r.id = u.restaurant_id
       LEFT JOIN restaurant_settings rs ON rs.restaurant_id = u.restaurant_id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      if (email === 'demo@meudeliveryai.com' && password === '123456') {
        console.log('🔄 Demo login requested but user not found. Seeding demo database dynamically...');
        try {
          const { seed } = require('../scripts/seed-demo');
          await seed();
          
          // Re-fetch user details after seeding
          const usersRetry = await query(
            `SELECT u.*, r.name as restaurant_name, r.slug as restaurant_slug, r.status as restaurant_status, rs.is_open as restaurant_is_open
             FROM users u
             LEFT JOIN restaurants r ON r.id = u.restaurant_id
             LEFT JOIN restaurant_settings rs ON rs.restaurant_id = u.restaurant_id
             WHERE u.email = ? LIMIT 1`,
            [email]
          );
          if (usersRetry.length > 0) {
            users.push(usersRetry[0]);
          } else {
            return res.status(401).json({ success: false, message: 'Erro ao inicializar ambiente de demonstração.' });
          }
        } catch (seedErr) {
          console.error('Erro ao semear banco de dados de demonstração dinamicamente:', seedErr);
          return res.status(500).json({ success: false, message: 'Erro ao inicializar ambiente de demonstração no servidor.' });
        }
      } else {
        return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
      }
    }

    const user = users[0];

    // Valida status do usuário
    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Seu usuário foi bloqueado. Entre em contato com o suporte.' });
    }
    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Seu usuário está inativo.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos.' });
    }

    // Valida status do restaurante (apenas se não for admin_geral)
    if (user.role !== 'admin_geral') {
      if (user.restaurant_status === 'blocked') {
        return res.status(403).json({ success: false, message: 'Este restaurante foi bloqueado. Entre em contato com o suporte.' });
      }
      if (user.restaurant_status === 'inactive') {
        return res.status(403).json({ success: false, message: 'Este restaurante está inativo.' });
      }
    }

    // Atualiza last_login
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          restaurant_id: user.restaurant_id,
          restaurant_name: user.restaurant_name,
          restaurant_slug: user.restaurant_slug,
          restaurant_is_open: user.restaurant_is_open,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 */
const me = async (req, res, next) => {
  try {
    const users = await query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              u.restaurant_id, r.name as restaurant_name, r.slug as restaurant_slug,
              p.slug as plan, s.status as subscription_status, s.due_date as trial_ends_at, s.due_date,
              rs.is_open as restaurant_is_open
       FROM users u
       LEFT JOIN restaurants r ON r.id = u.restaurant_id
       LEFT JOIN subscriptions s ON s.restaurant_id = u.restaurant_id
       LEFT JOIN plans p ON p.id = s.plan_id
       LEFT JOIN restaurant_settings rs ON rs.restaurant_id = u.restaurant_id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    return res.json({ success: true, data: users[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Dados inválidos.', errors: errors.array() });
    }

    const { current_password, new_password } = req.body;

    const users = await query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const isValid = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const new_hash = await bcrypt.hash(new_password, saltRounds);

    await query('UPDATE users SET password_hash = ? WHERE id = ?', [new_hash, req.user.id]);

    return res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const users = await query(
      "SELECT id, email, restaurant_id, role, name FROM users WHERE id = ? AND status = 'active' LIMIT 1",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const token = generateToken(users[0]);
    return res.json({ success: true, data: { token } });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, me, changePassword, refreshToken };
