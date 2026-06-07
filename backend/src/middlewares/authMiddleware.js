const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Middleware de Autenticação Multiempresa (authMiddleware)
 * - Valida o token JWT.
 * - Verifica o status do usuário no banco (bloqueia se inativo/bloqueado).
 * - Verifica o status do restaurante no banco (bloqueia se inativo/bloqueado).
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido.',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido. Use: Bearer <token>',
      });
    }

    const token = parts[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Faça login novamente.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token inválido.',
        code: 'TOKEN_INVALID',
      });
    }

    // Busca o usuário no banco de dados para garantir estado atualizado
    const users = await query(
      'SELECT id, restaurant_id, name, email, role, status FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado.',
      });
    }

    const user = users[0];

    // Bloquear acesso de usuário inativo ou bloqueado
    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Seu usuário foi bloqueado. Entre em contato com o suporte.',
        code: 'USER_BLOCKED',
      });
    }
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Seu usuário está inativo. Entre em contato com o administrador.',
        code: 'USER_INACTIVE',
      });
    }

    // Se não for admin_geral, valida o restaurante
    if (user.role !== 'admin_geral') {
      if (!user.restaurant_id) {
        return res.status(403).json({
          success: false,
          message: 'Usuário não está associado a nenhum restaurante.',
        });
      }

      const restaurants = await query(
        'SELECT id, name, slug, status FROM restaurants WHERE id = ? LIMIT 1',
        [user.restaurant_id]
      );

      if (restaurants.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Restaurante associado não encontrado.',
        });
      }

      const restaurant = restaurants[0];

      // Bloquear painel se o restaurante estiver inativo ou bloqueado
      if (restaurant.status === 'blocked') {
        return res.status(403).json({
          success: false,
          message: 'Este painel está bloqueado pois o restaurante associado está bloqueado.',
          code: 'RESTAURANT_BLOCKED',
        });
      }
      if (restaurant.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Este painel está bloqueado pois o restaurante associado está inativo.',
          code: 'RESTAURANT_INACTIVE',
        });
      }

      user.restaurant_status = restaurant.status;
      user.restaurant_slug = restaurant.slug;
      user.restaurant_name = restaurant.name;
    }

    // Popula req.user com dados válidos e atuais do banco
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

authMiddleware.authMiddleware = authMiddleware;
module.exports = authMiddleware;
