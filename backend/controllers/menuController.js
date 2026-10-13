const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');

/**
 * GET /api/menu
 * Return list of all menu items with name, price, availability
 */
async function getMenu(req, res, next) {
  try {
    const items = await MenuItem.find({}).sort({ createdAt: 1 });
    const formatted = items.map(item => ({
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      price: item.price,
      available: item.available
    }));

    res.json({ items: formatted });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/staff/menu/:itemId/availability
 * Update menu item availability (Available / Unavailable)
 */
async function updateAvailability(req, res, next) {
  try {
    const { itemId } = req.params;
    const { available } = req.body;

    if (typeof available !== 'boolean') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The "available" field must be a boolean (true or false).'
        }
      });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid menu item ID: "${itemId}".`
        }
      });
    }

    const item = await MenuItem.findByIdAndUpdate(
      itemId,
      { available },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Menu item not found.'
        }
      });
    }

    res.json({
      item: {
        id: item._id.toString(),
        name: item.name,
        available: item.available
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/staff/menu (Helper to add menu items)
 */
async function createMenuItem(req, res, next) {
  try {
    const { name, description, price, available } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Item name is required.'
        }
      });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Item price must be a non-negative number.'
        }
      });
    }

    const item = new MenuItem({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: numPrice,
      available: typeof available === 'boolean' ? available : true
    });

    await item.save();

    res.status(201).json({
      item: {
        id: item._id.toString(),
        name: item.name,
        description: item.description,
        price: item.price,
        available: item.available
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMenu,
  updateAvailability,
  createMenuItem
};
