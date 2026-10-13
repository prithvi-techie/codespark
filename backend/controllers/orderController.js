const mongoose = require('mongoose');
const Order = require('../models/Order');
const orderService = require('../services/orderService');
const rushService = require('../services/rushService');

/**
 * POST /api/orders
 * Place a new order with validation, availability check, and server-side pricing
 */
async function placeOrder(req, res, next) {
  try {
    const { items } = req.body;
    const order = await orderService.createOrder(items);

    res.status(201).json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items.map(i => ({
          itemId: i.itemId.toString(),
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          subtotal: i.subtotal
        })),
        total: order.total
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:orderNumber
 * Track order details and status
 */
async function getOrder(req, res, next) {
  try {
    const { orderNumber } = req.params;

    // Search by human orderNumber (e.g. ORD-1001) or ObjectId if provided
    let query = { orderNumber };
    if (mongoose.Types.ObjectId.isValid(orderNumber)) {
      query = { $or: [{ orderNumber }, { _id: orderNumber }] };
    }

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order "${orderNumber}" not found.`
        }
      });
    }

    res.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        items: order.items.map(i => ({
          itemId: i.itemId.toString(),
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          subtotal: i.subtotal
        })),
        createdAt: order.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/staff/orders/active
 * GET /api/dashboard
 * Return active orders and calculated rush level
 */
async function getActiveOrders(req, res, next) {
  try {
    const result = await rushService.getActiveOrdersAndRush();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/staff/orders/:orderNumber/status
 * PATCH /api/orders/:orderNumber/status
 * Update order lifecycle status: New -> Preparing -> Ready -> Collected
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { orderNumber } = req.params;
    const { status } = req.body;

    const validStatuses = ['New', 'Preparing', 'Ready', 'Collected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`
        }
      });
    }

    let query = { orderNumber };
    if (mongoose.Types.ObjectId.isValid(orderNumber)) {
      query = { $or: [{ orderNumber }, { _id: orderNumber }] };
    }

    const order = await Order.findOneAndUpdate(
      query,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order "${orderNumber}" not found.`
        }
      });
    }

    res.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  placeOrder,
  getOrder,
  getActiveOrders,
  updateOrderStatus
};
