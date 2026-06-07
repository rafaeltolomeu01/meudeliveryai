const { query } = require('../config/database');

/**
 * Middleware Multi-empresa (tenantMiddleware)
 * Garante que o restaurant_id venha estritamente do token JWT e nunca do frontend.
 */
const tenantMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Não autenticado.',
    });
  }

  // Se for administrador geral, permite filtrar por qualquer restaurante enviado nas requisições
  if (req.user.role === 'admin_geral') {
    return next();
  }

  const jwtRestaurantId = req.user.restaurant_id;

  if (!jwtRestaurantId) {
    return res.status(403).json({
      success: false,
      message: 'Usuário sem restaurante associado no token.',
    });
  }

  // Sobrescreve e enforça restaurant_id nos parâmetros do body e query com o valor do JWT
  req.body.restaurant_id = jwtRestaurantId;
  req.query.restaurant_id = jwtRestaurantId;

  next();
};

/**
 * Helper para verificar propriedade (ownership) de recursos específicos (ex: produtos, categorias, pedidos).
 * Impede que usuários acessem ou modifiquem dados de outros restaurantes alterando o ID na rota.
 * 
 * @param {string} tableName - Nome da tabela no MySQL
 * @param {string} idParam - Nome do parâmetro de ID na URL (default: 'id')
 */
const checkOwnership = (tableName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Não autenticado.',
        });
      }

      // Bypass de validação para administrador geral
      if (req.user.role === 'admin_geral') {
        return next();
      }

      const resourceId = req.params[idParam];
      const jwtRestaurantId = req.user.restaurant_id;

      if (!resourceId) {
        return next();
      }

      const rows = await query(
        `SELECT id, restaurant_id FROM \`${tableName}\` WHERE id = ? LIMIT 1`,
        [resourceId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado.',
        });
      }

      const resource = rows[0];

      if (String(resource.restaurant_id) !== String(jwtRestaurantId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Este recurso não pertence ao seu restaurante.',
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

tenantMiddleware.tenantMiddleware = tenantMiddleware;
tenantMiddleware.checkOwnership = checkOwnership;
module.exports = tenantMiddleware;
