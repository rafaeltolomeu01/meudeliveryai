const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const { checkOwnership } = tenantMiddleware;
const {
  getAll, getOne, create, update, remove, getOrderHistory,
} = require('../controllers/customer.controller');

// ─── Validações ───────────────────────────────────────────────────────────────
const createValidation = [
  body('name').notEmpty().withMessage('Nome do cliente é obrigatório.').trim(),
  body('email').optional({ nullable: true }).isEmail().withMessage('E-mail inválido.'),
  body('phone').optional().trim(),
];

const updateValidation = [
  body('name').optional().notEmpty().withMessage('Nome não pode ser vazio.').trim(),
  body('email').optional({ nullable: true }).isEmail().withMessage('E-mail inválido.'),
];

// ─── Rotas ────────────────────────────────────────────────────────────────────

// GET /api/v1/customers
router.get('/', authMiddleware, tenantMiddleware, getAll);

// GET /api/v1/customers/:id
router.get('/:id', authMiddleware, tenantMiddleware, checkOwnership('customers'), getOne);

// GET /api/v1/customers/:id/orders
router.get('/:id/orders', authMiddleware, tenantMiddleware, checkOwnership('customers'), getOrderHistory);

// POST /api/v1/customers
router.post('/', authMiddleware, tenantMiddleware, createValidation, create);

// PUT /api/v1/customers/:id
router.put('/:id', authMiddleware, tenantMiddleware, checkOwnership('customers'), updateValidation, update);

// DELETE /api/v1/customers/:id
router.delete('/:id', authMiddleware, tenantMiddleware, checkOwnership('customers'), remove);

module.exports = router;
