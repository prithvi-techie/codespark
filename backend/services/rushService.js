const Order = require('../models/Order');

/**
 * Calculate Rush Level according to exact project rules:
 * - Low: 0–4 active orders
 * - Medium: 5–9 active orders
 * - High: 10 or more active orders
 *
 * Active orders: New, Preparing, Ready (Collected orders excluded).
 */
function calculateRushLevel(activeCount) {
  if (typeof activeCount !== 'number' || activeCount < 0) {
    return 'Low';
  }
  if (activeCount >= 10) {
    return 'High';
  }
  if (activeCount >= 5) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Fetch active orders and calculate rush metrics
 */
async function getActiveOrdersAndRush() {
  const activeOrders = await Order.find({ 
    status: { $ne: 'Collected' } 
  }).sort({ createdAt: 1 });

  const activeCount = activeOrders.length;
  const rushLevel = calculateRushLevel(activeCount);

  return {
    orders: activeOrders.map(o => ({
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      items: o.items.map(item => ({
        itemId: item.itemId.toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal
      })),
      createdAt: o.createdAt
    })),
    activeCount,
    rushLevel
  };
}

module.exports = {
  calculateRushLevel,
  getActiveOrdersAndRush
};
