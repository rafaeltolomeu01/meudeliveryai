const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const customerAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Cliente não autenticado. Faça login novamente.' });
    }

    const [type, token] = String(authHeader).split(' ');
    if (type !== 'Bearer' || !token || token === 'undefined' || token === 'null') {
      return res.status(401).json({ success: false, message: 'Sessão inválida. Faça login novamente.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Sessão expirada ou inválida. Faça login novamente.', code: 'TOKEN_INVALID' });
    }

    if (decoded.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Token não pertence a cliente.' });
    }

    const customers = await query(
      `SELECT id, restaurant_id, name, email, phone, document, is_blocked
         FROM customers
        WHERE id = ? AND restaurant_id = ?
        LIMIT 1`,
      [decoded.id, decoded.restaurant_id]
    );

    if (customers.length === 0) {
      return res.status(401).json({ success: false, message: 'Cliente não encontrado. Faça cadastro novamente.' });
    }

    const customer = customers[0];
    if (customer.is_blocked) {
      return res.status(403).json({ success: false, message: 'Seu cadastro está suspenso. Entre em contato com o estabelecimento.' });
    }

    req.customer = customer;
    req.user = {
      id: customer.id,
      restaurant_id: customer.restaurant_id,
      name: customer.name,
      email: customer.email,
      role: 'customer',
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = customerAuthMiddleware;
