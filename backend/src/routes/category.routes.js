const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const subscriptionMiddleware = require('../middlewares/subscriptionMiddleware');
const { checkOwnership } = tenantMiddleware;
const {
  getAll, getOne, create, update, remove, reorder, uploadImage
} = require('../controllers/category.controller');

// ─── Multer Config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../..', process.env.UPLOAD_DIR || 'uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `category-${req.user.restaurant_id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Apenas imagens JPG, PNG e WebP são permitidas.'));
  },
});

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

// POST /api/v1/categories/:id/image
router.post('/:id/image', authMiddleware, tenantMiddleware, checkOwnership('categories'), subscriptionMiddleware, upload.single('image'), uploadImage);

// DELETE /api/v1/categories/:id
router.delete('/:id', authMiddleware, tenantMiddleware, checkOwnership('categories'), subscriptionMiddleware, remove);

module.exports = router;
