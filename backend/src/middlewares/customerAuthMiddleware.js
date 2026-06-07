const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Middleware de Autenticação de Clientes (customerAuthMiddleware)
 * - Valida o token JWT do cliente.
 * - Verifica o status do cliente no banco (bloqueia se inativo/bloqueado).
 */
const customerAuthMiddleware = async (req, res, next) => {
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

    // Busca o cliente no banco de dados para garantir estado atualizado
    const customers = await query(
      'SELECT id, restaurant_id, name, email, phone, document, is_blocked FROM customers WHERE id = ? LIMIT 1',
      [decoded.id]
    );

    if (customers.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Cliente não encontrado.',
      });
    }

    const customer = customers[0];

    // Bloquear acesso de cliente bloqueado
    if (customer.is_blocked) {
      return res.status(403).json({
        success: false,
        message: 'Seu cadastro está suspenso. Entre em contato com o estabelecimento.',
        code: 'CUSTOMER_BLOCKED',
      });
    }

    // Popula req.customer e req.user com dados do cliente
    req.customer = customer;
    req.user = {
      id: customer.id,
      restaurant_id: customer.restaurant_id,
      name: customer.name,
      email: customer.email,
      role: 'customer'
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = customerAuthMiddleware;
