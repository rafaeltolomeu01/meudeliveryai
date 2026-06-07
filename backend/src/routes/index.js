const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const restaurantRoutes = require('./restaurant.routes');
const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const orderRoutes = require('./order.routes');
const customerRoutes = require('./customer.routes');
const driverRoutes = require('./driver.routes');
const reportRoutes = require('./report.routes');
const settingsRoutes = require('./settings.routes');
const publicRoutes = require('./public.routes');
const userRoutes = require('./user.routes');
const subscriptionRoutes = require('./subscription.routes');
const adminRoutes = require('./admin.routes');
const whatsappRoutes = require('./whatsapp.routes');

// ─── Montar Rotas ─────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/restaurant', restaurantRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);
router.use('/drivers', driverRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/public', publicRoutes);
router.use('/users', userRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/admin', adminRoutes);
router.use('/whatsapp', whatsappRoutes);

module.exports = router;
