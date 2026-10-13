const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const rushService = require('../services/rushService');

/**
 * POST /api/staff/login
 * Staff authentication endpoint
 */
async function login(req, res) {
  const { passcode } = req.body;
  const expectedPasscode = process.env.STAFF_PASSCODE || 'staff123';
  const staffSecret = process.env.STAFF_AUTH_SECRET || 'codespark-staff-secret-2026';

  if (!passcode || passcode !== expectedPasscode) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid staff passcode. Please check credentials.'
      }
    });
  }

  res.json({
    message: 'Staff authenticated successfully',
    token: staffSecret
  });
}

/**
 * POST /api/staff/demo/seed-rush
 * Helper for live presentation & testing: Seed active orders to hit specific rush thresholds:
 * - 0-4 => Low
 * - 5-9 => Medium
 * - 10+ => High
 */
async function seedRushDemo(req, res, next) {
  try {
    const { count, preset } = req.body;
    let targetCount = 5;

    if (preset === 'Low') targetCount = 3;
    else if (preset === 'Medium') targetCount = 6;
    else if (preset === 'High') targetCount = 10;
    else if (typeof count === 'number') targetCount = Math.max(0, count);

    // Get an available menu item to reference
    let sampleItem = await MenuItem.findOne({ available: true });
    if (!sampleItem) {
      sampleItem = await MenuItem.create({
        name: 'Veg Sandwich',
        description: 'Fresh sandwich',
        price: 50,
        available: true
      });
    }

    // Delete existing active orders to set exact target
    await Order.deleteMany({ status: { $ne: 'Collected' } });

    const createdOrders = [];
    for (let i = 1; i <= targetCount; i++) {
      const orderNumber = `ORD-${2000 + i}`;
      const statuses = ['New', 'Preparing', 'Ready'];
      const status = statuses[i % statuses.length];

      createdOrders.push({
        orderNumber,
        items: [{
          itemId: sampleItem._id,
          name: sampleItem.name,
          price: sampleItem.price,
          quantity: 1,
          subtotal: sampleItem.price
        }],
        total: sampleItem.price,
        status
      });
    }

    if (createdOrders.length > 0) {
      await Order.insertMany(createdOrders);
    }

    const rushSummary = await rushService.getActiveOrdersAndRush();

    res.json({
      message: `Seeded ${targetCount} active orders for demo testing`,
      targetCount,
      rushLevel: rushSummary.rushLevel,
      activeCount: rushSummary.activeCount
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/staff/demo/reset
 * Helper to reset orders and reload default menu
 */
async function resetDemo(req, res, next) {
  try {
    await Order.deleteMany({});
    await MenuItem.deleteMany({});

    const initialItems = [
      { name: 'Veg Sandwich', description: 'Fresh vegetable sandwich with mint chutney', price: 50, available: true },
      { name: 'Masala Dosa', description: 'Crispy dosa with potato filling and sambar', price: 80, available: true },
      { name: 'Cold Coffee', description: 'Chilled blended coffee with chocolate syrup', price: 60, available: true },
      { name: 'Veg Momos (8 pcs)', description: 'Steamed dumplings served with spicy dip', price: 70, available: false }
    ];

    await MenuItem.insertMany(initialItems);

    res.json({
      message: 'Demo environment reset successfully. Orders cleared and default menu loaded.',
      itemsCount: initialItems.length,
      ordersCount: 0
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  seedRushDemo,
  resetDemo
};
