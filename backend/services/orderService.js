const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

/**
 * Generate the next sequential order number (e.g., ORD-1001, ORD-1002)
 */
async function getNextOrderNumber() {
  // Find the most recently created order with ORD- prefix
  const lastOrder = await Order.findOne({ 
    orderNumber: { $regex: /^ORD-\d+$/ } 
  }).sort({ createdAt: -1 });

  let nextNum = 1001;

  if (lastOrder && lastOrder.orderNumber) {
    const match = lastOrder.orderNumber.match(/^ORD-(\d+)$/);
    if (match) {
      const parsedNum = parseInt(match[1], 10);
      if (!isNaN(parsedNum)) {
        nextNum = parsedNum + 1;
      }
    }
  } else {
    // If no regex match, fallback to count
    const count = await Order.countDocuments();
    nextNum = 1001 + count;
  }

  // Ensure uniqueness in case of gaps or manual entries
  let candidate = `ORD-${nextNum}`;
  let exists = await Order.exists({ orderNumber: candidate });
  while (exists) {
    nextNum++;
    candidate = `ORD-${nextNum}`;
    exists = await Order.exists({ orderNumber: candidate });
  }

  return candidate;
}

/**
 * Validate and process an incoming order
 * - Validates item presence and structure
 * - Rechecks availability in database
 * - Calculates prices and total from database prices
 * - Stores snapshot of item details
 */
async function createOrder(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    const err = new Error('Order must contain at least one item.');
    err.code = 'VALIDATION_ERROR';
    err.statusCode = 400;
    throw err;
  }

  let calculatedTotal = 0;
  const itemSnapshots = [];

  for (const ordered of items) {
    if (!ordered || !ordered.itemId) {
      const err = new Error('Each item must contain an itemId.');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(ordered.itemId)) {
      const err = new Error(`Invalid menu item ID format: "${ordered.itemId}".`);
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const quantity = parseInt(ordered.quantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      const err = new Error(`Quantity for item "${ordered.itemId}" must be a positive integer.`);
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const menuItem = await MenuItem.findById(ordered.itemId);
    if (!menuItem) {
      const err = new Error(`Menu item with ID "${ordered.itemId}" was not found.`);
      err.code = 'ITEM_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Strict rule: Unavailable item cannot be added to a new order
    if (!menuItem.available) {
      const err = new Error(`Item "${menuItem.name}" is currently unavailable.`);
      err.code = 'ITEM_UNAVAILABLE';
      err.statusCode = 409;
      throw err;
    }

    const subtotal = menuItem.price * quantity;
    calculatedTotal += subtotal;

    itemSnapshots.push({
      itemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      subtotal
    });
  }

  // Attempt save with collision retry
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const orderNumber = await getNextOrderNumber();
      const order = new Order({
        orderNumber,
        items: itemSnapshots,
        total: calculatedTotal,
        status: 'New'
      });

      const saved = await order.save();
      return saved;
    } catch (saveErr) {
      if (saveErr.code === 11000 && attempts < maxAttempts) {
        // Duplicate orderNumber collision, retry next sequence
        continue;
      }
      throw saveErr;
    }
  }

  throw new Error('Failed to generate a unique order number after multiple attempts.');
}

module.exports = {
  getNextOrderNumber,
  createOrder
};
