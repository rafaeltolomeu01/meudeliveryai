const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT
 * Verifica o header Authorization: Bearer <token>
 * Popula req.user com os dados do token
 */
const auth = (req, res, next) => {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Popula req.user com dados do payload
    req.user = {
      id: decoded.id,
      email: decoded.email,
      restaurant_id: decoded.restaurant_id,
      role: decoded.role,
      name: decoded.name,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Faça login novamente.',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido.',
        code: 'TOKEN_INVALID',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Falha na autenticação.',
    });
  }
};

/**
 * Middleware de autorização por roles
 * @param {...string} roles - Roles permitidas
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado.',
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para realizar esta ação.',
        required_roles: roles,
        your_role: req.user.role,
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
