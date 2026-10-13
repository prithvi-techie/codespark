# Backend Review & Frontend-Backend Integration Report
**Project:** Smart Canteen Order & Rush Tracker  
**Team:** CodeSpark  
**Inspection Date:** 2026-10-13  
**Status:** Inspection Only (No production modifications made)

---

## 1. Project Overview

The project is structured into three distinct layers across the repository:

1. **Student Frontend (`frontend/student-ui/`):**
   - Built with Vanilla HTML, CSS, and modern ES JavaScript modules.
   - Provides student customer features: browse food menu, filter categories, manage food tray (`Cart`), place orders, view unique order number confirmations, and track placed orders read-only through a 4-step progressive stepper (`New` ➔ `Preparing` ➔ `Ready` ➔ `Collected`).
   - Serves an informational rush indicator pill based on active canteen orders.
   - Configured with `frontend/student-ui/js/api.js` which currently acts as both a mock store and an HTTP adapter.

2. **Admin / Kitchen Frontend (`frontend/admin-ui/`):**
   - Built with the same CodeSpark design theme (`#f4773b` orange, Inter/Outfit typography, responsive card layouts).
   - Provides kitchen staff features: live active order queue, order status lifecycle management (`New` ➔ `Preparing` ➔ `Ready` ➔ `Collected`), food availability controls ("Food Available" / "Sold Out"), food addition modal with live image preview, and kitchen rush monitoring.
   - Directly imports and relies on `frontend/student-ui/js/api.js` for data access.

3. **Backend Service (`backend/`):**
   - Node.js & Express REST API using Mongoose for MongoDB.
   - Follows MVC architecture: routes (`routes/canteen.js`), controllers (`menuController.js`, `orderController.js`, `staffController.js`), models (`MenuItem.js`, `Order.js`), and business services (`orderService.js`, `rushService.js`).
   - Supports both remote MongoDB Atlas, local MongoDB (`mongodb://127.0.0.1:27017`), and an automated fallback to an embedded **In-Memory MongoDB** (`mongodb-memory-server`) with automatic menu seeding.
   - Implements authentication via `staffAuth` middleware using Bearer tokens.

---

## 2. Backend API Endpoints

The backend routes are mounted at `/api` in [`backend/server.js`](backend/server.js) from [`backend/routes/canteen.js`](backend/routes/canteen.js).

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Purpose | Request Body | Response Format | Auth |
|---|---|---|---|---|---|
| `GET` | `/` | API Root & Status | None | `{ name, team, version, status, endpoints }` | None |
| `GET` | `/api/health` | Service Healthcheck | None | `{ status: "ok", timestamp }` | None |
| `GET` | `/api/menu` | List all menu items | None | `{ items: [{ id, name, description, price, available }] }` | None |
| `POST` | `/api/orders` | Place a new order | `{ items: [{ itemId: string, quantity: number }] }` | `201 Created`: `{ order: { orderNumber, status, items: [...], total } }` | None |
| `GET` | `/api/orders/:orderNumber` | Track single order by orderNumber or ID | None | `{ order: { orderNumber, status, total, items: [...], createdAt } }` | None |
| `GET` | `/api/dashboard` | Public rush & active orders overview | None | `{ orders: [...], activeCount: number, rushLevel: "Low"\|"Medium"\|"High" }` | None |

### Staff Authentication Endpoint

| Method | Endpoint | Purpose | Request Body | Response Format | Auth |
|---|---|---|---|---|---|
| `POST` | `/api/staff/login` | Staff passcode login | `{ passcode: string }` | `{ message: string, token: string }` (HTTP 401 if invalid passcode) | None |

### Protected Staff Endpoints (Requires Staff Authentication)

Protected routes require `Authorization: Bearer <token>` or `X-Staff-Token: <token>`.

| Method | Endpoint | Purpose | Request Body | Response Format | Auth Required |
|---|---|---|---|---|---|
| `GET` | `/api/staff/orders/active` | Get active orders & rush level | None | `{ orders: [{ orderNumber, status, total, items, createdAt }], activeCount, rushLevel }` | **Yes (`staffAuth`)** |
| `GET` | `/api/staff/dashboard` | Alias for active orders | None | `{ orders: [...], activeCount, rushLevel }` | **Yes (`staffAuth`)** |
| `PATCH` | `/api/staff/orders/:orderNumber/status` | Update order status | `{ status: "New"\|"Preparing"\|"Ready"\|"Collected" }` | `{ order: { orderNumber, status } }` | **Yes (`staffAuth`)** |
| `PATCH` | `/api/orders/:orderNumber/status` | Alias for updating status | `{ status: "New"\|"Preparing"\|"Ready"\|"Collected" }` | `{ order: { orderNumber, status } }` | **Yes (`staffAuth`)** |
| `PATCH` | `/api/staff/menu/:itemId/availability` | Toggle item availability | `{ available: boolean }` | `{ item: { id, name, available } }` | **Yes (`staffAuth`)** |
| `PATCH` | `/api/menu/:itemId/availability` | Alias for item availability | `{ available: boolean }` | `{ item: { id, name, available } }` | **Yes (`staffAuth`)** |
| `POST` | `/api/staff/menu` | Create new menu item | `{ name: string, description?: string, price: number, available?: boolean }` | `201 Created`: `{ item: { id, name, description, price, available } }` | **Yes (`staffAuth`)** |
| `POST` | `/api/staff/demo/seed-rush` | Seed active orders for rush demo | `{ count?: number, preset?: "Low"\|"Medium"\|"High" }` | `{ message, targetCount, rushLevel, activeCount }` | **Yes (`staffAuth`)** |
| `POST` | `/api/staff/demo/reset` | Clear orders and re-seed default menu | None | `{ message, itemsCount, ordersCount }` | **Yes (`staffAuth`)** |

---

## 3. Database Models

The models are defined using Mongoose in [`backend/models/MenuItem.js`](backend/models/MenuItem.js) and [`backend/models/Order.js`](backend/models/Order.js).

### 1. `MenuItem` Model (`menuItems` collection)
- **`name`** (`String`, Required, trim: true): Item name.
- **`description`** (`String`, Default: `''`, trim: true): Short item description.
- **`price`** (`Number`, Required, min: `0`): Authoritative unit price in INR.
- **`available`** (`Boolean`, Default: `true`): Availability flag.
- **`createdAt`** (`Date`, Auto-generated via timestamps).
- **`updatedAt`** (`Date`, Auto-generated via timestamps).
- **Virtual/JSON Transform:** Automatically maps `_id` to string `id` and strips `__v`.
- *Note:* The backend schema does **not** declare a `category` or `image` field.

### 2. `Order` Model (`orders` collection)
- **`orderNumber`** (`String`, Required, Unique, Indexed): Human-readable sequential ID (`ORD-1001`, `ORD-1002`, ...).
- **`items`** (`Array` of subdocuments, Required, min length: 1):
  - `itemId` (`mongoose.Schema.Types.ObjectId`, Ref: `MenuItem`, Required).
  - `name` (`String`, Required): Name snapshot at time of purchase.
  - `price` (`Number`, Required, min: 0): Unit price snapshot at time of purchase.
  - `quantity` (`Number`, Required, min: 1): Positive integer quantity.
  - `subtotal` (`Number`, Required, min: 0): `price * quantity`.
- **`total`** (`Number`, Required, min: 0): Sum of all item subtotals calculated server-side.
- **`status`** (`String`, Enum: `['New', 'Preparing', 'Ready', 'Collected']`, Default: `'New'`, Indexed).
- **`createdAt`** (`Date`, Auto-generated via timestamps).
- **`updatedAt`** (`Date`, Auto-generated via timestamps).
- **Virtual/JSON Transform:** Formats `_id` to `id` and ensures subdocument `itemId` is stringified.

---

## 4. Authentication

Staff authentication is implemented in [`backend/middleware/auth.js`](backend/middleware/auth.js) and [`backend/controllers/staffController.js`](backend/controllers/staffController.js).

### Login Flow:
1. **Request:** The frontend sends a `POST /api/staff/login` request with JSON:
   ```json
   {
     "passcode": "staff123"
   }
   ```
   *(The default passcode is configured by `STAFF_PASSCODE` in `.env`, falling back to `staff123`).*

2. **Response:**
   - **Success (200):**
     ```json
     {
       "message": "Staff authenticated successfully",
       "token": "[STAFF_AUTH_SECRET_VALUE]"
     }
     ```
   - **Failure (401):**
     ```json
     {
       "error": {
         "code": "UNAUTHORIZED",
         "message": "Invalid staff passcode. Please check credentials."
       }
     }
     ```

### Sending the Token to Protected Routes:
To access protected endpoints (`/api/staff/orders/active`, `PATCH /api/staff/orders/:orderNumber/status`, `PATCH /api/staff/menu/:itemId/availability`, `POST /api/staff/menu`), the frontend must supply the token via **one** of the following headers:
- Preferred: `Authorization: Bearer <token>`
- Alternative header: `X-Staff-Token: <token>`
- Fallback query parameter: `?staffToken=<token>`

If no token is supplied, the backend responds with HTTP `401 UNAUTHORIZED`.  
If the token does not match `STAFF_AUTH_SECRET`, the backend responds with HTTP `403 FORBIDDEN`.

*(Development bypass: If `ENABLE_STAFF_AUTH=false` is set in the backend `.env`, `staffAuth` allows all requests through without checking credentials).*

---

## 5. Frontend Integration Gaps

Comparing `frontend/student-ui/js/api.js` and `frontend/admin-ui/js/admin.js` with the real backend reveals the following gaps:

1. **`USE_MOCK` Flag in `api.js`:**
   - In `frontend/student-ui/js/api.js`, line 12 has `USE_MOCK: true`. When `USE_MOCK: true`, all calls to `getMenu()`, `placeOrder()`, `getOrder()`, and `getRushInfo()` return data from `localStorage` without sending HTTP requests to `http://localhost:5000/api`.

