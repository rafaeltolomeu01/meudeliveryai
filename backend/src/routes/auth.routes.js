const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  register, login, me, changePassword, refreshToken,
} = require('../controllers/auth.controller');

// Rate limit específico para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Muitas tentativas. Aguarde 15 minutos.' },
});

// ─── Validações ───────────────────────────────────────────────────────────────
const registerValidation = [
  body('restaurant_name').notEmpty().withMessage('Nome do restaurante é obrigatório.').trim(),
  body('name').notEmpty().withMessage('Seu nome é obrigatório.').trim(),
  body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres.'),
  body('whatsapp').notEmpty().withMessage('WhatsApp é obrigatório.').trim(),
];

const loginValidation = [
  body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail(),
  body('password').notEmpty().withMessage('Senha é obrigatória.'),
];

const changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Senha atual é obrigatória.'),
  body('new_password').isLength({ min: 6 }).withMessage('Nova senha deve ter no mínimo 6 caracteres.'),
];

// ─── Rotas ────────────────────────────────────────────────────────────────────

// POST /api/v1/auth/register
router.post('/register', authLimiter, registerValidation, register);

// POST /api/v1/auth/login
router.post('/login', authLimiter, loginValidation, login);

// GET /api/v1/auth/me
router.get('/me', authMiddleware, me);

// PUT /api/v1/auth/change-password
router.put('/change-password', authMiddleware, changePasswordValidation, changePassword);

// POST /api/v1/auth/refresh
router.post('/refresh', authMiddleware, refreshToken);

module.exports = router;
