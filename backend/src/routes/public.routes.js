const express = require('express');
const router = express.Router();
const customerAuth = require('../middlewares/customerAuthMiddleware');
const {
  getRestaurantBySlug,
  getRestaurantMenu,
  createPublicOrder,
  getPublicOrder,
  getPublicMessages,
  sendPublicMessage,
  customerRegister,
  customerLogin,
  customerMe,
  getCustomerOrders,
  getCustomerAddresses,
  addCustomerAddress,
  deleteCustomerAddress
} = require('../controllers/public.controller');

// GET /api/v1/public/restaurant/:slug
router.get('/restaurant/:slug', getRestaurantBySlug);

// GET /api/v1/public/restaurant/:slug/menu
router.get('/restaurant/:slug/menu', getRestaurantMenu);

// POST /api/v1/public/restaurant/:slug/orders — Requer Autenticação do Cliente
router.post('/restaurant/:slug/orders', customerAuth, createPublicOrder);

// GET /api/v1/public/restaurant/:slug/orders/:id
router.get('/restaurant/:slug/orders/:id', getPublicOrder);

// GET /api/v1/public/restaurant/:slug/orders/:id/messages
router.get('/restaurant/:slug/orders/:id/messages', getPublicMessages);

// POST /api/v1/public/restaurant/:slug/orders/:id/messages
router.post('/restaurant/:slug/orders/:id/messages', sendPublicMessage);

// --- CUSTOMER AUTHENTICATION ---
router.post('/restaurant/:slug/auth/register', customerRegister);
router.post('/restaurant/:slug/auth/login', customerLogin);
router.get('/restaurant/:slug/auth/me', customerAuth, customerMe);

// --- CUSTOMER PROFILE & INFO ---
router.get('/restaurant/:slug/customer/orders', customerAuth, getCustomerOrders);
router.get('/restaurant/:slug/customer/addresses', customerAuth, getCustomerAddresses);
router.post('/restaurant/:slug/customer/addresses', customerAuth, addCustomerAddress);
router.delete('/restaurant/:slug/customer/addresses/:id', customerAuth, deleteCustomerAddress);

module.exports = router;
