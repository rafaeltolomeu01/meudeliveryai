const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  listRestaurants,
  getRestaurantDetails,
  updateRestaurantStatus,
  updateSubscription,
  listPlans
} = require('../controllers/admin.controller');

// Todas as rotas de super admin exigem autenticação e cargo de admin_geral
router.use(authMiddleware);
router.use(roleMiddleware('admin_geral'));

router.get('/restaurants', listRestaurants);
router.get('/restaurants/:id', getRestaurantDetails);
router.patch('/restaurants/:id/status', updateRestaurantStatus);
router.put('/restaurants/:id/subscription', updateSubscription);
router.get('/plans', listPlans);

module.exports = router;
