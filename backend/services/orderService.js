const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Counter = require('../models/Counter');

/**
 * Format day and month as DD-MM (e.g. 13-10 for 13th October)
 */
function getDDMM(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}`;
}

/**
 * Generate the next sequential order ID (e.g., 13-10/1000, 13-10/1001, 13-10/1002)
 * Concurrency-safe atomic increment via MongoDB findOneAndUpdate.
 * Starts from 1000 and increments by 1 sequentially.
 */
async function getNextOrderNumber(date = new Date()) {
  const ddmm = getDDMM(date);

  // Atomically increment the sequence counter.
  // Initial sequence counter starts at 1000 on first order.
  const counter = await Counter.findOneAndUpdate(
    { _id: 'order_id_seq' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  let seqNum = counter.seq;
  // Ensure seqNum is at least 1000.
  if (seqNum < 1000) {
    const updated = await Counter.findOneAndUpdate(
      { _id: 'order_id_seq' },
      { $set: { seq: 1000 } },
      { new: true }
    );
    seqNum = updated.seq;
  }

  let candidate = `${ddmm}/${seqNum}`;

  // Extra safety guard in case candidate was inserted manually or previously exists
  let exists = await Order.exists({ orderNumber: candidate });
  while (exists) {
    const bumped = await Counter.findOneAndUpdate(
      { _id: 'order_id_seq' },
      { $inc: { seq: 1 } },
      { new: true }
    );
    candidate = `${ddmm}/${bumped.seq}`;
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

    const rawQuantity = ordered.quantity;
    if (
      rawQuantity === undefined ||
      rawQuantity === null ||
      typeof rawQuantity === 'boolean' ||
      typeof rawQuantity === 'object' ||
      isNaN(Number(rawQuantity)) ||
      !Number.isInteger(Number(rawQuantity))
    ) {
      const err = new Error(`Quantity for item "${ordered.itemId}" must be a valid positive integer.`);
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const quantity = Number(rawQuantity);
    if (quantity < 1) {
      const err = new Error(`Quantity for item "${ordered.itemId}" must be a positive integer.`);
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }

    const MAX_ITEM_QUANTITY = 50;
    if (quantity > MAX_ITEM_QUANTITY) {
      const err = new Error(`Quantity for item "${ordered.itemId}" cannot exceed ${MAX_ITEM_QUANTITY} per order.`);
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
