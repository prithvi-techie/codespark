# Smart Canteen Backend (Team CodeSpark)

Backend REST API for **Smart Canteen Order & Rush Tracker**, responsible for menu management, order lifecycle tracking, server-side price validation, availability enforcement, and real-time canteen rush calculations.

---

## Quick Start

### 1. Install Dependencies
```bash
cd codespark/backend
npm install
```

### 2. Environment Configuration
A `.env` file is pre-configured with defaults. You can customize variables in `.env`:
```ini
PORT=5000
NODE_ENV=development
# Uncomment if connecting to remote MongoDB Atlas or local MongoDB service:
# MONGODB_URI=mongodb://127.0.0.1:27017/smart-canteen
CLIENT_ORIGIN=*
STAFF_AUTH_SECRET=codespark-staff-secret-2026
STAFF_PASSCODE=staff123
ENABLE_STAFF_AUTH=true
```

> **Zero Setup Database:** If `MONGODB_URI` is omitted or local MongoDB service is not running, the backend automatically boots an embedded **In-Memory MongoDB** instance and seeds the default canteen menu. No local MongoDB installation required!

### 3. Start Server
```bash
# Production start
npm start

# Development mode with auto-reload
npm run dev
```
Base API URL: `http://localhost:5000/api`

### 4. Run Automated Test Suite
Run the comprehensive 40-test verification suite covering all rules, thresholds, and endpoints:
```bash
npm test
```

### 5. Standalone Seed Script
Reset and load the default canteen menu:
```bash
npm run seed
```

---

## API Endpoints Reference

### 1. Student / Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/menu` | List menu items with names, descriptions, prices, and availability |
| `POST` | `/api/orders` | Place order with items and quantities. Server validates availability and calculates total |
| `GET` | `/api/orders/:orderNumber` | Track order status (`New`, `Preparing`, `Ready`, `Collected`) and details |
| `GET` | `/api/dashboard` | Public / shared active orders count and rush level |
| `GET` | `/api/health` | Backend health check |

### 2. Staff Endpoints (Protected)

Header required: `Authorization: Bearer codespark-staff-secret-2026` (or `X-Staff-Token: codespark-staff-secret-2026`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/staff/login` | Login with passcode (`{"passcode": "staff123"}`) to get auth token |
| `GET` | `/api/staff/orders/active` | Get all active orders (New, Preparing, Ready), activeCount, and rushLevel |
| `PATCH` | `/api/staff/orders/:orderNumber/status` | Update order status (`New` → `Preparing` → `Ready` → `Collected`) |
| `PATCH` | `/api/staff/menu/:itemId/availability` | Mark menu item available (`{"available": true}`) or unavailable (`false`) |
| `POST` | `/api/staff/menu` | Add a new menu item |
| `POST` | `/api/staff/demo/seed-rush` | Helper to instantly seed N active orders for live demo (`{"count": 5}`) |
| `POST` | `/api/staff/demo/reset` | Reset demo orders and re-seed default menu items |

---

## Business Logic & Rules Implementation

1. **Active Orders Definition:**
   - Active: Orders with status `New`, `Preparing`, or `Ready`.
   - Excluded: Orders with status `Collected`.
   - Menu items and cart quantities are not counted as orders.

2. **Rush Level Thresholds:**
   - **Low**: `0 – 4` active orders
   - **Medium**: `5 – 9` active orders
   - **High**: `10 or more` active orders

3. **Availability & Server-Side Pricing:**
   - Client-sent prices/totals are ignored; the server looks up authoritative database prices.
   - Any order containing an item where `available: false` is immediately rejected with HTTP `409 ITEM_UNAVAILABLE`.
   - Sequential human-readable order numbers: `ORD-1001`, `ORD-1002`, ...
