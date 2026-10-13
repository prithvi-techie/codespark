const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MenuItem', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  subtotal: { 
    type: Number, 
    required: true, 
    min: 0 
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: [val => val.length > 0, 'Order must contain at least one item']
  },
  total: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  status: { 
    type: String, 
    enum: ['New', 'Preparing', 'Ready', 'Collected'], 
    default: 'New',
    index: true
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      if (Array.isArray(ret.items)) {
        ret.items = ret.items.map(item => ({
          itemId: item.itemId ? item.itemId.toString() : item.itemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal
        }));
      }
      return ret;
    }
  }
});

module.exports = mongoose.model('Order', orderSchema);