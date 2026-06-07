const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const subscriptionMiddleware = require('../middlewares/subscriptionMiddleware');
const {
  getSummary, getOrdersByDay, getTopProducts, getOrdersByStatus, getRevenueByPeriod, getOverview,
} = require('../controllers/report.controller');

// Todas as rotas de relatórios requerem autenticação, autorização e isolamento de tenant
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(subscriptionMiddleware);
router.use(roleMiddleware('admin_geral', 'dono', 'gerente'));

// GET /api/v1/reports/overview
router.get('/overview', getOverview);

// GET /api/v1/reports/summary
router.get('/summary', getSummary);

// GET /api/v1/reports/orders-by-day
router.get('/orders-by-day', getOrdersByDay);

// GET /api/v1/reports/top-products
router.get('/top-products', getTopProducts);

// GET /api/v1/reports/orders-by-status
router.get('/orders-by-status', getOrdersByStatus);

// GET /api/v1/reports/revenue-by-period
router.get('/revenue-by-period', getRevenueByPeriod);

module.exports = router;
