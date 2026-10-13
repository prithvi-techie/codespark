# API Contract

## 1. General Conventions

- Base URL: `http://localhost:5000/api` during local development, unless configured differently.
- Requests and responses use JSON.
- Menu item IDs are represented as strings.
- Order status values are case-sensitive.
- All request data must be validated by the backend.
- The backend determines authoritative prices, totals, availability, and rush levels.

## 2. Get Menu

`GET /menu`

Success response:

```json
{
  "items": [
    {
      "id": "item_101",
      "name": "Veg Sandwich",
      "price": 50,
      "available": true
    }
  ]
}
```

## 3. Place an Order

`POST /orders`

Request:

```json
{
  "items": [
    {
      "itemId": "item_101",
      "quantity": 2
    }
  ]
}
```

Success response: `201 Created`

```json
{
  "order": {
    "orderNumber": "ORD-1001",
    "status": "New",
    "items": [
      {
        "itemId": "item_101",
        "name": "Veg Sandwich",
        "price": 50,
        "quantity": 2,
        "subtotal": 100
      }
    ],
    "total": 100
  }
}
```

The backend must calculate prices and totals using current database values. It must reject unavailable items and must not create an order if validation fails.

## 4. Get an Order

`GET /orders/:orderNumber`

Success response:

```json
{
  "order": {
    "orderNumber": "ORD-1001",
    "status": "Preparing",
    "total": 100
  }
}
```

Apply suitable access controls if order information must be restricted.

## 5. Get Active Orders

`GET /staff/orders/active`

Success response:

```json
{
  "orders": [
    {
      "orderNumber": "ORD-1001",
      "status": "Preparing",
      "total": 100
    }
  ],
  "activeCount": 1,
  "rushLevel": "Low"
}
```

This endpoint must require authorized staff access.

## 6. Update Order Status

`PATCH /staff/orders/:orderNumber/status`

Request:

```json
{
  "status": "Ready"
}
```

Allowed values:

- `New`
- `Preparing`
- `Ready`
- `Collected`

Success response:

```json
{
  "order": {
    "orderNumber": "ORD-1001",
    "status": "Ready"
  }
}
```

Only authorized staff can update order status. The backend must reject invalid status values.

## 7. Update Item Availability

`PATCH /staff/menu/:itemId/availability`

Request:

```json
{
  "available": false
}
```

Success response:

```json
{
  "item": {
    "id": "item_101",
    "available": false
  }
}
```

Only authorized staff can change availability.

## 8. Error Format

All errors should use a consistent format:

```json
{
  "error": {
    "code": "ITEM_UNAVAILABLE",
    "message": "One or more items are currently unavailable."
  }
}
```

Suggested codes:

- `VALIDATION_ERROR`
- `ITEM_UNAVAILABLE`
- `ORDER_NOT_FOUND`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `INTERNAL_ERROR`

Suggested HTTP status codes:

- `400`: Invalid request
- `401`: Authentication required
- `403`: Permission denied
- `404`: Resource not found
- `409`: Availability or state conflict
- `500`: Unexpected server error

Do not expose stack traces, credentials, or internal implementation details.

## 9. Rush Rules

- Low: 0–4 active orders.
- Medium: 5–9 active orders.
- High: 10 or more active orders.

Active orders are all orders whose status is not `Collected`.

## 10. Integration Agreement

Before final integration, verify:
- Exact route paths and HTTP methods.
- Whether item IDs use MongoDB IDs or another string format.
- Exact response field names.
- Staff authentication method.
- Order lookup access policy.
- Error format and status codes.
- Whether status transitions need additional restrictions.

This document is the proposed contract. If implementation changes are agreed upon, update this file and both sides of the code together.
