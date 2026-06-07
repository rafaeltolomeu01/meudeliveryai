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
  getAll, getOne, create, update, remove, toggleAvailability, getFeatured, uploadImage
} = require('../controllers/product.controller');

// ─── Multer Config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../..', process.env.UPLOAD_DIR || 'uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${req.user.restaurant_id}-${Date.now()}${ext}`);
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
  body('name').notEmpty().withMessage('Nome do produto é obrigatório.').trim(),
  body('price').isFloat({ gt: 0 }).withMessage('Preço deve ser maior que zero.'),
  body('category_id').notEmpty().isInt().withMessage('Categoria é obrigatória.'),
  body('promotional_price').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Preço promocional inválido.'),
  body('is_available').optional().isBoolean(),
  body('is_featured').optional().isBoolean(),
];

const updateValidation = [
  body('name').optional().notEmpty().withMessage('Nome não pode ser vazio.').trim(),
  body('price').optional().isFloat({ gt: 0 }).withMessage('Preço deve ser maior que zero.'),
  body('category_id').optional().isInt().withMessage('Categoria inválida.'),
  body('promotional_price').optional({ nullable: true }).isFloat({ min: 0 }),
];

// ─── Rotas ────────────────────────────────────────────────────────────────────

// GET /api/v1/products/featured  (deve vir ANTES de /:id)
router.get('/featured', authMiddleware, tenantMiddleware, getFeatured);

// GET /api/v1/products
router.get('/', authMiddleware, tenantMiddleware, getAll);

// GET /api/v1/products/:id
router.get('/:id', authMiddleware, tenantMiddleware, checkOwnership('products'), getOne);

// POST /api/v1/products
router.post('/', authMiddleware, tenantMiddleware, subscriptionMiddleware, createValidation, create);

// PUT /api/v1/products/:id
router.put('/:id', authMiddleware, tenantMiddleware, checkOwnership('products'), subscriptionMiddleware, updateValidation, update);

// POST /api/v1/products/:id/image
router.post('/:id/image', authMiddleware, tenantMiddleware, checkOwnership('products'), subscriptionMiddleware, upload.single('image'), uploadImage);

// DELETE /api/v1/products/:id
router.delete('/:id', authMiddleware, tenantMiddleware, checkOwnership('products'), subscriptionMiddleware, remove);

// PATCH /api/v1/products/:id/toggle
router.patch('/:id/toggle', authMiddleware, tenantMiddleware, checkOwnership('products'), subscriptionMiddleware, toggleAvailability);

module.exports = router;
