const express = require('express');
const router = express.Router();
const {
  getRestaurantBySlug,
  getRestaurantMenu,
  createPublicOrder,
  getPublicOrder,
  getPublicMessages,
  sendPublicMessage
} = require('../controllers/public.controller');

// GET /api/v1/public/restaurant/:slug
router.get('/restaurant/:slug', getRestaurantBySlug);

// GET /api/v1/public/restaurant/:slug/menu
router.get('/restaurant/:slug/menu', getRestaurantMenu);

// POST /api/v1/public/restaurant/:slug/orders
router.post('/restaurant/:slug/orders', createPublicOrder);

// GET /api/v1/public/restaurant/:slug/orders/:id
router.get('/restaurant/:slug/orders/:id', getPublicOrder);

// GET /api/v1/public/restaurant/:slug/orders/:id/messages
router.get('/restaurant/:slug/orders/:id/messages', getPublicMessages);

// POST /api/v1/public/restaurant/:slug/orders/:id/messages
router.post('/restaurant/:slug/orders/:id/messages', sendPublicMessage);

module.exports = router;
