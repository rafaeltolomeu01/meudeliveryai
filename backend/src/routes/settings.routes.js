const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const subscriptionMiddleware = require('../middlewares/subscriptionMiddleware');
const {
  getSettings, updateSettings, updateOpeningHours, toggleOpen, getAppearance, updateAppearance,
  getPayments, updatePayments,
} = require('../controllers/settings.controller');

// ─── Validações ───────────────────────────────────────────────────────────────
const updateValidation = [
  body('delivery_radius_km').optional().isFloat({ min: 0 }).withMessage('Raio de entrega inválido.'),
  body('min_order_value').optional().isFloat({ min: 0 }).withMessage('Pedido mínimo inválido.'),
  body('delivery_fee').optional().isFloat({ min: 0 }).withMessage('Taxa de entrega inválida.'),
  body('estimated_delivery_time').optional().isInt({ min: 1 }).withMessage('Tempo estimado inválido.'),
  body('primary_color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Cor primária inválida (use formato HEX #RRGGBB).'),
  body('secondary_color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Cor secundária inválida.'),
  body('accepts_cash').optional().isBoolean(),
  body('accepts_credit_card').optional().isBoolean(),
  body('accepts_debit_card').optional().isBoolean(),
  body('accepts_pix').optional().isBoolean(),
  body('auto_accept_orders').optional().isBoolean(),
  body('accept_orders_when_closed').optional().isBoolean(),
  body('welcome_message').optional().isString(),
  body('order_confirmed_message').optional().isString(),
  body('order_dispatched_message').optional().isString(),
  body('support_phone').optional().isString(),
  body('is_open').optional().isBoolean(),
  body('default_print_format').optional().isIn(['58mm', '80mm', 'ask']).withMessage('Formato de impressão inválido.'),
];

// ─── Rotas ────────────────────────────────────────────────────────────────────

// GET /api/v1/settings
router.get('/', authMiddleware, tenantMiddleware, getSettings);

// GET /api/v1/settings/payments
router.get('/payments', authMiddleware, tenantMiddleware, getPayments);

// PUT /api/v1/settings/payments
router.put('/payments', authMiddleware, tenantMiddleware, subscriptionMiddleware, roleMiddleware('admin_geral', 'dono', 'gerente'), updatePayments);

// PUT /api/v1/settings
router.put('/', authMiddleware, tenantMiddleware, subscriptionMiddleware, roleMiddleware('admin_geral', 'dono', 'gerente'), updateValidation, updateSettings);

// PUT /api/v1/settings/opening-hours
router.put('/opening-hours', authMiddleware, tenantMiddleware, subscriptionMiddleware, roleMiddleware('admin_geral', 'dono', 'gerente'), updateOpeningHours);

// PATCH /api/v1/settings/toggle-open
router.patch('/toggle-open', authMiddleware, tenantMiddleware, subscriptionMiddleware, roleMiddleware('admin_geral', 'dono', 'gerente'), toggleOpen);

// GET /api/v1/settings/appearance
router.get('/appearance', authMiddleware, tenantMiddleware, getAppearance);

// PUT /api/v1/settings/appearance
router.put('/appearance', authMiddleware, tenantMiddleware, subscriptionMiddleware, roleMiddleware('admin_geral', 'dono', 'gerente'), updateAppearance);

module.exports = router;
