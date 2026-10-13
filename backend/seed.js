const mongoose = require('mongoose');
require('dotenv').config();
const MenuItem = require('./models/MenuItem');
const { connectDB } = require('./config/db');

const initialItems = [
  {
    name: "Veg Grilled Sandwich",
    description: "Crispy grilled bread packed with garden fresh veggies and house herbs",
    price: 50,
    available: true,
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Paneer Cheese Burger",
    description: "Tender spiced paneer patty with cheddar cheese and fresh lettuce",
    price: 85,
    available: true,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Masala Dosa",
    description: "Golden crispy crepe filled with tempered spiced potato smash & coconut chutney",
    price: 60,
    available: true,
    category: "South Indian",
    image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Cold Coffee Shake",
    description: "Thick chilled brewed espresso blend with rich cream and chocolate drizzle",
    price: 45,
    available: true,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Samosa Chaat",
    description: "Two crushed crisp samosas topped with tangy chole, curd and mint chutney",
    price: 40,
    available: false, // Intentionally marked unavailable for availability testing
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Hakka Noodles",
    description: "Wok-tossed noodles with shredded cabbage, bell peppers and spring onions",
    price: 75,
    available: true,
    category: "Chinese",
    image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60"
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