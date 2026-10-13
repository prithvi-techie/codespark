# System Architecture

## 1. Overview

Smart Canteen Order & Rush Tracker is a full-stack web application with a browser-based frontend, an Express backend, and MongoDB for persistent data.

## 2. Technology Stack

- HTML: Page structure
- CSS: Styling and responsive layout
- Vanilla JavaScript: Frontend interactions and API requests
- Node.js: Backend runtime
- Express.js: REST API
- MongoDB: Menu and order storage
- Render: Deployment

## 3. High-Level Architecture

Browser Frontend
→ HTTP/JSON API
→ Express Backend
→ Validation and Business Logic
→ MongoDB

The backend returns results to the frontend, which updates the interface.

## 4. Frontend Modules

Suggested structure:

- `frontend/index.html`
- `frontend/css/style.css`
- `frontend/js/app.js`
- `frontend/js/api.js`
- `frontend/js/menu.js`
- `frontend/js/cart.js`
- `frontend/js/orders.js`
- `frontend/js/staff.js`
- `frontend/assets/`

Responsibilities:

- `app.js`: Application initialization and shared UI behavior.
- `api.js`: API requests, response parsing, and error handling.
- `menu.js`: Menu rendering and availability display.
- `cart.js`: Cart operations and provisional total display.
- `orders.js`: Order placement and order tracking.
- `staff.js`: Staff dashboard interactions.

## 5. Backend Modules

Suggested structure:

- `backend/server.js`
- `backend/routes/`
- `backend/controllers/`
- `backend/services/`
- `backend/models/`
- `backend/middleware/`
- `backend/config/`

Responsibilities:

- Routes define API endpoints.
- Controllers process requests and send responses.
- Services implement business logic.
- Models define database structures.
- Middleware handles authentication, authorization, validation, and errors.
- Config manages server-side configuration.

The exact structure may be simplified if the hackathon timeline requires it, provided responsibilities remain clear.

## 6. Main Data Flow

### Menu
1. Frontend requests menu items.
2. Backend reads menu data.
3. Backend returns item names, prices, IDs, and availability.
4. Frontend renders the menu.

### Order Placement
1. User selects menu items and quantities.
2. Frontend sends item IDs and quantities.
3. Backend validates the request.
4. Backend checks current item availability.
5. Backend calculates prices and total using trusted database values.
6. Backend creates the order and returns its unique order number.
7. Frontend displays the confirmation.

### Order Tracking
1. Frontend requests an order by its order number.
2. Backend returns the current status.
3. Frontend updates the order-tracking interface.

### Staff Operations
1. Authorized staff access the staff dashboard.
2. Staff retrieve active orders.
3. Staff update order statuses or item availability.
4. Backend validates permissions and saves changes.
5. Frontend refreshes the displayed information.

## 7. Rush Calculation

Active orders are all orders whose status is not `Collected`.

- 0–4 active orders: Low
- 5–9 active orders: Medium
- 10+ active orders: High

The backend should calculate the authoritative active count and rush level. The frontend displays those values.

## 8. Error Handling

Use consistent JSON errors. Handle invalid requests, unavailable items, missing orders, unauthorized actions, database failures, and network errors.

Never expose stack traces or private server details to users.

## 9. Security

- Validate and sanitize inputs appropriately.
- Use server-side authorization for staff operations.
- Restrict CORS to the intended frontend origins.
- Apply rate limits and request-size limits.
- Keep secrets in server-side environment variables.
- Use HTTPS in deployment.
- Avoid logging sensitive data.

## 10. Integration

`API_CONTRACT.md` defines the API agreement. `DATABASE_SCHEMA.md` defines the expected data structures. Any changes to shared fields, status values, or endpoint formats must be reflected consistently across documentation and code.
