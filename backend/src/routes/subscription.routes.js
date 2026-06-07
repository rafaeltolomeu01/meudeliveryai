const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const { get, renew, upgrade } = require('../controllers/subscription.controller');

// Todas as rotas de assinatura requerem login, tenant e perfil de gestão (gerente, dono ou admin)
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(roleMiddleware('admin_geral', 'dono', 'gerente'));

router.get('/', get);
router.post('/renew', renew);
router.post('/upgrade', upgrade);

module.exports = router;