2. **Rush Endpoint URL Mismatch:**
   - In `api.js` (line 313), the live network call tries `GET /api/rush`:
     ```javascript
     const res = await fetch(`${API_CONFIG.BASE_URL}/rush`);
     ```
   - However, the backend does **not** expose `/api/rush`. The real public endpoint serving rush and active order metrics is **`GET /api/dashboard`**.

3. **Admin Dashboard Direct `localStorage` Access:**
   - In `frontend/admin-ui/js/admin.js` (lines 155–163), `loadDashboardData()` attempts to read orders directly from `localStorage`:
     ```javascript
     const ordersRaw = localStorage.getItem('codespark_orders_cache_v1');
     const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
     this.activeOrders = allOrders.filter(o => o.status !== 'Collected');
     ```
   - Because `student-ui` and `admin-ui` run on different origins or ports (e.g. port 3000 vs 3001), `localStorage` is not shared across origins. The admin UI must call the backend endpoint `GET /api/staff/orders/active` (or the public `GET /api/dashboard`).

4. **Missing Authentication Handling in Admin UI:**
   - `admin.js` currently does not log in, store a staff token in `sessionStorage`/`localStorage`, or include `Authorization: Bearer <token>` when updating order status or item availability.
   - When connected to the live backend, `PATCH /api/staff/orders/:orderNumber/status` and `PATCH /api/staff/menu/:itemId/availability` will fail with HTTP 401 Unauthorized unless the token header is provided.

5. **`menu.category` and `menu.image` Fields:**
   - The frontend assumes `item.category` and `item.image` exist on menu items.
   - The backend `MenuItem` model only stores `name`, `description`, `price`, and `available`.
   - The frontend's category filters and image rendering already have fallbacks (default category `Snacks`, default fallback food image), but `category` and `image` will not be persisted in MongoDB unless added to the backend model or held on the client.

6. **Item ID Format:**
   - In mock mode, frontend generated item IDs like `"item_101"`.
   - The backend requires MongoDB `ObjectId` strings (e.g. `661aa...`). The backend strictly validates `mongoose.Types.ObjectId.isValid(ordered.itemId)` in `orderService.js` line 68. Calling `POST /api/orders` with non-ObjectId strings will trigger HTTP 400 `VALIDATION_ERROR`.

---

## 6. Missing Backend Features

1. **Delete / Remove Menu Item Endpoint:**
   - The admin UI contains a "Remove Food Item" feature that calls `DELETE /api/staff/menu/:itemId`.
   - **Result from backend inspection:** There is **no** `DELETE /api/staff/menu/:itemId` route in `backend/routes/canteen.js` or `backend/controllers/menuController.js`. Only `POST /api/staff/menu` (create) and `PATCH /api/staff/menu/:itemId/availability` (availability toggle) exist.

2. **Direct Public Rush Endpoint (`/api/rush`):**
   - The frontend anticipated `GET /api/rush`. The backend instead implemented `GET /api/dashboard` (which provides `{ orders, activeCount, rushLevel }`).

---

## 7. Rush Tracker Architecture

### Calculation Method (`backend/services/rushService.js`):
1. The backend queries MongoDB for all orders where `status !== 'Collected'`:
   ```javascript
   const activeOrders = await Order.find({ status: { $ne: 'Collected' } });
   const activeCount = activeOrders.length;
   ```
2. The authoritative rush level is computed strictly according to the project specification:
   - **`0 – 4` active orders:** `"Low"`
   - **`5 – 9` active orders:** `"Medium"`
   - **`10+` active orders:** `"High"`
3. Real endpoints exposing this calculation:
   - **Public (Student UI):** `GET /api/dashboard`
   - **Protected (Staff UI):** `GET /api/staff/orders/active` (or alias `GET /api/staff/dashboard`)

---

## 8. Local Setup & Execution Guide

### Prerequisites
- Node.js (v18+ or v24+ installed)
- npm

### 1. Run the Backend
```powershell
cd c:\Users\hp\Desktop\hackathon\codespark\backend
npm install
npm start
```
*Note: If local MongoDB is not running, the backend automatically uses an embedded In-Memory MongoDB and seeds default menu items. The server starts at `http://localhost:5000/api`.*

### 2. Run the Student Frontend
In a new terminal window:
```powershell
cd c:\Users\hp\Desktop\hackathon\codespark
npm run start:student
```
*Accessible at: `http://localhost:3000`*

### 3. Run the Admin Frontend
In a separate terminal window:
```powershell
cd c:\Users\hp\Desktop\hackathon\codespark
npm run start:admin
```
*Accessible at: `http://localhost:3001`*

### 4. Run Backend Test Suite
```powershell
cd c:\Users\hp\Desktop\hackathon\codespark\backend
npm test
```

---

## 9. Recommended Minimal Fixes for Connection

To connect both existing frontends to the live backend with the smallest possible footprint:

1. **In `frontend/student-ui/js/api.js`:**
   - Set `API_CONFIG.USE_MOCK = false`.
   - Update `getRushInfo()` to fetch `GET /api/dashboard` instead of `/api/rush`:
     ```javascript
     const res = await fetch(`${API_CONFIG.BASE_URL}/dashboard`);
     if (res && res.ok) {
       const data = await res.json();
       return { activeCount: data.activeCount, rushLevel: data.rushLevel };
     }
     ```
   - Add auth token header support for staff requests.

2. **In `frontend/admin-ui/js/admin.js`:**
   - In `loadDashboardData()`, replace the direct `localStorage.getItem` with a call to `GET /api/staff/orders/active` (or `GET /api/dashboard`).
   - For staff updates (`updateOrderStatus`, `toggleItemAvailability`, `addMenuItem`), pass the staff auth token in headers (`Authorization: Bearer <token>`). The token can be fetched on init via `POST /api/staff/login` with `{ passcode: "staff123" }` or stored after login.

3. **In `backend/routes/canteen.js` & `backend/controllers/menuController.js` (Optional Backend Enhancement):**
   - If the team desires item deletion support, add:
     ```javascript
     router.delete('/staff/menu/:itemId', staffAuth, menuController.deleteMenuItem);
     ```
     in `backend/routes/canteen.js`. Otherwise, the admin UI can rely on toggling availability to "Sold Out".

---

## 10. Complete Source Reference

Below are the complete, untruncated source contents of all inspected files relevant to integration. (Sensitive values have been redacted where applicable).

---

### File: `backend/package.json`
```json
{
  "name": "codespark-canteen-backend",
  "version": "1.0.0",
  "description": "Backend API for Smart Canteen Order & Rush Tracker",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node seed.js",
    "test": "node test.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mongodb-memory-server": "^11.3.0",
    "mongoose": "^8.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

---

### File: `backend/server.js`
```javascript
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
```

---

### File: `backend/routes/canteen.js`
```javascript
const express = require('express');
const router = express.Router();

const menuController = require('../controllers/menuController');
const orderController = require('../controllers/orderController');
const staffController = require('../controllers/staffController');
const { staffAuth } = require('../middleware/auth');

// ==========================================
// 1. PUBLIC MENU ENDPOINTS
// ==========================================

// GET /api/menu - List all menu items with name, price, availability
router.get('/menu', menuController.getMenu);

// ==========================================
// 2. PUBLIC ORDER ENDPOINTS
// ==========================================

// POST /api/orders - Place a new order
router.post('/orders', orderController.placeOrder);

// GET /api/orders/:orderNumber - Track an order
router.get('/orders/:orderNumber', orderController.getOrder);

// Public / shared dashboard shortcut (Project Guide page 4)
router.get('/dashboard', orderController.getActiveOrders);

// ==========================================
// 3. STAFF AUTHENTICATION
// ==========================================

// POST /api/staff/login - Staff login to retrieve auth token
router.post('/staff/login', staffController.login);

// ==========================================
// 4. PROTECTED STAFF OPERATIONS
// ==========================================

// GET /api/staff/orders/active - List active orders and current rush level (API_CONTRACT)
router.get('/staff/orders/active', staffAuth, orderController.getActiveOrders);

// Alias: GET /api/staff/dashboard
router.get('/staff/dashboard', staffAuth, orderController.getActiveOrders);

// PATCH /api/staff/orders/:orderNumber/status - Update order status (New, Preparing, Ready, Collected)
router.patch('/staff/orders/:orderNumber/status', staffAuth, orderController.updateOrderStatus);

// Alias: PATCH /api/orders/:orderNumber/status (supports both staff and un-prefixed paths)
router.patch('/orders/:orderNumber/status', staffAuth, orderController.updateOrderStatus);

// PATCH /api/staff/menu/:itemId/availability - Mark menu item available/unavailable
router.patch('/staff/menu/:itemId/availability', staffAuth, menuController.updateAvailability);

// Alias: PATCH /api/menu/:itemId/availability
router.patch('/menu/:itemId/availability', staffAuth, menuController.updateAvailability);

// POST /api/staff/menu - Create new menu item
router.post('/staff/menu', staffAuth, menuController.createMenuItem);

// ==========================================
// 5. DEMO & TESTING UTILITIES FOR PRESENTATION
// ==========================================

// POST /api/staff/demo/seed-rush - Quickly seed active orders to demonstrate rush thresholds (0, 4, 5, 9, 10)
router.post('/staff/demo/seed-rush', staffAuth, staffController.seedRushDemo);

// POST /api/staff/demo/reset - Reset canteen orders and re-seed default menu
router.post('/staff/demo/reset', staffAuth, staffController.resetDemo);

module.exports = router;
```

---

### File: `backend/controllers/menuController.js`
```javascript
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
```

---

### File: `backend/controllers/orderController.js`
```javascript
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
```

---

### File: `backend/controllers/staffController.js`
```javascript
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const rushService = require('../services/rushService');

/**
 * POST /api/staff/login
 * Staff authentication endpoint
 */
async function login(req, res) {
  const { passcode } = req.body;
  const expectedPasscode = process.env.STAFF_PASSCODE || 'staff123';
  const staffSecret = process.env.STAFF_AUTH_SECRET || '[REDACTED_STAFF_SECRET]';

  if (!passcode || passcode !== expectedPasscode) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid staff passcode. Please check credentials.'
      }
    });
  }

  res.json({
    message: 'Staff authenticated successfully',
    token: staffSecret
  });
}

/**
 * POST /api/staff/demo/seed-rush
 * Helper for live presentation & testing: Seed active orders to hit specific rush thresholds:
 * - 0-4 => Low
 * - 5-9 => Medium
 * - 10+ => High
 */
async function seedRushDemo(req, res, next) {
  try {
    const { count, preset } = req.body;
    let targetCount = 5;

    if (preset === 'Low') targetCount = 3;
    else if (preset === 'Medium') targetCount = 6;
    else if (preset === 'High') targetCount = 10;
    else if (typeof count === 'number') targetCount = Math.max(0, count);

    // Get an available menu item to reference
    let sampleItem = await MenuItem.findOne({ available: true });
    if (!sampleItem) {
      sampleItem = await MenuItem.create({
        name: 'Veg Sandwich',
        description: 'Fresh sandwich',
        price: 50,
        available: true
      });
    }

    // Delete existing active orders to set exact target
    await Order.deleteMany({ status: { $ne: 'Collected' } });

    const createdOrders = [];
    for (let i = 1; i <= targetCount; i++) {
      const orderNumber = `ORD-${2000 + i}`;
      const statuses = ['New', 'Preparing', 'Ready'];
      const status = statuses[i % statuses.length];

      createdOrders.push({
        orderNumber,
        items: [{
          itemId: sampleItem._id,
          name: sampleItem.name,
          price: sampleItem.price,
          quantity: 1,
          subtotal: sampleItem.price
        }],
        total: sampleItem.price,
        status
      });
    }

    if (createdOrders.length > 0) {
      await Order.insertMany(createdOrders);
    }

    const rushSummary = await rushService.getActiveOrdersAndRush();

    res.json({
      message: `Seeded ${targetCount} active orders for demo testing`,
      targetCount,
      rushLevel: rushSummary.rushLevel,
      activeCount: rushSummary.activeCount
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/staff/demo/reset
 * Helper to reset orders and reload default menu
 */
async function resetDemo(req, res, next) {
  try {
    await Order.deleteMany({});
    await MenuItem.deleteMany({});

    const initialItems = [
      { name: 'Veg Sandwich', description: 'Fresh vegetable sandwich with mint chutney', price: 50, available: true },
      { name: 'Masala Dosa', description: 'Crispy dosa with potato filling and sambar', price: 80, available: true },
      { name: 'Cold Coffee', description: 'Chilled blended coffee with chocolate syrup', price: 60, available: true },
      { name: 'Veg Momos (8 pcs)', description: 'Steamed dumplings served with spicy dip', price: 70, available: false }
    ];

    await MenuItem.insertMany(initialItems);

    res.json({
      message: 'Demo environment reset successfully. Orders cleared and default menu loaded.',
      itemsCount: initialItems.length,
      ordersCount: 0
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  seedRushDemo,
  resetDemo
};
```

---

### File: `backend/models/MenuItem.js`
```javascript
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
```

---

### File: `backend/models/Order.js`
```javascript
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
```

---

### File: `backend/services/orderService.js`
```javascript
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

/**
 * Generate the next sequential order number (e.g., ORD-1001, ORD-1002)
 */
async function getNextOrderNumber() {
  // Find the most recently created order with ORD- prefix
  const lastOrder = await Order.findOne({ 
    orderNumber: { $regex: /^ORD-\d+$/ } 
  }).sort({ createdAt: -1 });

  let nextNum = 1001;

  if (lastOrder && lastOrder.orderNumber) {
    const match = lastOrder.orderNumber.match(/^ORD-(\d+)$/);
    if (match) {
      const parsedNum = parseInt(match[1], 10);
      if (!isNaN(parsedNum)) {
        nextNum = parsedNum + 1;
      }
    }
  } else {
    // If no regex match, fallback to count
    const count = await Order.countDocuments();
    nextNum = 1001 + count;
  }

  // Ensure uniqueness in case of gaps or manual entries
  let candidate = `ORD-${nextNum}`;
  let exists = await Order.exists({ orderNumber: candidate });
  while (exists) {
    nextNum++;
    candidate = `ORD-${nextNum}`;
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

    const quantity = parseInt(ordered.quantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      const err = new Error(`Quantity for item "${ordered.itemId}" must be a positive integer.`);
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
```

---

### File: `backend/services/rushService.js`
```javascript
const Order = require('../models/Order');

/**
 * Calculate Rush Level according to exact project rules:
 * - Low: 0–4 active orders
 * - Medium: 5–9 active orders
 * - High: 10 or more active orders
 *
 * Active orders: New, Preparing, Ready (Collected orders excluded).
 */
function calculateRushLevel(activeCount) {
  if (typeof activeCount !== 'number' || activeCount < 0) {
    return 'Low';
  }
  if (activeCount >= 10) {
    return 'High';
  }
  if (activeCount >= 5) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Fetch active orders and calculate rush metrics
 */
async function getActiveOrdersAndRush() {
  const activeOrders = await Order.find({ 
    status: { $ne: 'Collected' } 
  }).sort({ createdAt: 1 });

  const activeCount = activeOrders.length;
  const rushLevel = calculateRushLevel(activeCount);

  return {
    orders: activeOrders.map(o => ({
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      items: o.items.map(item => ({
        itemId: item.itemId.toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal
      })),
      createdAt: o.createdAt
    })),
    activeCount,
    rushLevel
  };
}

module.exports = {
  calculateRushLevel,
  getActiveOrdersAndRush
};
```

---

### File: `backend/config/db.js`
```javascript
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServer = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  // 1. If explicit URI provided and not default localhost, try connecting directly
  if (uri && !uri.includes('localhost:27017') && !uri.includes('127.0.0.1:27017')) {
    try {
      await mongoose.connect(uri);
      console.log(' Connected to MongoDB (Remote/Atlas) successfully');
      return;
    } catch (err) {
      console.error('Failed to connect to provided MONGODB_URI:', err.message);
      throw err;
    }
  }

  // 2. Try connecting to local MongoDB first (with short 2.5s timeout)
  const localUri = uri || 'mongodb://127.0.0.1:27017/smart-canteen';
  try {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2500 });
    console.log(' Connected to local MongoDB successfully');
    return;
  } catch (err) {
    console.log(' Local MongoDB not reachable (127.0.0.1:27017).');
  }

  // 3. Fallback to embedded In-Memory MongoDB for effortless local development and testing
  console.log(' Starting embedded In-Memory MongoDB server...');
  try {
    mongoMemoryServer = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(` Connected to embedded MongoDB at ${memoryUri}`);
    console.log('  Note: In-Memory DB is active. All data will be preserved in-process for this session.');
  } catch (err) {
    console.error('Could not start In-Memory MongoDB:', err);
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}

module.exports = { connectDB, disconnectDB };
```

---

### File: `backend/middleware/auth.js`
```javascript
/**
 * Staff authentication middleware
 * Protects canteen staff operations (order status updates, item availability, active order dashboard).
 */
function staffAuth(req, res, next) {
  // Allow toggling auth in dev environment if explicitly requested via ENABLE_STAFF_AUTH=false
  if (process.env.ENABLE_STAFF_AUTH === 'false') {
    return next();
  }

  const expectedSecret = process.env.STAFF_AUTH_SECRET || '[REDACTED_STAFF_SECRET]';

  // Check header 'Authorization: Bearer <token>'
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Fallback headers
  if (!token) {
    token = req.headers['x-staff-token'] || req.headers['x-staff-key'] || req.query.staffToken || req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Staff authentication required. Provide Bearer token or X-Staff-Token header.'
      }
    });
  }

  if (token !== expectedSecret) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid staff credentials.'
      }
    });
  }

  next();
}

module.exports = { staffAuth };
```

---

### File: `backend/middleware/errorHandler.js`
```javascript
/**
 * Centralized error handler middleware
 * Enforces API_CONTRACT error formatting without leaking stack traces or internal server details.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500);
  const code = err.code && typeof err.code === 'string' && isNaN(Number(err.code)) 
    ? err.code 
    : (statusCode === 400 ? 'VALIDATION_ERROR' : (statusCode === 404 ? 'ORDER_NOT_FOUND' : 'INTERNAL_ERROR'));

  const message = err.message || 'An unexpected internal error occurred.';

  // Only log unexpected 500 server errors to keep production and test logs clean
  if (statusCode >= 500) {
    console.error(`[Server Error ${statusCode}]:`, err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message
    }
  });
}

module.exports = errorHandler;
```

---

### File: `frontend/student-ui/js/api.js`
```javascript
/**
 * api.js - Frontend API Service & Contract Adapter
 * 
 * Boundary between browser presentation and backend HTTP API.
 * Currently backed by mock storage and contract endpoints for standalone development.
 * When the backend is online, toggle USE_MOCK to false or set API_BASE_URL.
 */

const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
  // Toggle to false when backend server is connected
  USE_MOCK: true,
  REQUEST_TIMEOUT_MS: 5000
};

// Default Initial Menu Data (Conforming to API_CONTRACT.md GET /menu)
const INITIAL_MENU_ITEMS = [
  {
    id: "item_101",
    name: "Veg Grilled Sandwich",
    description: "Crispy grilled bread packed with garden fresh veggies and house herbs",
    price: 50,
    available: true,
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_102",
    name: "Paneer Cheese Burger",
    description: "Tender spiced paneer patty with cheddar cheese and fresh lettuce",
    price: 85,
    available: true,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_103",
    name: "Masala Dosa",
    description: "Golden crispy crepe filled with tempered spiced potato smash & coconut chutney",
    price: 60,
    available: true,
    category: "South Indian",
    image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_104",
    name: "Cold Coffee Shake",
    description: "Thick chilled brewed espresso blend with rich cream and chocolate drizzle",
    price: 45,
    available: true,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_105",
    name: "Samosa Chaat",
    description: "Two crushed crisp samosas topped with tangy chole, curd and mint chutney",
    price: 40,
    available: false, // Intentionally marked unavailable to test availability protection
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "item_106",
    name: "Hakka Noodles",
    description: "Wok-tossed noodles with shredded cabbage, bell peppers and spring onions",
    price: 75,
    available: true,
    category: "Chinese",
    image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60"
  }
];

// Initial mock orders to simulate canteen activity and test tracking
const INITIAL_MOCK_ORDERS = [
  {
    orderNumber: "ORD-1001",
    status: "Preparing",
    items: [
      { itemId: "item_101", name: "Veg Grilled Sandwich", price: 50, quantity: 2, subtotal: 100 }
    ],
    total: 100,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  },
  {
    orderNumber: "ORD-1002",
    status: "New",
    items: [
      { itemId: "item_104", name: "Cold Coffee Shake", price: 45, quantity: 1, subtotal: 45 }
    ],
    total: 45,
    createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString()
  },
  {
    orderNumber: "ORD-1003",
    status: "Ready",
    items: [
      { itemId: "item_102", name: "Paneer Cheese Burger", price: 85, quantity: 1, subtotal: 85 }
    ],
    total: 85,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },
  {
    orderNumber: "ORD-1000",
    status: "Collected",
    items: [
      { itemId: "item_103", name: "Masala Dosa", price: 60, quantity: 1, subtotal: 60 }
    ],
    total: 60,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  }
];

// Local Storage Keys
const STORAGE_KEYS = {
  MENU: 'codespark_menu_cache_v1',
  ORDERS: 'codespark_orders_cache_v1',
  MY_ORDERS: 'codespark_my_order_numbers_v1'
};

// Initialize Mock Database in LocalStorage if not present
function initializeMockDb() {
  if (!localStorage.getItem(STORAGE_KEYS.MENU)) {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(INITIAL_MENU_ITEMS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_MOCK_ORDERS));
  }
}

