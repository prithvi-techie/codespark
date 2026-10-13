const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Counter = require('../models/Counter');

/**
 * Format month and year as MMYY (e.g. 1026 for October 2026)
 */
function getMMYY(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}${year}`;
}

/**
 * Generate the next sequential order ID (e.g., 100/1026, 101/1026, 102/1026)
 * Concurrency-safe atomic increment via MongoDB findOneAndUpdate.
 * Starts from 100 and increments by 1 sequentially.
 */
async function getNextOrderNumber(date = new Date()) {
  const mmyy = getMMYY(date);

  // Atomically increment the sequence counter.
  // Initial sequence counter starts at 100 on first order.
  const counter = await Counter.findOneAndUpdate(
    { _id: 'order_id_seq' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  let seqNum = counter.seq;
  // If counter was newly created with default 99, $inc makes it 100.
  // Ensure seqNum is at least 100.
  if (seqNum < 100) {
    const updated = await Counter.findOneAndUpdate(
      { _id: 'order_id_seq' },
      { $set: { seq: 100 } },
      { new: true }
    );
    seqNum = updated.seq;
  }

  let candidate = `${seqNum}/${mmyy}`;

  // Extra safety guard in case candidate was inserted manually or previously exists
  let exists = await Order.exists({ orderNumber: candidate });
  while (exists) {
    const bumped = await Counter.findOneAndUpdate(
      { _id: 'order_id_seq' },
      { $inc: { seq: 1 } },
      { new: true }
    );
    candidate = `${bumped.seq}/${mmyy}`;
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
