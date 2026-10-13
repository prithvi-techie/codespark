const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');
const canteenRoutes = require('./routes/canteen');
const errorHandler = require('./middleware/errorHandler');
const { seedInitialDataIfNeeded } = require('./seed');

const app = express();

// Body Parser & Request Limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS configuration (allow local frontend dev servers e.g. 5500, 3000, 5173, etc.)
const allowedOrigins = process.env.CLIENT_ORIGIN 
  ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy blocked access from this origin.'));
    }
  },
  credentials: true
}));

// Root Health & Information Endpoints
app.get('/', (req, res) => {
  res.json({
    name: 'Smart Canteen Order & Rush Tracker API',
    team: 'CodeSpark',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      menu: '/api/menu',
      orders: '/api/orders',
      activeOrders: '/api/staff/orders/active',
      dashboard: '/api/dashboard'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount canteen API routes
app.use('/api', canteenRoutes);

// Catch-all 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'ORDER_NOT_FOUND',
      message: `API endpoint "${req.originalUrl}" not found.`
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await seedInitialDataIfNeeded();

    const server = app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(` Smart Canteen Backend Server Running!`);
      console.log(` Port: ${PORT}`);
      console.log(` Base URL: http://localhost:${PORT}/api`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=========================================`);
    });

    return server;
  } catch (err) {
    console.error('Fatal: Server startup failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };