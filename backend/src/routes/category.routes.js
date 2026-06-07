const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const subscriptionMiddleware = require('../middlewares/subscriptionMiddleware');
const { checkOwnership } = tenantMiddleware;
const {
  getAll, getOne, create, update, remove, reorder,
} = require('../controllers/category.controller');

// ─── Validações ───────────────────────────────────────────────────────────────
const createValidation = [
  body('name').notEmpty().withMessage('Nome da categoria é obrigatório.').trim(),
  body('position').optional().isInt({ min: 0 }).withMessage('Posição deve ser um número positivo.'),
  body('is_active').optional().isBoolean(),
];

const updateValidation = [
  body('name').optional().notEmpty().withMessage('Nome não pode ser vazio.').trim(),
  body('position').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean(),
];

// ─── Rotas ────────────────────────────────────────────────────────────────────

// PUT /api/v1/categories/reorder (deve vir ANTES de /:id)
router.put('/reorder', authMiddleware, tenantMiddleware, subscriptionMiddleware, reorder);

// GET /api/v1/categories
router.get('/', authMiddleware, tenantMiddleware, getAll);

// GET /api/v1/categories/:id
router.get('/:id', authMiddleware, tenantMiddleware, checkOwnership('categories'), getOne);

// POST /api/v1/categories
router.post('/', authMiddleware, tenantMiddleware, subscriptionMiddleware, createValidation, create);

// PUT /api/v1/categories/:id
router.put('/:id', authMiddleware, tenantMiddleware, checkOwnership('categories'), subscriptionMiddleware, updateValidation, update);

// DELETE /api/v1/categories/:id
router.delete('/:id', authMiddleware, tenantMiddleware, checkOwnership('categories'), subscriptionMiddleware, remove);

module.exports = router;
