const { query } = require('../config/database');

/**
 * Middleware multi-tenant
 * Garante que o recurso solicitado pertence ao restaurante do usuário autenticado
 */

/**
 * Verifica se um recurso pertence ao tenant (restaurant_id) do usuário logado
 * @param {string} tableName - Nome da tabela no banco
 * @param {string} idParam - Nome do parâmetro de ID na URL (ex: 'id', 'productId')
 */
const checkOwnership = (tableName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      // Bypassa validação para administrador geral
      if (req.user && req.user.role === 'admin_geral') {
        return next();
      }

      const resourceId = req.params[idParam];
      const restaurantId = req.user.restaurant_id;

      if (!resourceId) {
        return next(); // Sem ID para verificar (ex: rotas de listagem)
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

      if (String(resource.restaurant_id) !== String(restaurantId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Este recurso não pertence ao seu restaurante.',
        });
      }

      // Armazena o recurso encontrado para uso no controller
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Garante que o restaurant_id na query/body bate com o do JWT
 * Usado para prevenir escalação de privilégios em criações/atualizações
 */
const enforceRestaurantId = (req, res, next) => {
  // Sobrescreve apenas se o usuário não for administrador geral
  if (req.user && req.user.role !== 'admin_geral') {
    req.body.restaurant_id = req.user.restaurant_id;
  }
  next();
};

/**
 * Verifica ownership de orders (que tem customer_id, não restaurant_id direto em alguns casos)
 */
const checkOrderOwnership = (idParam = 'id') => {
  return async (req, res, next) => {
    try {
      // Bypassa validação para administrador geral
      if (req.user && req.user.role === 'admin_geral') {
        return next();
      }

      const orderId = req.params[idParam];
      const restaurantId = req.user.restaurant_id;

      if (!orderId) return next();

      const rows = await query(
        'SELECT id, restaurant_id FROM orders WHERE id = ? LIMIT 1',
        [orderId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pedido não encontrado.',
        });
      }

      if (String(rows[0].restaurant_id) !== String(restaurantId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado.',
        });
      }

      req.resource = rows[0];
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkOwnership, enforceRestaurantId, checkOrderOwnership };
