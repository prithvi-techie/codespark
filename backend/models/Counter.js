const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 99
  }
}, { versionKey: false });

module.exports = mongoose.model('Counter', counterSchema);