initializeMockDb();

/**
 * Calculates rush level based on active order count.
 * Rush Rules:
 *  - Low: 0-4 active orders
 *  - Medium: 5-9 active orders
 *  - High: 10+ active orders
 * Active order = any status !== 'Collected'
 */
export function calculateRush(orders) {
  const activeOrders = orders.filter(o => o.status !== 'Collected');
  const activeCount = activeOrders.length;
  let rushLevel = 'Low';

  if (activeCount >= 10) {
    rushLevel = 'High';
  } else if (activeCount >= 5) {
    rushLevel = 'Medium';
  } else {
    rushLevel = 'Low';
  }

  return { activeCount, rushLevel };
}

/**
 * API Client Object
 */
export const Api = {
  /**
   * GET /menu
   * Retrieves all menu items.
   */
  async getMenu() {
    if (API_CONFIG.USE_MOCK) {
      // Simulate network micro-delay for realistic UI feedback
      await new Promise(r => setTimeout(r, 80));
      const raw = localStorage.getItem(STORAGE_KEYS.MENU);
      const items = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;
      return { items };
    }

    const res = await fetch(`${API_CONFIG.BASE_URL}/menu`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to fetch menu (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * POST /orders
   * Submits an order with items array: [{ itemId, quantity }]
   */
  async placeOrder(orderPayload) {
    if (!orderPayload || !Array.isArray(orderPayload.items) || orderPayload.items.length === 0) {
      throw new Error("Order payload must contain at least one item.");
    }

    if (API_CONFIG.USE_MOCK) {
      await new Promise(r => setTimeout(r, 120));

      const menuRaw = localStorage.getItem(STORAGE_KEYS.MENU);
      const menu = menuRaw ? JSON.parse(menuRaw) : INITIAL_MENU_ITEMS;
      const menuMap = new Map(menu.map(i => [i.id, i]));

      // Backend-simulated validation: Check item availability and compute totals securely
      const validatedItems = [];
      let total = 0;

      for (const itemReq of orderPayload.items) {
        const menuItem = menuMap.get(itemReq.itemId);
        if (!menuItem) {
          throw new Error(`Item ${itemReq.itemId} not found in canteen menu.`);
        }
        if (!menuItem.available) {
          const err = new Error(`Item "${menuItem.name}" is currently sold out and unavailable.`);
          err.code = "ITEM_UNAVAILABLE";
          throw err;
        }
        if (typeof itemReq.quantity !== 'number' || itemReq.quantity <= 0) {
          throw new Error(`Invalid quantity for item "${menuItem.name}".`);
        }

        const subtotal = menuItem.price * itemReq.quantity;
        total += subtotal;

        validatedItems.push({
          itemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: itemReq.quantity,
          subtotal
        });
      }

      // Generate order number ORD-xxxx
      const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
      const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder = {
        orderNumber,
        status: "New",
        items: validatedItems,
        total,
        createdAt: new Date().toISOString()
      };

      allOrders.unshift(newOrder);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));

      // Track that this student placed this order
      Api.rememberMyOrder(orderNumber);

      return { order: newOrder };
    }

    // Real API Request to Backend
    const res = await fetch(`${API_CONFIG.BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData?.error?.message || `Failed to place order (HTTP ${res.status})`);
      err.code = errData?.error?.code;
      throw err;
    }

    const data = await res.json();
    if (data.order && data.order.orderNumber) {
      Api.rememberMyOrder(data.order.orderNumber);
    }
    return data;
  },

  /**
   * GET /orders/:orderNumber
   * Fetches status and details of a single order.
   */
  async getOrder(orderNumber) {
    if (!orderNumber) throw new Error("Order number is required");

    if (API_CONFIG.USE_MOCK) {
      await new Promise(r => setTimeout(r, 60));
      const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
      const found = allOrders.find(o => o.orderNumber.toUpperCase() === orderNumber.toUpperCase());
      if (!found) {
        const err = new Error(`Order ${orderNumber} not found.`);
        err.code = 'ORDER_NOT_FOUND';
        throw err;
      }
      return { order: found };
    }

    const res = await fetch(`${API_CONFIG.BASE_URL}/orders/${encodeURIComponent(orderNumber)}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData?.error?.message || `Order not found (HTTP ${res.status})`);
      err.code = errData?.error?.code;
      throw err;
    }
    return res.json();
  },

  /**
   * Get Active Canteen Rush summary.
   * In a real system, calculated by the backend. Here computed from active orders.
   */
  async getRushInfo() {
    if (API_CONFIG.USE_MOCK) {
      const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
      return calculateRush(allOrders);
    }

    // In production, student frontend can fetch rush from a lightweight public endpoint
    const res = await fetch(`${API_CONFIG.BASE_URL}/rush`).catch(() => null);
    if (res && res.ok) {
      return res.json();
    }
    return { activeCount: 0, rushLevel: "Low" };
  },

  /**
   * Helper to keep track of this student's placed orders in localStorage
   */
  rememberMyOrder(orderNumber) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.MY_ORDERS) || '[]');
      if (!existing.includes(orderNumber)) {
        existing.unshift(orderNumber);
        localStorage.setItem(STORAGE_KEYS.MY_ORDERS, JSON.stringify(existing));
      }
    } catch (e) {
      console.warn("Could not save order number to local history:", e);
    }
  },

  getMyOrderNumbers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MY_ORDERS) || '[]');
    } catch (e) {
      return [];
    }
  },

  /**
   * Add a new food item to the menu (Staff Food Management)
   */
  async addMenuItem(itemData) {
    if (!itemData || !itemData.name || typeof itemData.price !== 'number') {
      throw new Error("Item name and numeric price are required.");
    }

    if (API_CONFIG.USE_MOCK) {
      await new Promise(r => setTimeout(r, 60));
      const raw = localStorage.getItem(STORAGE_KEYS.MENU);
      const items = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;

      const newItem = {
        id: `item_${Date.now()}`,
        name: itemData.name.trim(),
        description: (itemData.description || '').trim(),
        price: Math.max(0, itemData.price),
        category: (itemData.category || 'Snacks').trim(),
        available: Boolean(itemData.available !== false),
        image: itemData.image || ''
      };

      items.push(newItem);
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(items));
      return { item: newItem };
    }

    const res = await fetch(`${API_CONFIG.BASE_URL}/staff/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Failed to add food item');
    }
    return res.json();
  },

  /**
   * Remove a food item from the menu (Staff Food Management)
   */
  async removeMenuItem(itemId) {
    if (!itemId) throw new Error("Item ID is required");

    if (API_CONFIG.USE_MOCK) {
      await new Promise(r => setTimeout(r, 60));
      const raw = localStorage.getItem(STORAGE_KEYS.MENU);
      const items = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;
      const filtered = items.filter(i => i.id !== itemId);
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(filtered));
      return { success: true };
    }

    const res = await fetch(`${API_CONFIG.BASE_URL}/staff/menu/${encodeURIComponent(itemId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Failed to remove food item');
    }
    return res.json();
  },

  /**
   * Helper for tests & demo purposes: Mock updating an order's status
   * (Allows testing New -> Preparing -> Ready -> Collected without staff UI)
   */
  _mockSetOrderStatus(orderNumber, newStatus) {
    if (!API_CONFIG.USE_MOCK) return;
    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
    const idx = allOrders.findIndex(o => o.orderNumber === orderNumber);
    if (idx !== -1) {
      allOrders[idx].status = newStatus;
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));
    }
  },

  /**
   * Helper for tests & demo purposes: Toggle menu item availability
   */
  _mockSetItemAvailability(itemId, available) {
    if (!API_CONFIG.USE_MOCK) return;
    const raw = localStorage.getItem(STORAGE_KEYS.MENU);
    const items = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.available = available;
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(items));
    }
  },

  /**
   * Helper to set mock active order count directly for rush testing
   */
  _mockSetActiveOrderCount(count) {
    if (!API_CONFIG.USE_MOCK) return;
    const list = [];
    for (let i = 1; i <= count; i++) {
      list.push({
        orderNumber: `ORD-TEST-${1000 + i}`,
        status: i % 3 === 0 ? "Ready" : i % 2 === 0 ? "Preparing" : "New",
        items: [{ itemId: "item_101", name: "Veg Sandwich", price: 50, quantity: 1, subtotal: 50 }],
        total: 50,
        createdAt: new Date().toISOString()
      });
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(list));
  }
};
```

---

### File: `frontend/student-ui/js/app.js`
```javascript
/**
 * app.js - Main Controller for Student Canteen UI
 */

import { Api, calculateRush } from './api.js';
import { Cart } from './cart.js';
import { MenuRenderer } from './menu.js';
import { OrdersManager } from './orders.js';

class StudentApp {
  constructor() {
    this.menuItems = [];
    this.menuRenderer = null;
    this.ordersManager = null;
    this.currentOrderSuccess = null;
  }

  async init() {
    this.setupElements();
    this.setupTabs();
    this.setupCartUI();
    this.setupOrderModal();

    // Initialize Order Tracker (Strictly Read-Only)
    this.ordersManager = new OrdersManager(
      document.getElementById('orders-list-container'),
      () => this.refreshRushDisplay()
    );
    this.ordersManager.init();

    // Initialize Menu Renderer
    this.menuRenderer = new MenuRenderer(
      document.getElementById('menu-grid'),
      (item) => this.handleAddToCart(item)
    );

    // Setup Category Filter Chips
    this.setupCategoryFilters();

    // Fetch initial menu & rush info
    await this.loadMenu();
    await this.refreshRushDisplay();

    // Auto-refresh menu and rush every 4 seconds to sync live admin updates
    this.refreshTimer = setInterval(() => {
      this.loadMenu();
      this.refreshRushDisplay();
    }, 4000);

    // Subscribe Cart changes to re-render cart sidebar and sync menu cards
    Cart.subscribe(() => {
      this.renderCart();
      if (this.menuRenderer) {
        this.menuRenderer.render();
      }
    });

    this.renderCart();
  }

  setupElements() {
    this.elements = {
      menuGrid: document.getElementById('menu-grid'),
      cartItemsList: document.getElementById('cart-items-list'),
      cartSubtotal: document.getElementById('cart-subtotal'),
      cartTotal: document.getElementById('cart-total'),
      cartCountBadge: document.getElementById('cart-count-badge'),
      cartItemsCount: document.getElementById('cart-items-count'),
      btnCheckout: document.getElementById('btn-checkout'),
      btnClearCart: document.getElementById('btn-clear-cart'),
      rushLevelBadge: document.getElementById('rush-level-badge'),
      rushTextNav: document.getElementById('rush-text-nav'),
      rushLevelHero: document.getElementById('rush-level-hero'),
      rushCountHero: document.getElementById('rush-count-hero'),
      toastContainer: document.getElementById('toast-container'),
      orderModal: document.getElementById('order-confirmation-modal'),
      modalOrderNumber: document.getElementById('modal-order-number'),
      modalOrderTotal: document.getElementById('modal-order-total'),
      modalItemsSummary: document.getElementById('modal-items-summary'),
      btnModalTrack: document.getElementById('btn-modal-track'),
      btnModalClose: document.getElementById('btn-modal-close'),
      categoryChips: document.querySelectorAll('.category-chip')
    };
  }

