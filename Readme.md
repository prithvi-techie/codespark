# Smart Canteen Order & Rush Tracker

A full-stack web application that helps students order food from a canteen and track order progress while helping staff monitor active orders and canteen rush.

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB
- Deployment: Render

## Core Features

### Student Features
- View menu items, prices, and availability.
- Add multiple items to the cart.
- Increase or decrease item quantities.
- View cart total.
- Place an order and receive a unique order number.
- Track order status.
- Receive clear messages when an item becomes unavailable.

### Staff Features
- View active orders.
- Update order status.
- Mark menu items available or unavailable.
- View active order count.
- View current rush level.

### Order Statuses
- New
- Preparing
- Ready
- Collected

### Rush Levels
- Low: 0–4 active orders
- Medium: 5–9 active orders
- High: 10 or more active orders

An active order is any order whose status is not `Collected`.

## Project Structure

- `frontend/`: Website interface and browser-side JavaScript.
- `backend/`: Express server, APIs, business logic, and database integration.
- `README.md`: Project overview and setup.
- `AGENTS.md`: Instructions for AI coding tools.
- `ARCHITECTURE.md`: System architecture and data flow.
- `API_CONTRACT.md`: Frontend-backend API agreement.
- `DATABASE_SCHEMA.md`: MongoDB collections and data structure.
- `RULES.md`: Development and security rules.
- `TASK.md`: Development and testing checklist.
- `.env.example`: Example environment variable names without secrets.

## Getting Started

1. Install a supported Node.js version.
2. Install backend dependencies inside `backend/`.
3. Configure backend environment variables using the example file.
4. Start the backend server.
5. Open the frontend through a local static server.
6. Configure the frontend API base URL to point to the backend.
7. Test menu loading, checkout, order tracking, staff actions, and rush calculations.

Exact commands should match the project's actual package scripts.

## Security Principles

- The backend is the source of truth for prices, availability, order status, totals, and rush level.
- Validate requests on the server.
- Protect staff operations with authentication and authorization.
- Never expose secrets in frontend code or Git.
- Return safe, consistent error responses.
- Use HTTPS for deployed traffic.

## Development Goal

Deliver one integrated, functional, responsive, and tested application. Frontend and backend must use the same API contract and data formats.
