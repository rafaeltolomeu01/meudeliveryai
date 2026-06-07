const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const subscriptionMiddleware = require('../middlewares/subscriptionMiddleware');
const { checkOwnership } = tenantMiddleware;
const {
  getAll, getOne, create, update, remove, toggleAvailability, getActiveDeliveries,
} = require('../controllers/driver.controller');

// ─── Validações ───────────────────────────────────────────────────────────────
const createValidation = [
  body('name').notEmpty().withMessage('Nome do entregador é obrigatório.').trim(),
  body('phone').optional().trim(),
  body('vehicle_type')
    .optional()
    .isIn(['bike', 'motorcycle', 'car'])
    .withMessage('Tipo de veículo inválido. Use: bike, motorcycle ou car.'),
];

const updateValidation = [
  body('name').optional().notEmpty().withMessage('Nome não pode ser vazio.').trim(),
  body('vehicle_type').optional().isIn(['bike', 'motorcycle', 'car']),
  body('is_active').optional().isBoolean(),
];

// ─── Rotas ────────────────────────────────────────────────────────────────────

// GET /api/v1/drivers
router.get('/', authMiddleware, tenantMiddleware, getAll);

// GET /api/v1/drivers/:id
router.get('/:id', authMiddleware, tenantMiddleware, checkOwnership('delivery_drivers'), getOne);

// GET /api/v1/drivers/:id/deliveries
router.get('/:id/deliveries', authMiddleware, tenantMiddleware, checkOwnership('delivery_drivers'), getActiveDeliveries);

// POST /api/v1/drivers
router.post('/', authMiddleware, tenantMiddleware, subscriptionMiddleware, createValidation, create);

// PUT /api/v1/drivers/:id
router.put('/:id', authMiddleware, tenantMiddleware, checkOwnership('delivery_drivers'), subscriptionMiddleware, updateValidation, update);

// DELETE /api/v1/drivers/:id
router.delete('/:id', authMiddleware, tenantMiddleware, checkOwnership('delivery_drivers'), subscriptionMiddleware, remove);

// PATCH /api/v1/drivers/:id/toggle
router.patch('/:id/toggle', authMiddleware, tenantMiddleware, checkOwnership('delivery_drivers'), subscriptionMiddleware, toggleAvailability);

module.exports = router;
