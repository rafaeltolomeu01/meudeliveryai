const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const {
  getMyRestaurant, updateRestaurant, uploadLogo, uploadCover, deleteRestaurant,
} = require('../controllers/restaurant.controller');

// ─── Multer Config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../..', process.env.UPLOAD_DIR || 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `restaurant-${req.user.restaurant_id}-${Date.now()}${ext}`);
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
const updateValidation = [
  body('name').optional().notEmpty().withMessage('Nome não pode ser vazio.').trim(),
  body('email').optional().isEmail().withMessage('E-mail inválido.'),
  body('phone').optional().trim(),
];

// ─── Rotas ────────────────────────────────────────────────────────────────────

// GET /api/v1/restaurant
router.get('/', authMiddleware, tenantMiddleware, getMyRestaurant);

// PUT /api/v1/restaurant
router.put('/', authMiddleware, tenantMiddleware, roleMiddleware('admin_geral', 'dono', 'gerente'), updateValidation, updateRestaurant);

// POST /api/v1/restaurant/logo
router.post('/logo', authMiddleware, tenantMiddleware, roleMiddleware('admin_geral', 'dono', 'gerente'), upload.single('logo'), uploadLogo);

// POST /api/v1/restaurant/cover
router.post('/cover', authMiddleware, tenantMiddleware, roleMiddleware('admin_geral', 'dono', 'gerente'), upload.single('cover'), uploadCover);

// DELETE /api/v1/restaurant
router.delete('/', authMiddleware, tenantMiddleware, roleMiddleware('admin_geral', 'dono'), deleteRestaurant);

module.exports = router;
