const { query } = require('../config/database');

/**
 * GET /api/v1/reports/summary
 * Query params: date_from, date_to (padrão: últimos 30 dias)
 */
const getSummary = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const {
      date_from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_to = new Date().toISOString().split('T')[0],
    } = req.query;

    const [summary] = await query(
      `SELECT
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN status = 'delivered' THEN total END), 0) as avg_ticket,
        COUNT(DISTINCT customer_id) as unique_customers
       FROM orders
       WHERE restaurant_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
      [restaurant_id, date_from, date_to]
    );

    // Novos clientes no período
    const [newCustomers] = await query(
      `SELECT COUNT(*) as new_customers
       FROM customers
       WHERE restaurant_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
      [restaurant_id, date_from, date_to]
    );

    // Comparação com período anterior
    const daysDiff = Math.ceil((new Date(date_to) - new Date(date_from)) / (1000 * 60 * 60 * 24));
    const prevFrom = new Date(new Date(date_from) - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevTo = new Date(new Date(date_from) - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [prevSummary] = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) as total_revenue,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
       FROM orders
       WHERE restaurant_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
      [restaurant_id, prevFrom, prevTo]
    );

    const revenueGrowth = prevSummary.total_revenue > 0
      ? ((summary.total_revenue - prevSummary.total_revenue) / prevSummary.total_revenue) * 100
      : 0;

    return res.json({
      success: true,
      data: {
        period: { date_from, date_to },
        ...summary,
        new_customers: newCustomers.new_customers,
        revenue_growth_percent: parseFloat(revenueGrowth.toFixed(2)),
        prev_period_revenue: prevSummary.total_revenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/orders-by-day
 * Últimos 30 dias
 */
const getOrdersByDay = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const { days = 30 } = req.query;

    const data = await query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) as revenue
       FROM orders
       WHERE restaurant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [restaurant_id, parseInt(days)]
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/top-products
 */
const getTopProducts = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const {
      date_from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_to = new Date().toISOString().split('T')[0],
      limit = 10,
    } = req.query;

    const data = await query(
      `SELECT
        p.id, p.name, p.price, p.image_url,
        c.name as category_name,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT oi.order_id) as total_orders,
        SUM(oi.total_price) as total_revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.restaurant_id = ?
         AND o.status = 'delivered'
         AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY p.id
       ORDER BY total_quantity DESC
       LIMIT ?`,
      [restaurant_id, date_from, date_to, parseInt(limit)]
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/orders-by-status
 */
const getOrdersByStatus = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const {
      date_from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_to = new Date().toISOString().split('T')[0],
    } = req.query;

    const data = await query(
      `SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total_value,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
       FROM orders
       WHERE restaurant_id = ? AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY status
       ORDER BY count DESC`,
      [restaurant_id, date_from, date_to]
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/revenue-by-period
 * Agrupa por semana ou mês
 */
const getRevenueByPeriod = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const { group_by = 'week', months = 3 } = req.query;

    let dateFormat;
    let groupExpr;

    if (group_by === 'month') {
      dateFormat = '%Y-%m';
      groupExpr = "DATE_FORMAT(created_at, '%Y-%m')";
    } else {
      dateFormat = '%Y-%u';
      groupExpr = "YEARWEEK(created_at, 1)";
    }

    const data = await query(
      `SELECT
        ${groupExpr} as period,
        MIN(DATE(created_at)) as period_start,
        MAX(DATE(created_at)) as period_end,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) as revenue
       FROM orders
       WHERE restaurant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
       GROUP BY ${groupExpr}
       ORDER BY period ASC`,
      [restaurant_id, parseInt(months)]
    );

    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/overview
 * Query params: date_from, date_to
 */
const getOverview = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    const {
      date_from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_to = new Date().toISOString().split('T')[0],
    } = req.query;

    // 1. Faturamento do dia (hoje)
    const [todaySales] = await query(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM orders
       WHERE restaurant_id = ? AND status IN ('delivered', 'picked_up') AND DATE(created_at) = CURDATE()`,
      [restaurant_id]
    );

    // 2. Faturamento do mês
    const [monthSales] = await query(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM orders
       WHERE restaurant_id = ? AND status IN ('delivered', 'picked_up')
         AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`,
      [restaurant_id]
    );

    // 3. Estatísticas gerais do período
    const [periodStats] = await query(
      `SELECT
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN status IN ('delivered', 'picked_up') THEN 1 END) as delivered_orders,
        COALESCE(SUM(CASE WHEN status IN ('delivered', 'picked_up') THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN status IN ('delivered', 'picked_up') THEN total END), 0) as avg_ticket
       FROM orders
       WHERE restaurant_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
      [restaurant_id, date_from, date_to]
    );

    // 4. Produtos mais vendidos
    const topProductsRaw = await query(
      `SELECT
        oi.product_name as name,
        SUM(oi.quantity) as qty,
        SUM(oi.total_price) as revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.restaurant_id = ? AND o.status IN ('delivered', 'picked_up')
         AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY oi.product_id, oi.product_name
       ORDER BY qty DESC
       LIMIT 5`,
      [restaurant_id, date_from, date_to]
    );

    // Adiciona percentual de venda para os produtos
    const maxProductQty = topProductsRaw[0]?.qty || 1;
    const topProducts = topProductsRaw.map(p => ({
      ...p,
      pct: Math.round((p.qty / maxProductQty) * 100)
    }));

    // 5. Clientes que mais compram
    const topCustomers = await query(
      `SELECT
        c.name,
        COUNT(o.id) as orders_count,
        SUM(o.total) as total_spent
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.restaurant_id = ? AND o.status IN ('delivered', 'picked_up')
         AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY c.id, c.name
       ORDER BY total_spent DESC
       LIMIT 5`,
      [restaurant_id, date_from, date_to]
    );

    // 6. Formas de pagamento mais usadas
    const paymentMethodsRaw = await query(
      `SELECT
        payment_method as method,
        COUNT(*) as count
       FROM orders
       WHERE restaurant_id = ? AND status IN ('delivered', 'picked_up')
         AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY payment_method
       ORDER BY count DESC`,
      [restaurant_id, date_from, date_to]
    );

    const paymentLabels = {
      cash: 'Dinheiro',
      credit_card: 'Crédito',
      debit_card: 'Débito',
      pix: 'PIX',
      meal_voucher: 'Vale Refeição',
      online: 'Online',
    };
    
    const paymentColors = {
      cash: '#f59e0b',
      credit_card: '#a855f7',
      debit_card: '#06b6d4',
      pix: '#22c55e',
      meal_voucher: '#ec4899',
      online: '#3b82f6',
    };

    const totalDelivered = periodStats.delivered_orders || 1;
    const payments = paymentMethodsRaw.map(pm => {
      const label = paymentLabels[pm.method] || pm.method;
      const color = paymentColors[pm.method] || '#6b5880';
      return {
        method: label,
        pct: Math.round((pm.count / totalDelivered) * 100),
        color,
      };
    });

    // 7. Gráfico de Faturamento por Período
    const isSingleDay = date_from === date_to;
    let chartData = [];

    if (isSingleDay) {
      // Agrupa por hora
      const hourlyData = await query(
        `SELECT
          HOUR(created_at) as hour,
          SUM(total) as revenue
         FROM orders
         WHERE restaurant_id = ? AND status IN ('delivered', 'picked_up')
           AND DATE(created_at) = ?
         GROUP BY HOUR(created_at)
         ORDER BY hour ASC`,
        [restaurant_id, date_from]
      );

      // Preenche horas vazias para ficar bonito
      const hourMap = {};
      hourlyData.forEach(d => { hourMap[d.hour] = parseFloat(d.revenue); });
      for (let h = 8; h <= 22; h += 2) {
        chartData.push({
          label: `${String(h).padStart(2, '0')}h`,
          value: hourMap[h] || 0 + (hourMap[h+1] || 0) || 0
        });
      }
    } else {
      // Agrupa por data
      const dailyData = await query(
        `SELECT
          DATE(created_at) as date,
          SUM(total) as revenue
         FROM orders
         WHERE restaurant_id = ? AND status IN ('delivered', 'picked_up')
           AND DATE(created_at) BETWEEN ? AND ?
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [restaurant_id, date_from, date_to]
      );

      // Mapeia para formato amigável (DD/MM)
      chartData = dailyData.map(d => {
        const dateObj = new Date(d.date);
        const day = String(dateObj.getDate() + 1).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        return {
          label: `${day}/${month}`,
          value: parseFloat(d.revenue)
        };
      });

      // Se retornou poucos dias, tenta deixar o gráfico mais legível
      if (chartData.length === 0) {
        chartData = [{ label: 'Sem dados', value: 0 }];
      }
    }

    return res.json({
      success: true,
      data: {
        sales_today: parseFloat(todaySales.total),
        sales_month: parseFloat(monthSales.total),
        total_orders: periodStats.total_orders,
        cancelled_orders: periodStats.cancelled_orders,
        delivered_orders: periodStats.delivered_orders,
        total_revenue: parseFloat(periodStats.total_revenue),
        avg_ticket: parseFloat(periodStats.avg_ticket),
        topProducts,
        topCustomers,
        payments,
        chartData
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getOrdersByDay,
  getTopProducts,
  getOrdersByStatus,
  getRevenueByPeriod,
  getOverview
};
