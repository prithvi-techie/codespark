const express = require('express');
const router = express.Router();

const menuController = require('../controllers/menuController');
const orderController = require('../controllers/orderController');
const staffController = require('../controllers/staffController');
const { staffAuth } = require('../middleware/auth');

// ==========================================
// 1. PUBLIC MENU ENDPOINTS
// ==========================================

// GET /api/menu - List all menu items with name, price, availability
router.get('/menu', menuController.getMenu);

// ==========================================
// 2. PUBLIC ORDER ENDPOINTS
// ==========================================

// POST /api/orders - Place a new order
router.post('/orders', orderController.placeOrder);

// GET /api/orders/:orderNumber - Track an order
router.get('/orders/:orderNumber', orderController.getOrder);

// Public / shared dashboard shortcut (Project Guide page 4)
router.get('/dashboard', orderController.getActiveOrders);

// ==========================================
// 3. STAFF AUTHENTICATION
// ==========================================

// POST /api/staff/login - Staff login to retrieve auth token
router.post('/staff/login', staffController.login);

// ==========================================
// 4. PROTECTED STAFF OPERATIONS
// ==========================================

// GET /api/staff/orders/active - List active orders and current rush level (API_CONTRACT)
router.get('/staff/orders/active', staffAuth, orderController.getActiveOrders);

// Alias: GET /api/staff/dashboard
router.get('/staff/dashboard', staffAuth, orderController.getActiveOrders);

// PATCH /api/staff/orders/:orderNumber/status - Update order status (New, Preparing, Ready, Collected)
router.patch('/staff/orders/:orderNumber/status', staffAuth, orderController.updateOrderStatus);

// Alias: PATCH /api/orders/:orderNumber/status (supports both staff and un-prefixed paths)
router.patch('/orders/:orderNumber/status', staffAuth, orderController.updateOrderStatus);

// PATCH /api/staff/menu/:itemId/availability - Mark menu item available/unavailable
router.patch('/staff/menu/:itemId/availability', staffAuth, menuController.updateAvailability);

// Alias: PATCH /api/menu/:itemId/availability
router.patch('/menu/:itemId/availability', staffAuth, menuController.updateAvailability);

// POST /api/staff/menu - Create new menu item
router.post('/staff/menu', staffAuth, menuController.createMenuItem);

// ==========================================
// 5. DEMO & TESTING UTILITIES FOR PRESENTATION
// ==========================================

// POST /api/staff/demo/seed-rush - Quickly seed active orders to demonstrate rush thresholds (0, 4, 5, 9, 10)
router.post('/staff/demo/seed-rush', staffAuth, staffController.seedRushDemo);

// POST /api/staff/demo/reset - Reset canteen orders and re-seed default menu
router.post('/staff/demo/reset', staffAuth, staffController.resetDemo);

module.exports = router;