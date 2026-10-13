const mongoose = require('mongoose');
require('dotenv').config();
const MenuItem = require('./models/MenuItem');
const { connectDB } = require('./config/db');

const initialItems = [
  { 
    name: 'Veg Sandwich', 
    description: 'Fresh vegetable sandwich with mint chutney', 
    price: 50, 
    available: true 
  },
  { 
    name: 'Masala Dosa', 
    description: 'Crispy dosa with potato filling and sambar', 
    price: 80, 
    available: true 
  },
  { 
    name: 'Cold Coffee', 
    description: 'Chilled blended coffee with chocolate syrup', 
    price: 60, 
    available: true 
  },
  { 
    name: 'Veg Momos (8 pcs)', 
    description: 'Steamed dumplings served with spicy dip', 
    price: 70, 
    available: false 
  }
];

async function seedInitialDataIfNeeded() {
  const count = await MenuItem.countDocuments();
  if (count === 0) {
    console.log('Seeding initial canteen menu items...');
    await MenuItem.insertMany(initialItems);
    console.log(` Inserted ${initialItems.length} default menu items.`);
  }
}

async function runSeed() {
  try {
    await connectDB();
    console.log('Clearing existing menu items...');
    await MenuItem.deleteMany({});
    await MenuItem.insertMany(initialItems);
    console.log(` Successfully seeded ${initialItems.length} menu items.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = { initialItems, seedInitialDataIfNeeded };