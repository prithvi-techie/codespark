const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Item name is required'], 
    trim: true 
  },
  description: { 
    type: String, 
    default: '',
    trim: true
  },
  price: { 
    type: Number, 
    required: [true, 'Item price is required'], 
    min: [0, 'Price must be non-negative'] 
  },
  category: {
    type: String,
    default: 'Snacks',
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  available: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);