  setupTabs() {
    const navButtons = document.querySelectorAll('.nav-btn[data-tab]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabName) {
    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(section => {
      section.classList.toggle('active', section.id === `tab-${tabName}`);
    });

    // If switching to orders tab, refresh active orders
    if (tabName === 'orders' && this.ordersManager) {
      this.ordersManager.refreshActiveOrders();
    }
  }

  setupCategoryFilters() {
    this.elements.categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.elements.categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const category = chip.getAttribute('data-category');
        if (this.menuRenderer) {
          this.menuRenderer.filterByCategory(category);
        }
      });
    });
  }

  async loadMenu() {
    try {
      const data = await Api.getMenu();
      this.menuItems = data.items || [];
      if (this.menuRenderer) {
        this.menuRenderer.setItems(this.menuItems);
      }

      // Check if any item in student's current cart has become unavailable
      const newlyUnavailable = Cart.syncWithMenu(this.menuItems);
      if (newlyUnavailable.length > 0) {
        const itemNames = newlyUnavailable.map(i => `"${i.name}"`).join(', ');
        this.showToast(`Notice: ${itemNames} just became unavailable and cannot be checked out.`, 'warning');
      }
    } catch (err) {
      console.error('Menu load failure:', err);
      this.showToast('Unable to load canteen menu. Please try again.', 'error');
    }
  }

  async refreshRushDisplay() {
    try {
      const rush = await Api.getRushInfo();
      this.updateRushUI(rush.activeCount, rush.rushLevel);
    } catch (err) {
      console.warn('Rush calculation error:', err);
    }
  }

  updateRushUI(activeCount, rushLevel) {
    // Header mini badge
    if (this.elements.rushLevelBadge && this.elements.rushTextNav) {
      this.elements.rushLevelBadge.className = `rush-badge-widget rush-${rushLevel.toLowerCase()}`;
      this.elements.rushTextNav.textContent = `${rushLevel} Rush (${activeCount} active)`;
    }

    // Hero banner rush display
    if (this.elements.rushLevelHero && this.elements.rushCountHero) {
      this.elements.rushLevelHero.textContent = `${rushLevel} Rush`;
      this.elements.rushLevelHero.style.color =
        rushLevel === 'High' ? 'var(--rush-high)' :
        rushLevel === 'Medium' ? 'var(--rush-medium)' : 'var(--rush-low)';
      this.elements.rushCountHero.textContent = `${activeCount} active`;
    }
  }

  handleAddToCart(item) {
    if (!item.available) {
      this.showToast(`"${item.name}" is currently sold out and cannot be added.`, 'error');
      return;
    }
    const result = Cart.addItem(item);
    if (result.success) {
      this.showToast(`Added ${item.name} to tray`, 'success');
    } else {
      this.showToast(result.reason, 'error');
    }
  }

  setupCartUI() {
    if (this.elements.btnClearCart) {
      this.elements.btnClearCart.addEventListener('click', () => {
        if (Cart.isEmpty()) return;
        if (confirm("Are you sure you want to clear your tray?")) {
          Cart.clear();
          this.showToast("Tray cleared", "info");
        }
      });
    }

    if (this.elements.btnCheckout) {
      this.elements.btnCheckout.addEventListener('click', () => {
        this.handleCheckout();
      });
    }
  }

  renderCart() {
    const items = Cart.items;
    const totalCount = Cart.getItemCount();
    const subtotal = Cart.getSubtotal();
    const total = Cart.getTotal();

    // Update Badges & Counters
    if (this.elements.cartCountBadge) {
      this.elements.cartCountBadge.textContent = totalCount;
      this.elements.cartCountBadge.style.display = totalCount > 0 ? 'inline-block' : 'none';
    }
    if (this.elements.cartItemsCount) {
      this.elements.cartItemsCount.textContent = `(${totalCount})`;
    }
    if (this.elements.cartSubtotal) {
      this.elements.cartSubtotal.textContent = `₹${subtotal}`;
    }
    if (this.elements.cartTotal) {
      this.elements.cartTotal.textContent = `₹${total}`;
    }

    // Checkout button state
    const hasUnavailable = Cart.hasUnavailableItems();
    if (this.elements.btnCheckout) {
      if (Cart.isEmpty()) {
        this.elements.btnCheckout.disabled = true;
        this.elements.btnCheckout.textContent = "Tray is Empty";
      } else if (hasUnavailable) {
        this.elements.btnCheckout.disabled = true;
        this.elements.btnCheckout.textContent = "Remove Sold Out Items";
      } else {
        this.elements.btnCheckout.disabled = false;
        this.elements.btnCheckout.textContent = `Place Order • ₹${total}`;
      }
    }

    // Render items list
    if (!this.elements.cartItemsList) return;

    if (items.length === 0) {
      this.elements.cartItemsList.innerHTML = `
        <div class="cart-empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
          </svg>
          <p>Your tray is empty.</p>
          <span style="font-size:0.8rem;color:var(--text-light);">Select food items from the menu</span>
        </div>
      `;
      return;
    }

    this.elements.cartItemsList.innerHTML = '';

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = `cart-item ${!item.available ? 'item-unavailable-alert' : ''}`;

      // Left info
      const info = document.createElement('div');
      info.className = 'cart-item-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'cart-item-name';
      nameEl.textContent = item.name;

      if (!item.available) {
        const unavailTag = document.createElement('span');
        unavailTag.style.cssText = 'color:#ef4444;font-size:0.75rem;font-weight:700;margin-left:4px;';
        unavailTag.textContent = '(Sold Out)';
        nameEl.appendChild(unavailTag);
      }

      const priceUnit = document.createElement('div');
      priceUnit.className = 'cart-item-price-unit';
      priceUnit.textContent = `₹${item.price} each`;

      info.appendChild(nameEl);
      info.appendChild(priceUnit);

      // Controls
      const controls = document.createElement('div');
      controls.className = 'cart-item-controls';

      const qtyCtrl = document.createElement('div');
      qtyCtrl.className = 'card-qty-control';

      const decBtn = document.createElement('button');
      decBtn.className = 'qty-btn';
      decBtn.textContent = '−';
      decBtn.title = 'Decrease quantity';
      decBtn.addEventListener('click', () => Cart.decrementItem(item.id));

      const qtySpan = document.createElement('span');
      qtySpan.className = 'qty-number';
      qtySpan.textContent = item.quantity;

      const incBtn = document.createElement('button');
      incBtn.className = 'qty-btn';
      incBtn.textContent = '+';
      incBtn.title = 'Increase quantity';
      if (!item.available) {
        incBtn.disabled = true;
        incBtn.style.opacity = '0.4';
      }
      incBtn.addEventListener('click', () => {
        if (item.available) {
          Cart.incrementItem(item.id);
        } else {
          this.showToast(`Cannot increase "${item.name}" because it is currently sold out.`, 'error');
        }
      });

      qtyCtrl.appendChild(decBtn);
      qtyCtrl.appendChild(qtySpan);
      qtyCtrl.appendChild(incBtn);

      const itemTotal = document.createElement('span');
      itemTotal.className = 'cart-item-total';
      itemTotal.textContent = `₹${item.price * item.quantity}`;

      controls.appendChild(qtyCtrl);
      controls.appendChild(itemTotal);

      row.appendChild(info);
      row.appendChild(controls);
      this.elements.cartItemsList.appendChild(row);
    });
  }

  async handleCheckout() {
    if (Cart.isEmpty()) {
      this.showToast("Your tray is empty. Please add items before checking out.", "error");
      return;
    }

    if (Cart.hasUnavailableItems()) {
      const badItems = Cart.getUnavailableItems().map(i => `"${i.name}"`).join(', ');
      this.showToast(`Cannot place order: ${badItems} is currently sold out. Please remove it from your tray.`, "error");
      return;
    }

    const payload = Cart.toOrderPayload();

    try {
      this.elements.btnCheckout.disabled = true;
      this.elements.btnCheckout.textContent = "Placing Order...";

      const res = await Api.placeOrder(payload);

      if (res && res.order) {
        // Clear cart on successful order creation
        Cart.clear();

        // Add order to tracking manager
        this.ordersManager.addOrder(res.order);

        // Update rush indicator
        await this.refreshRushDisplay();

        // Show confirmation modal
        this.showOrderConfirmation(res.order);
      }
    } catch (err) {
      console.error("Order placement failed:", err);
      this.showToast(err.message || "Failed to place order. Please try again.", "error");
    } finally {
      this.renderCart();
    }
  }

  setupOrderModal() {
    if (this.elements.btnModalClose) {
      this.elements.btnModalClose.addEventListener('click', () => {
        this.elements.orderModal.classList.remove('active');
      });
    }

    if (this.elements.btnModalTrack) {
      this.elements.btnModalTrack.addEventListener('click', () => {
        this.elements.orderModal.classList.remove('active');
        this.switchTab('orders');
      });
    }
  }

  showOrderConfirmation(order) {
    if (!this.elements.orderModal) return;

    this.elements.modalOrderNumber.textContent = order.orderNumber;
    this.elements.modalOrderTotal.textContent = `₹${order.total}`;

    // Item summary preview
    if (this.elements.modalItemsSummary && order.items) {
      this.elements.modalItemsSummary.innerHTML = '';
      order.items.forEach(it => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${it.quantity}x ${it.name}`;
        const priceSpan = document.createElement('span');
        priceSpan.textContent = `₹${it.subtotal || (it.price * it.quantity)}`;
        row.appendChild(nameSpan);
        row.appendChild(priceSpan);
        this.elements.modalItemsSummary.appendChild(row);
      });
    }

    this.elements.orderModal.classList.add('active');
  }

  showToast(message, type = 'info') {
    if (!this.elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const text = document.createElement('span');
    text.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:inherit;font-weight:bold;margin-left:8px;';
    closeBtn.onclick = () => toast.remove();

    toast.appendChild(text);
    toast.appendChild(closeBtn);

    this.elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }
}

// Instantiate and boot app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new StudentApp();
  app.init();
  window.__studentApp = app;
});
```

---

### File: `frontend/student-ui/js/menu.js`
```javascript
/**
 * menu.js - Menu rendering and category handling for Student UI
 */

import { Cart } from './cart.js';

export class MenuRenderer {
  constructor(containerElement, onAddToCart) {
    this.container = containerElement;
    this.onAddToCart = onAddToCart;
    this.items = [];
    this.activeCategory = 'All';
  }

  setItems(items) {
    this.items = items || [];
    this.render();
  }

  filterByCategory(category) {
    this.activeCategory = category;
    this.render();
  }

  render() {
    if (!this.container) return;

    if (!this.items || this.items.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <h3>No Menu Items Available</h3>
          <p>The canteen is currently refreshing its menu. Please check back shortly.</p>
        </div>
      `;
      return;
    }

    const filtered = this.activeCategory === 'All'
      ? this.items
      : this.items.filter(item => item.category === this.activeCategory);

    this.container.innerHTML = '';

    filtered.forEach(item => {
      const card = document.createElement('article');
      card.className = `menu-card ${item.available ? 'available' : 'unavailable'}`;
      card.setAttribute('data-id', item.id);

      const qtyInCart = Cart.getQuantityOf(item.id);

      // Safe image fallback
      const imageUrl = item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';

      // Card Image Wrap
      const imageWrap = document.createElement('div');
      imageWrap.className = 'card-image-wrap';

      const img = document.createElement('img');
      img.className = 'card-image';
      img.src = imageUrl;
      img.alt = item.name;
      img.loading = 'lazy';
      img.onerror = () => {
        img.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
      };

      const badge = document.createElement('span');
      badge.className = `card-badge ${item.available ? 'badge-available' : 'badge-unavailable'}`;
      badge.textContent = item.available ? 'Available' : 'Sold Out';

      imageWrap.appendChild(img);
      imageWrap.appendChild(badge);

      // Card Body
      const body = document.createElement('div');
      body.className = 'card-body';

      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = item.name;

      const desc = document.createElement('p');
      desc.className = 'card-description';
      desc.textContent = item.description || 'Freshly made in the college canteen';

      // Card Footer
      const footer = document.createElement('div');
      footer.className = 'card-footer';

      const price = document.createElement('span');
      price.className = 'card-price';
      price.textContent = `₹${item.price}`;

      const actionArea = document.createElement('div');
      actionArea.className = 'card-actions';

      if (!item.available) {
        // Disabled button for unavailable items
        const disabledBtn = document.createElement('button');
        disabledBtn.className = 'btn-add-cart';
        disabledBtn.disabled = true;
        disabledBtn.textContent = 'Unavailable';
        disabledBtn.title = 'This item is currently sold out';
        actionArea.appendChild(disabledBtn);
      } else if (qtyInCart > 0) {
        // Show inline quantity modifier if item is already in cart
        const qtyControl = document.createElement('div');
        qtyControl.className = 'card-qty-control';

        const decBtn = document.createElement('button');
        decBtn.className = 'qty-btn';
        decBtn.textContent = '−';
        decBtn.title = 'Decrease quantity';
        decBtn.addEventListener('click', () => {
          Cart.decrementItem(item.id);
        });

        const qtySpan = document.createElement('span');
        qtySpan.className = 'qty-number';
        qtySpan.textContent = qtyInCart;

        const incBtn = document.createElement('button');
        incBtn.className = 'qty-btn';
        incBtn.textContent = '+';
        incBtn.title = 'Increase quantity';
        incBtn.addEventListener('click', () => {
          Cart.incrementItem(item.id);
        });

        qtyControl.appendChild(decBtn);
        qtyControl.appendChild(qtySpan);
        qtyControl.appendChild(incBtn);
        actionArea.appendChild(qtyControl);
      } else {
        // Regular Add button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-cart';
        addBtn.innerHTML = `
          <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add
        `;
        addBtn.addEventListener('click', () => {
          if (this.onAddToCart) {
            this.onAddToCart(item);
          }
        });
        actionArea.appendChild(addBtn);
      }

      footer.appendChild(price);
      footer.appendChild(actionArea);

      body.appendChild(title);
      body.appendChild(desc);
      body.appendChild(footer);

      card.appendChild(imageWrap);
      card.appendChild(body);

      this.container.appendChild(card);
    });
  }
}
```

---

### File: `frontend/student-ui/js/cart.js`
```javascript
/**
 * cart.js - Shopping Cart state and management for Student UI
 */

const CART_STORAGE_KEY = 'codespark_student_cart_v1';

class CartStore {
  constructor() {
    this.items = []; // Array of { id, name, price, quantity, available, image }
    this.listeners = new Set();
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      if (data) {
        this.items = JSON.parse(data);
      }
    } catch (e) {
      console.warn("Could not load cart from storage:", e);
      this.items = [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn("Could not save cart to storage:", e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  /**
   * Adds an item to the cart or increments its quantity.
   * Prevents adding unavailable items.
   */
  addItem(product) {
    if (!product || !product.available) {
      return { success: false, reason: "Item is currently unavailable" };
    }

    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        available: product.available,
        image: product.image || ''
      });
    }

    this.saveToStorage();
    return { success: true };
  }

  /**
   * Updates an item's quantity.
   * If quantity <= 0, item is removed.
   */
  updateQuantity(productId, quantity) {
    const idx = this.items.findIndex(i => i.id === productId);
    if (idx === -1) return;

    if (quantity <= 0) {
      this.items.splice(idx, 1);
    } else {
      this.items[idx].quantity = Math.floor(quantity);
    }

    this.saveToStorage();
  }

  /**
   * Decrements quantity of an item
   */
  decrementItem(productId) {
    const existing = this.items.find(i => i.id === productId);
    if (!existing) return;
    this.updateQuantity(productId, existing.quantity - 1);
  }

