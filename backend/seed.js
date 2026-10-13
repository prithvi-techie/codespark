const mongoose = require('mongoose');
require('dotenv').config();
const MenuItem = require('./models/MenuItem');
const { connectDB } = require('./config/db');

const initialItems = [
  // 1. Snacks
  {
    name: "Veg Sandwich",
    description: "Fresh vegetable sandwich with cucumber, tomatoes, and green mint chutney",
    price: 50,
    available: true,
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "French Fries",
    description: "Golden crispy salted potato fries served with tangy tomato ketchup",
    price: 60,
    available: true,
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Samosa (2 pcs)",
    description: "Two crispy golden pastry parcels stuffed with spiced potatoes and peas",
    price: 30,
    available: true,
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Paneer Tikka Sandwich",
    description: "Toasted sandwich loaded with marinated grilled paneer cubes and melted cheese",
    price: 80,
    available: true,
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=500&auto=format&fit=crop&q=60"
  },

  // 2. Burgers
  {
    name: "Aloo Tikki Burger",
    description: "Crispy seasoned spiced potato patty with sliced onions, tomato and herb mayo",
    price: 50,
    available: true,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Cheese Burger",
    description: "Grilled patty topped with melted cheddar cheese slice, fresh lettuce and pickles",
    price: 80,
    available: true,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Double Patty Burger",
    description: "Double stacked patties layered with dual melted cheese and signature burger relish",
    price: 110,
    available: true,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=60"
  },

  // 3. South Indian
  {
    name: "Plain Dosa",
    description: "Traditional golden crispy rice and lentil crepe served with sambar and coconut chutney",
    price: 60,
    available: true,
    category: "South Indian",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Idli Sambhar (2 pcs)",
    description: "Two soft steamed fluffy rice cakes served with aromatic piping-hot vegetable sambar",
    price: 40,
    available: true,
    category: "South Indian",
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Medu Vada (2 pcs)",
    description: "Crispy golden spiced urad dal fritters served with freshly ground coconut chutney",
    price: 50,
    available: true,
    category: "South Indian",
    image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Mysore Masala Dosa",
    description: "Crispy crepe coated with spicy red garlic paste and stuffed with rich potato bhaji",
    price: 90,
    available: true,
    category: "South Indian",
    image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=60"
  },

  // 4. Chinese
  {
    name: "Veg Hakka Noodles",
    description: "Wok-tossed noodles with crunchy julienned vegetables, spring onions and soy seasoning",
    price: 80,
    available: true,
    category: "Chinese",
    image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Schezwan Fried Rice",
    description: "Spicy wok-tossed basmati rice infused with fiery Schezwan sauce and fresh bell peppers",
    price: 90,
    available: true,
    category: "Chinese",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Chilli Paneer",
    description: "Battered paneer cubes tossed with capsicum, onions, green chillies and savory garlic sauce",
    price: 120,
    available: true,
    category: "Chinese",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=60"
  },

  // 5. Beverages
  {
    name: "Tea",
    description: "Hot brewed Indian masala chai flavored with crushed cardamom and fresh ginger",
    price: 15,
    available: true,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Cold Coffee",
    description: "Rich blended iced coffee topped with chocolate syrup and creamy froth",
    price: 60,
    available: true,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Mango Shake",
    description: "Luscious tropical shake crafted from sweet ripe mango pulp and chilled milk",
    price: 60,
    available: true,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Oreo Shake",
    description: "Thick creamy milkshake blended with crunchy Oreo cookies and dark chocolate sauce",
    price: 80,
    available: true,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Fresh Lime Soda",
    description: "Refreshing sparkling soda with fresh squeezed lemon juice, mint and rock salt",
    price: 35,
    available: true,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60"
  },

  // 6. Pizza & Pasta
  {
    name: "Margherita Pizza",
    description: "Classic Italian pizza crust topped with rich basil tomato sauce and melted mozzarella",
    price: 100,
    available: true,
    category: "Pizza & Pasta",
    image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Farmhouse Pizza",
    description: "Crisp hand-stretched pizza loaded with bell peppers, sweet corn, mushrooms and onions",
    price: 140,
    available: true,
    category: "Pizza & Pasta",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Red Sauce Pasta",
    description: "Penne pasta tossed in tangy Italian arrabbiata tomato sauce with herbs and parmesan",
    price: 90,
    available: true,
    category: "Pizza & Pasta",
    image: "https://images.unsplash.com/photo-1621996346565-e3d5d6281724?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Cheese Pasta",
    description: "Creamy Alfredo pasta simmered in rich cheese sauce with garlic and fresh herbs",
    price: 120,
    available: true,
    category: "Pizza & Pasta",
    image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=60"
  },

  // 7. Desserts
  {
    name: "Chocolate Brownie",
    description: "Warm fudgy chocolate brownie loaded with cocoa chunks and chocolate drizzle",
    price: 50,
    available: true,
    category: "Desserts",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Vanilla Ice Cream",
    description: "Two generous scoops of velvety smooth Madagascar vanilla bean ice cream",
    price: 40,
    available: true,
    category: "Desserts",
    image: "https://images.unsplash.com/photo-1560008581-09826d1de69e?w=500&auto=format&fit=crop&q=60"
  },
  {
    name: "Chocolate Pastry",
    description: "Decadent multi-layered chocolate sponge cake slice smothered in rich ganache",
    price: 50,
    available: false, // Marked unavailable for availability tests and zero-count safeguards
    category: "Desserts",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60"
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