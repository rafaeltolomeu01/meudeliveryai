const { query } = require('../config/database');

/**
 * GET /api/v1/subscription
 * Retorna os detalhes da assinatura do restaurante logado.
 */
const get = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    if (!restaurantId) {
      return res.status(403).json({ success: false, message: 'Nenhum restaurante associado a este usuário.' });
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
      return res.status(404).json({ success: false, message: 'Nenhuma assinatura encontrada para este restaurante.' });
    }

    const sub = subscriptions[0];
    let daysRemaining = 0;
    if (sub.due_date) {
      const now = new Date();
      const due = new Date(sub.due_date);
      const diffTime = due - now;
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return res.json({
      success: true,
      data: {
        id: sub.id,
        restaurant_id: sub.restaurant_id,
        plan_id: sub.plan_id,
        plan_name: sub.plan_name,
        monthly_price: parseFloat(sub.monthly_price || 0),
        status: sub.status,
        start_date: sub.start_date,
        due_date: sub.due_date,
        trial_days: sub.trial_days,
        days_remaining: daysRemaining
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/subscription/renew
 * Simula a renovação da assinatura: estende a data de vencimento em 30 dias e ativa.
 */
const renew = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    if (!restaurantId) {
      return res.status(403).json({ success: false, message: 'Nenhum restaurante associado a este usuário.' });
    }

    const subscriptions = await query(
      `SELECT * FROM subscriptions WHERE restaurant_id = ? ORDER BY id DESC LIMIT 1`,
      [restaurantId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Assinatura não encontrada para renovação.' });
    }

    const sub = subscriptions[0];
    const now = new Date();
    let baseDate = now;

    // Se o vencimento atual for maior que hoje, estende a partir dele, senão a partir de hoje
    if (sub.due_date && new Date(sub.due_date) > now) {
      baseDate = new Date(sub.due_date);
    }

    const newDueDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await query(
      `UPDATE subscriptions 
       SET due_date = ?, status = 'active'
       WHERE id = ?`,
      [newDueDate, sub.id]
    );

    return res.json({
      success: true,
      message: 'Assinatura renovada com sucesso por mais 30 dias!',
      data: {
        due_date: newDueDate,
        status: 'active'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/subscription/upgrade
 * Simula o upgrade de plano do restaurante: estende vencimento em 30 dias e troca de plano.
 */
const upgrade = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    if (!restaurantId) {
      return res.status(403).json({ success: false, message: 'Nenhum restaurante associado a este usuário.' });
    }

    const { plan_id } = req.body;
    if (!plan_id) {
      return res.status(400).json({ success: false, message: 'ID do plano é obrigatório.' });
    }

    // Busca o plano no banco
    const plans = await query('SELECT * FROM plans WHERE id = ? LIMIT 1', [plan_id]);
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado.' });
    }
    const plan = plans[0];

    // Busca a assinatura
    const subscriptions = await query(
      `SELECT * FROM subscriptions WHERE restaurant_id = ? ORDER BY id DESC LIMIT 1`,
      [restaurantId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Assinatura não encontrada.' });
    }

    const sub = subscriptions[0];
    const now = new Date();
    const newDueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await query(
      `UPDATE subscriptions 
       SET plan_id = ?, monthly_price = ?, due_date = ?, status = 'active'
       WHERE id = ?`,
      [plan.id, plan.price_monthly, newDueDate, sub.id]
    );

    return res.json({
      success: true,
      message: `Upgrade para o plano ${plan.name} realizado com sucesso!`,
      data: {
        plan_id: plan.id,
        plan_name: plan.name,
        monthly_price: plan.price_monthly,
        due_date: newDueDate,
        status: 'active'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  get,
  renew,
  upgrade
};