  /**
   * Increments quantity of an item (if available)
   */
  incrementItem(productId) {
    const existing = this.items.find(i => i.id === productId);
    if (!existing) return;
    if (!existing.available) return;
    this.updateQuantity(productId, existing.quantity + 1);
  }

  /**
   * Removes an item completely
   */
  removeItem(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.saveToStorage();
  }

  /**
   * Empties cart
   */
  clear() {
    this.items = [];
    this.saveToStorage();
  }

  /**
   * Synchronizes cart availability state against freshly loaded menu data
   * Returns list of items that became unavailable
   */
  syncWithMenu(menuItems) {
    const menuMap = new Map(menuItems.map(m => [m.id, m]));
    const newlyUnavailable = [];

    for (const item of this.items) {
      const live = menuMap.get(item.id);
      if (live) {
        // Update price & availability snapshot
        item.price = live.price;
        if (item.available && !live.available) {
          item.available = false;
          newlyUnavailable.push(item);
        } else {
          item.available = live.available;
        }
      }
    }

    this.saveToStorage();
    return newlyUnavailable;
  }

  /**
   * Checks if cart has any item that is now unavailable
   */
  hasUnavailableItems() {
    return this.items.some(i => !i.available);
  }

  getUnavailableItems() {
    return this.items.filter(i => !i.available);
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getQuantityOf(productId) {
    const item = this.items.find(i => i.id === productId);
    return item ? item.quantity : 0;
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getTotal() {
    // No taxes or fees for canteen orders, provisional total = subtotal
    return this.getSubtotal();
  }

  isEmpty() {
    return this.items.length === 0;
  }

  toOrderPayload() {
    return {
      items: this.items.map(i => ({
        itemId: i.id,
        quantity: i.quantity
      }))
    };
  }
}

export const Cart = new CartStore();
```

---

### File: `frontend/student-ui/js/orders.js`
```javascript
/**
 * orders.js - Order placement, status tracking & lookup for Student UI
 */

import { Api } from './api.js';

// Order Status Steps config in progressive sequence
const ORDER_STATUS_STEPS = ["New", "Preparing", "Ready", "Collected"];

export class OrdersManager {
  constructor(containerElement, onStatusUpdate) {
    this.container = containerElement;
    this.onStatusUpdate = onStatusUpdate;
    this.trackedOrders = new Map();
    this.pollingInterval = null;
  }

  init() {
    this.loadStudentOrders();
    this.startAutoRefresh();
  }

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  startAutoRefresh() {
    // Poll active orders every 4 seconds to keep statuses fresh for student
    this.stop();
    this.pollingInterval = setInterval(() => {
      this.refreshActiveOrders();
    }, 4000);
  }

  async loadStudentOrders() {
    const orderNumbers = Api.getMyOrderNumbers();
    if (orderNumbers.length === 0) {
      this.render();
      return;
    }

    for (const num of orderNumbers) {
      try {
        const res = await Api.getOrder(num);
        if (res && res.order) {
          this.trackedOrders.set(res.order.orderNumber, res.order);
        }
      } catch (e) {
        console.warn(`Could not fetch details for order ${num}:`, e);
      }
    }

    this.render();
  }

  async refreshActiveOrders() {
    let hasChanges = false;
    for (const [orderNumber, order] of this.trackedOrders.entries()) {
      if (order.status !== 'Collected') {
        try {
          const res = await Api.getOrder(orderNumber);
          if (res && res.order) {
            if (res.order.status !== order.status) {
              hasChanges = true;
            }
            this.trackedOrders.set(orderNumber, res.order);
          }
        } catch (e) {
          // ignore transient poll errors
        }
      }
    }

    if (hasChanges) {
      this.render();
      if (this.onStatusUpdate) this.onStatusUpdate();
    }
  }

  addOrder(order) {
    if (order && order.orderNumber) {
      this.trackedOrders.set(order.orderNumber, order);
      this.render();
    }
  }

  render() {
    if (!this.container) return;

    if (this.trackedOrders.size === 0) {
      this.container.innerHTML = `
        <div class="empty-state-card">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
          <h3>No Orders Yet</h3>
          <p>You haven't placed any orders today, or enter your Order # above to track live status.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = '';
    const ordersList = Array.from(this.trackedOrders.values());

    // Sort newest first
    ordersList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    ordersList.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-card';

      // Card Header
      const header = document.createElement('div');
      header.className = 'order-card-header';

      const title = document.createElement('span');
      title.className = 'order-number-title';
      title.textContent = order.orderNumber;

      const badge = document.createElement('span');
      badge.className = `order-status-badge status-${order.status}`;
      badge.textContent = order.status;

      header.appendChild(title);
      header.appendChild(badge);

      // Status Stepper Visual Tracker
      const stepper = document.createElement('div');
      stepper.className = 'status-tracker-stepper';

      const currentIdx = ORDER_STATUS_STEPS.indexOf(order.status);

      ORDER_STATUS_STEPS.forEach((stepName, idx) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'stepper-step';

        if (idx < currentIdx) {
          stepEl.classList.add('completed');
        } else if (idx === currentIdx) {
          stepEl.classList.add('current');
        }

        const bubble = document.createElement('div');
        bubble.className = 'step-bubble';
        bubble.textContent = idx < currentIdx ? '✓' : (idx + 1);

        const label = document.createElement('span');
        label.className = 'step-label';
        label.textContent = stepName;

        stepEl.appendChild(bubble);
        stepEl.appendChild(label);
        stepper.appendChild(stepEl);
      });

      // Item breakdown
      const itemsList = document.createElement('div');
      itemsList.className = 'order-items-detail';

      if (order.items && order.items.length > 0) {
        order.items.forEach(it => {
          const row = document.createElement('div');
          row.className = 'order-detail-item';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = `${it.quantity}x ${it.name}`;

          const subSpan = document.createElement('span');
          subSpan.textContent = `₹${it.subtotal || (it.price * it.quantity)}`;

          row.appendChild(nameSpan);
          row.appendChild(subSpan);
          itemsList.appendChild(row);
        });
      }

      // Card Footer
      const footer = document.createElement('div');
      footer.className = 'order-card-footer';

      const timeEl = document.createElement('span');
      timeEl.className = 'order-timestamp';
      if (order.createdAt) {
        const d = new Date(order.createdAt);
        timeEl.textContent = `Placed at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        timeEl.textContent = 'Active order';
      }

      const totalEl = document.createElement('span');
      totalEl.className = 'order-total-amount';
      totalEl.textContent = `Total: ₹${order.total}`;

      footer.appendChild(timeEl);
      footer.appendChild(totalEl);

      card.appendChild(header);
      card.appendChild(stepper);
      card.appendChild(itemsList);
      card.appendChild(footer);

      this.container.appendChild(card);
    });
  }
}
```

---

### File: `frontend/admin-ui/js/admin.js`
```javascript
/**
 * admin.js - Canteen Staff & Admin Dashboard Controller
 * 
 * Functions:
 * 1. View active orders with order #, food items, quantities, and totals
 * 2. Update order status: New -> Preparing -> Ready -> Collected
 * 3. Mark food items Available or Sold Out (item availability)
 * 4. View active-order count and rush level
 * 
 * Compliant with:
 * - GET /staff/orders/active
 * - PATCH /staff/orders/:orderNumber/status
 * - PATCH /staff/menu/:itemId/availability
 */

import { Api, calculateRush } from '../../student-ui/js/api.js';

class AdminDashboard {
  constructor() {
    this.menuItems = [];
    this.activeOrders = [];
    this.refreshTimer = null;
  }

  async init() {
    this.setupTabs();
    this.setupFoodManagementModal();
    await this.loadDashboardData();

    // Auto-refresh orders every 8 seconds
    this.refreshTimer = setInterval(() => {
      this.loadDashboardData(true);
    }, 8000);
  }

