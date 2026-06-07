const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const subscriptionMiddleware = require('../middlewares/subscriptionMiddleware');

const {
  getAllGroups,
  getOneGroup,
  createGroup,
  updateGroup,
  removeGroup,
  reorderGroups,
  getItems,
  createItem,
  updateItem,
  removeItem,
  reorderItems
} = require('../controllers/complement.controller');

// Validations
const groupValidation = [
  body('name').notEmpty().withMessage('Nome do grupo é obrigatório.').trim(),
  body('min_quantity').isInt({ min: 0 }).withMessage('Quantidade mínima inválida.'),
  body('max_quantity').isInt({ min: 1 }).withMessage('Quantidade máxima deve ser pelo menos 1.'),
];

const itemValidation = [
  body('name').notEmpty().withMessage('Nome do item é obrigatório.').trim(),
  body('price').isFloat({ min: 0 }).withMessage('Preço não pode ser negativo.'),
  body('max_quantity').isInt({ min: 1 }).withMessage('Quantidade máxima individual deve ser pelo menos 1.'),
];

// --- GROUP ROUTES ---
router.get('/groups', authMiddleware, tenantMiddleware, getAllGroups);
router.get('/groups/:id', authMiddleware, tenantMiddleware, getOneGroup);
router.post('/groups', authMiddleware, tenantMiddleware, subscriptionMiddleware, groupValidation, createGroup);
router.put('/groups/reorder', authMiddleware, tenantMiddleware, subscriptionMiddleware, reorderGroups);
router.put('/groups/:id', authMiddleware, tenantMiddleware, subscriptionMiddleware, groupValidation, updateGroup);
router.delete('/groups/:id', authMiddleware, tenantMiddleware, subscriptionMiddleware, removeGroup);

// --- ITEM ROUTES ---
router.get('/groups/:groupId/items', authMiddleware, tenantMiddleware, getItems);
router.post('/items', authMiddleware, tenantMiddleware, subscriptionMiddleware, itemValidation, createItem);
router.put('/items/reorder', authMiddleware, tenantMiddleware, subscriptionMiddleware, reorderItems);
router.put('/items/:id', authMiddleware, tenantMiddleware, subscriptionMiddleware, itemValidation, updateItem);
router.delete('/items/:id', authMiddleware, tenantMiddleware, subscriptionMiddleware, removeItem);

module.exports = router;
