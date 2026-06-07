const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const subscriptionMiddleware = require('../middlewares/subscriptionMiddleware');
const { getAll, create, update, deleteUser } = require('../controllers/user.controller');

// Todas as rotas de gerenciamento de equipe requerem login e perfil de proprietário (dono)
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(subscriptionMiddleware);
router.use(roleMiddleware('dono'));

// Validações para cadastro
const createValidation = [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório.'),
  body('email').trim().isEmail().withMessage('E-mail inválido.'),
  body('password').isLength({ min: 6 }).withMessage('A senha deve conter no mínimo 6 caracteres.'),
  body('phone').optional().trim(),
  body('role').isIn(['gerente', 'atendente', 'cozinha', 'entregador']).withMessage('Perfil de acesso inválido.'),
  body('status').optional().isIn(['active', 'inactive', 'blocked']).withMessage('Status inválido.')
];

// Validações para atualização
const updateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Nome não pode ser vazio.'),
  body('email').optional().trim().isEmail().withMessage('E-mail inválido.'),
  body('password').optional().isLength({ min: 6 }).withMessage('A senha deve conter no mínimo 6 caracteres.'),
  body('phone').optional().trim(),
  body('role').optional().isIn(['gerente', 'atendente', 'cozinha', 'entregador']).withMessage('Perfil de acesso inválido.'),
  body('status').optional().isIn(['active', 'inactive', 'blocked']).withMessage('Status inválido.')
];

// GET /api/v1/users
router.get('/', getAll);

// POST /api/v1/users
router.post('/', createValidation, create);

// PUT /api/v1/users/:id
router.put('/:id', updateValidation, update);

// DELETE /api/v1/users/:id
router.delete('/:id', deleteUser);

module.exports = router;