  setupTabs() {
    const tabBtns = document.querySelectorAll('.nav-btn[data-tab]');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-tab');

        tabBtns.forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab-content').forEach(section => {
          section.classList.toggle('active', section.id === `tab-${tab}`);
        });
      });
    });
  }

  setupFoodManagementModal() {
    const modal = document.getElementById('add-food-modal');
    const openBtn = document.getElementById('btn-open-add-food');
    const cancelBtn = document.getElementById('btn-cancel-add-food');
    const form = document.getElementById('add-food-form');
    const fileInput = document.getElementById('food-image-file');
    const previewImg = document.getElementById('food-image-preview');
    const previewPlaceholder = document.getElementById('preview-placeholder');

    let currentImageDataUrl = '';

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        if (form) form.reset();
        currentImageDataUrl = '';
        if (previewImg) {
          previewImg.style.display = 'none';
          previewImg.src = '';
        }
        if (previewPlaceholder) previewPlaceholder.style.display = 'block';
        modal.classList.add('active');
      });
    }

    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    // Image Upload with Live Preview
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            currentImageDataUrl = uploadEvent.target.result;
            if (previewImg) {
              previewImg.src = currentImageDataUrl;
              previewImg.style.display = 'block';
            }
            if (previewPlaceholder) {
              previewPlaceholder.style.display = 'none';
            }
          };
          reader.readAsDataURL(file);
        } else {
          currentImageDataUrl = '';
          if (previewImg) previewImg.style.display = 'none';
          if (previewPlaceholder) previewPlaceholder.style.display = 'block';
        }
      });
    }

    // Handle Form Submit
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('food-name-input');
        const priceInput = document.getElementById('food-price-input');
        const categorySelect = document.getElementById('food-category-select');
        const descInput = document.getElementById('food-desc-input');
        const availCheckbox = document.getElementById('food-avail-checkbox');

        const name = nameInput ? nameInput.value.trim() : '';
        const price = priceInput ? parseFloat(priceInput.value) : 0;
        const category = categorySelect ? categorySelect.value : 'Snacks';
        const description = descInput ? descInput.value.trim() : '';
        const available = availCheckbox ? availCheckbox.checked : true;

        if (!name || isNaN(price) || price < 0) {
          this.showToast('Please enter a valid food name and non-negative price.', 'error');
          return;
        }

        try {
          await Api.addMenuItem({
            name,
            price,
            category,
            description,
            available,
            image: currentImageDataUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'
          });

          this.showToast(`"${name}" added to canteen menu!`, 'success');
          if (modal) modal.classList.remove('active');
          await this.loadDashboardData(true);
        } catch (err) {
          this.showToast('Could not add food item: ' + err.message, 'error');
        }
      });
    }
  }

  async loadDashboardData(silent = false) {
    try {
      // 1. Fetch Menu Items
      const menuRes = await Api.getMenu();
      this.menuItems = menuRes.items || [];
      this.renderMenuManagement();

      // 2. Fetch Orders for Staff
      const ordersRaw = localStorage.getItem('codespark_orders_cache_v1');
      const allOrders = ordersRaw ? JSON.parse(ordersRaw) : [];
      
      // Active orders = status !== 'Collected'
      this.activeOrders = allOrders.filter(o => o.status !== 'Collected');
      
      // Compute Rush & Active Count
      const rush = calculateRush(allOrders);
      this.updateRushHeader(rush.activeCount, rush.rushLevel);

      // Render Active Orders List
      this.renderOrders();
    } catch (err) {
      if (!silent) {
        this.showToast('Could not load kitchen orders: ' + err.message, 'error');
      }
    }
  }

  updateRushHeader(activeCount, rushLevel) {
    const badge = document.getElementById('rush-badge');
    const text = document.getElementById('rush-text');
    const countDisplay = document.getElementById('active-orders-count');
    const rushLevelDisplay = document.getElementById('current-rush-level');

    if (badge && text) {
      badge.className = `rush-badge-widget rush-${rushLevel.toLowerCase()}`;
      text.textContent = `Current Rush: ${rushLevel}`;
    }

    if (countDisplay) {
      countDisplay.textContent = activeCount;
    }

    if (rushLevelDisplay) {
      rushLevelDisplay.textContent = `${rushLevel} Rush`;
      rushLevelDisplay.style.color =
        rushLevel === 'High' ? 'var(--rush-high)' :
        rushLevel === 'Medium' ? 'var(--rush-medium)' : 'var(--rush-low)';
    }
  }

  renderOrders() {
    const container = document.getElementById('admin-orders-list');
    if (!container) return;

    if (this.activeOrders.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"></path>
          </svg>
          <h3>All Caught Up!</h3>
          <p>No active food orders in the kitchen queue right now.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    // Sort: Newest orders first
    const sorted = [...this.activeOrders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    sorted.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-card';

      // Header: Order # and Current Status
      const header = document.createElement('div');
      header.className = 'order-card-header';

      const title = document.createElement('span');
      title.className = 'order-number-title';
      title.textContent = order.orderNumber;

      const currentStatusBadge = document.createElement('span');
      currentStatusBadge.className = `order-status-badge status-${order.status}`;
      currentStatusBadge.textContent = order.status;

      header.appendChild(title);
      header.appendChild(currentStatusBadge);

      // Order Items Breakdown
      const itemsList = document.createElement('div');
      itemsList.className = 'order-items-detail';

      (order.items || []).forEach(it => {
        const row = document.createElement('div');
        row.className = 'order-detail-item';

        const nameSpan = document.createElement('span');
        nameSpan.style.fontWeight = '600';
        nameSpan.textContent = `${it.quantity} × ${it.name}`;

        const priceSpan = document.createElement('span');
        priceSpan.textContent = `₹${it.subtotal || (it.price * it.quantity)}`;

        row.appendChild(nameSpan);
        row.appendChild(priceSpan);
        itemsList.appendChild(row);
      });

      // Status Update Controls (Staff Only)
      const controlsWrap = document.createElement('div');
      controlsWrap.style.cssText = 'margin: 1rem 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; background: #fff7ed; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #fed7aa;';

      const label = document.createElement('span');
      label.style.cssText = 'font-size: 0.85rem; font-weight: 600; color: var(--text-main);';
      label.textContent = 'Change Order Status:';

      const btnGroup = document.createElement('div');
      btnGroup.style.cssText = 'display: flex; gap: 0.4rem; flex-wrap: wrap;';

      const statuses = ['New', 'Preparing', 'Ready', 'Collected'];

      statuses.forEach(statusOption => {
        const btn = document.createElement('button');
        btn.className = `nav-btn ${order.status === statusOption ? 'active' : ''}`;
        btn.style.cssText = 'padding: 0.3rem 0.65rem; font-size: 0.8rem;';
        btn.textContent = statusOption;

        if (order.status === statusOption) {
          btn.disabled = true;
          btn.style.cursor = 'default';
        } else {
          btn.addEventListener('click', () => {
            this.updateOrderStatus(order.orderNumber, statusOption);
          });
        }

        btnGroup.appendChild(btn);
      });

      controlsWrap.appendChild(label);
      controlsWrap.appendChild(btnGroup);

      // Footer
      const footer = document.createElement('div');
      footer.className = 'order-card-footer';

      const timeEl = document.createElement('span');
      timeEl.className = 'order-timestamp';
      if (order.createdAt) {
        const d = new Date(order.createdAt);
        timeEl.textContent = `Received at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        timeEl.textContent = 'Active order';
      }

      const totalEl = document.createElement('span');
      totalEl.className = 'order-total-amount';
      totalEl.textContent = `Total: ₹${order.total}`;

      footer.appendChild(timeEl);
      footer.appendChild(totalEl);

      card.appendChild(header);
      card.appendChild(itemsList);
      card.appendChild(controlsWrap);
      card.appendChild(footer);

      container.appendChild(card);
    });
  }

  renderMenuManagement() {
    const container = document.getElementById('admin-menu-list');
    if (!container) return;

    container.innerHTML = '';

    this.menuItems.forEach(item => {
      const card = document.createElement('article');
      card.className = `menu-card ${item.available ? 'available' : 'unavailable'}`;
      card.style.display = 'flex';
      card.style.flexDirection = 'column';

      // Card Image Wrap
      const imageWrap = document.createElement('div');
      imageWrap.className = 'card-image-wrap';

      const img = document.createElement('img');
      img.className = 'card-image';
      img.src = item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
      img.alt = item.name;
      img.loading = 'lazy';
      img.onerror = () => {
        img.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60';
      };

      const badge = document.createElement('span');
      badge.className = `card-badge ${item.available ? 'badge-available' : 'badge-unavailable'}`;
      badge.textContent = item.available ? 'Food Available' : 'Sold Out';

      imageWrap.appendChild(img);
      imageWrap.appendChild(badge);

      // Card Body
      const body = document.createElement('div');
      body.className = 'card-body';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.gap = '0.4rem';

      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = item.name;

      const desc = document.createElement('p');
      desc.className = 'card-description';
      desc.textContent = item.description || 'Canteen special';

      const price = document.createElement('div');
      price.className = 'card-price';
      price.textContent = `₹${item.price} • ${item.category || 'Snacks'}`;

      // Actions Area
      const actionsWrap = document.createElement('div');
      actionsWrap.style.cssText = 'display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.75rem;';

      const toggleBtn = document.createElement('button');
      toggleBtn.className = item.available ? 'btn-modal-action btn-modal-secondary' : 'btn-modal-action btn-modal-primary';
      toggleBtn.style.cssText = 'flex: 1; padding: 0.5rem 0.6rem; font-size: 0.8rem;';
      toggleBtn.textContent = item.available ? 'Mark Sold Out' : 'Mark Available';
      toggleBtn.addEventListener('click', () => {
        this.toggleItemAvailability(item.id, !item.available);
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-modal-action';
      removeBtn.style.cssText = 'padding: 0.5rem 0.75rem; font-size: 0.8rem; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;';
      removeBtn.textContent = 'Remove';
      removeBtn.title = 'Remove this food item from canteen menu';
      removeBtn.addEventListener('click', () => {
        this.handleRemoveFoodItem(item.id, item.name);
      });

      actionsWrap.appendChild(toggleBtn);
      actionsWrap.appendChild(removeBtn);

      body.appendChild(title);
      body.appendChild(desc);
      body.appendChild(price);
      body.appendChild(actionsWrap);

      card.appendChild(imageWrap);
      card.appendChild(body);

      container.appendChild(card);
    });
  }

  async handleRemoveFoodItem(itemId, itemName) {
    const confirmed = confirm(`Are you sure you want to remove "${itemName}" from the canteen menu?`);
    if (!confirmed) return;

    try {
      await Api.removeMenuItem(itemId);
      this.showToast(`"${itemName}" removed from menu.`, 'info');
      await this.loadDashboardData(true);
    } catch (err) {
      this.showToast('Could not remove food item: ' + err.message, 'error');
    }
  }

  async updateOrderStatus(orderNumber, newStatus) {
    try {
      Api._mockSetOrderStatus(orderNumber, newStatus);
      this.showToast(`Order ${orderNumber} updated to ${newStatus}`, 'success');
      await this.loadDashboardData(true);
    } catch (err) {
      this.showToast('Failed to update order status: ' + err.message, 'error');
    }
  }

  async toggleItemAvailability(itemId, newAvailable) {
    try {
      Api._mockSetItemAvailability(itemId, newAvailable);
      const stateWord = newAvailable ? 'Available' : 'Sold Out';
      this.showToast(`Food item updated to "${stateWord}"`, 'success');
      await this.loadDashboardData(true);
    } catch (err) {
      this.showToast('Failed to update availability: ' + err.message, 'error');
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const admin = new AdminDashboard();
  admin.init();
});
```
