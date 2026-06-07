const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const subscriptionMiddleware = require('../middlewares/subscriptionMiddleware');
const { checkOwnership } = tenantMiddleware;
const {
  getAll, getOne, create, updateStatus, assignDriver, cancel, getStats, markAsPaid,
} = require('../controllers/order.controller');

// ─── Validações ───────────────────────────────────────────────────────────────
const createValidation = [
  body('items').isArray({ min: 1 }).withMessage('O pedido deve conter pelo menos 1 item.'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('ID do produto inválido.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantidade deve ser pelo menos 1.'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'credit_card', 'debit_card', 'pix'])
    .withMessage('Método de pagamento inválido.'),
  body('delivery_fee').optional().isFloat({ min: 0 }),
  body('discount').optional().isFloat({ min: 0 }),
];

const updateStatusValidation = [
  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'])
    .withMessage('Status inválido.'),
];

// ─── Rotas ────────────────────────────────────────────────────────────────────

// GET /api/v1/orders/stats (deve vir ANTES de /:id)
router.get('/stats', authMiddleware, tenantMiddleware, getStats);

// GET /api/v1/orders
router.get('/', authMiddleware, tenantMiddleware, getAll);

// GET /api/v1/orders/:id
router.get('/:id', authMiddleware, tenantMiddleware, checkOwnership('orders'), getOne);

// POST /api/v1/orders
router.post('/', authMiddleware, tenantMiddleware, subscriptionMiddleware, createValidation, create);

// PATCH /api/v1/orders/:id/status
router.patch('/:id/status', authMiddleware, tenantMiddleware, subscriptionMiddleware, checkOwnership('orders'), updateStatusValidation, updateStatus);

// PATCH /api/v1/orders/:id/mark-as-paid
router.patch('/:id/mark-as-paid', authMiddleware, tenantMiddleware, subscriptionMiddleware, checkOwnership('orders'), markAsPaid);

// PATCH /api/v1/orders/:id/assign-driver
router.patch('/:id/assign-driver', authMiddleware, tenantMiddleware, subscriptionMiddleware, checkOwnership('orders'), assignDriver);

// PATCH /api/v1/orders/:id/cancel
router.patch('/:id/cancel', authMiddleware, tenantMiddleware, subscriptionMiddleware, checkOwnership('orders'), cancel);

module.exports = router;
