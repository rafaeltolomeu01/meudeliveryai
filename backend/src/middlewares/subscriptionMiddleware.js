const { query } = require('../config/database');

/**
 * Middleware de Assinatura (subscriptionMiddleware)
 * Bloqueia o acesso a operações (como a criação de pedidos) caso a assinatura esteja vencida, expirada ou cancelada.
 */
const subscriptionMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Não autenticado.',
      });
    }

    // Administrador geral tem bypass em checagem de assinatura
    if (req.user.role === 'admin_geral') {
      return next();
    }

    const restaurantId = req.user.restaurant_id;
    if (!restaurantId) {
      return res.status(403).json({
        success: false,
        message: 'Usuário sem restaurante associado.',
      });
    }

    const subscriptions = await query(
      `SELECT s.*, p.name AS plan_name 
       FROM subscriptions s
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE s.restaurant_id = ? 
       ORDER BY s.id DESC LIMIT 1`,
      [restaurantId]
    );

    if (subscriptions.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nenhuma assinatura encontrada para este restaurante. Por favor, assine um plano.',
        code: 'SUBSCRIPTION_NOT_FOUND',
      });
    }

    const subscription = subscriptions[0];
    const now = new Date();

    // Se estiver cancelada ou overdue
    if (subscription.status === 'canceled' || subscription.status === 'overdue') {
      return res.status(402).json({
        success: false,
        message: 'Sua assinatura está vencida ou cancelada. Regularize seu plano para realizar esta ação.',
        code: 'SUBSCRIPTION_EXPIRED',
      });
    }

    // Validar data de vencimento (due_date)
    if (subscription.due_date && new Date(subscription.due_date) < now) {
      return res.status(402).json({
        success: false,
        message: subscription.status === 'trial'
          ? 'O período de teste gratuito do seu restaurante expirou. Assine um plano para continuar.'
          : 'Sua assinatura está vencida. Regularize o pagamento para continuar utilizando os serviços.',
        code: 'SUBSCRIPTION_EXPIRED',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

subscriptionMiddleware.subscriptionMiddleware = subscriptionMiddleware;
module.exports = subscriptionMiddleware;
