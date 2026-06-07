const { query } = require('../config/database');

/**
 * GET /api/v1/admin/restaurants
 * Lista todos os restaurantes com suporte a busca e filtros.
 */
const listRestaurants = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    
    let sql = `
      SELECT r.id, r.name, r.slug, r.email, r.owner_name, r.status, r.created_at,
             s.due_date, s.status as subscription_status, p.name as plan_name
      FROM restaurants r
      LEFT JOIN subscriptions s ON s.restaurant_id = r.id AND s.id = (
        SELECT id FROM subscriptions WHERE restaurant_id = r.id ORDER BY id DESC LIMIT 1
      )
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (r.name LIKE ? OR r.owner_name LIKE ? OR r.email LIKE ?) `;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (status) {
      sql += ` AND r.status = ? `;
      params.push(status);
    }

    sql += ` ORDER BY r.id DESC `;

    const data = await query(sql, params);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/restaurants/:id
 * Retorna os detalhes de um restaurante e estatísticas de uso.
 */
const getRestaurantDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const restaurants = await query(
      `SELECT r.*, s.due_date, s.status as subscription_status, s.plan_id, s.monthly_price, p.name as plan_name
       FROM restaurants r
       LEFT JOIN subscriptions s ON s.restaurant_id = r.id AND s.id = (
         SELECT id FROM subscriptions WHERE restaurant_id = r.id ORDER BY id DESC LIMIT 1
       )
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE r.id = ? LIMIT 1`,
      [id]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'Restaurante não encontrado.' });
    }

    const restaurant = restaurants[0];

    // Contagem de pedidos
    const [{ orders_count }] = await query('SELECT COUNT(*) as orders_count FROM orders WHERE restaurant_id = ?', [id]);

    // Contagem de usuários
    const [{ users_count }] = await query('SELECT COUNT(*) as users_count FROM users WHERE restaurant_id = ?', [id]);

    // Contagem de produtos
    const [{ products_count }] = await query('SELECT COUNT(*) as products_count FROM products WHERE restaurant_id = ?', [id]);

    return res.json({
      success: true,
      data: {
        restaurant,
        stats: {
          orders_count: parseInt(orders_count || 0),
          users_count: parseInt(users_count || 0),
          products_count: parseInt(products_count || 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/restaurants/:id/status
 * Altera o status operacional do restaurante (active, inactive, blocked).
 */
const updateRestaurantStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status inválido. Use active, inactive ou blocked.' });
    }

    await query('UPDATE restaurants SET status = ? WHERE id = ?', [status, id]);

    return res.json({
      success: true,
      message: `Status do restaurante atualizado para ${status} com sucesso!`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/restaurants/:id/subscription
 * Altera o plano, preço e data de vencimento da assinatura de um restaurante.
 */
const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params; // restaurant_id
    const { plan_id, due_date, status } = req.body;

    if (!plan_id) {
      return res.status(400).json({ success: false, message: 'ID do plano é obrigatório.' });
    }

    // Valida o plano
    const plans = await query('SELECT * FROM plans WHERE id = ? LIMIT 1', [plan_id]);
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado.' });
    }
    const plan = plans[0];

    // Valida se o status é válido
    const subStatus = status || 'active';
    if (!['trial', 'active', 'overdue', 'canceled'].includes(subStatus)) {
      return res.status(400).json({ success: false, message: 'Status de assinatura inválido.' });
    }

    // Verifica se já existe assinatura
    const existing = await query(
      'SELECT id FROM subscriptions WHERE restaurant_id = ? ORDER BY id DESC LIMIT 1',
      [id]
    );

    if (existing.length > 0) {
      await query(
        `UPDATE subscriptions 
         SET plan_id = ?, due_date = ?, monthly_price = ?, status = ? 
         WHERE id = ?`,
        [plan_id, due_date || null, plan.price_monthly, subStatus, existing[0].id]
      );
    } else {
      await query(
        `INSERT INTO subscriptions (restaurant_id, plan_id, due_date, monthly_price, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, plan_id, due_date || null, plan.price_monthly, subStatus]
      );
    }

    return res.json({
      success: true,
      message: 'Assinatura do restaurante atualizada com sucesso!'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/plans
 * Lista todos os planos de assinatura ativos.
 */
const listPlans = async (req, res, next) => {
  try {
    const plans = await query('SELECT * FROM plans WHERE is_active = 1 ORDER BY position ASC');
    return res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listRestaurants,
  getRestaurantDetails,
  updateRestaurantStatus,
  updateSubscription,
  listPlans
};
