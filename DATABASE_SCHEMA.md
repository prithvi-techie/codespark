# Database Schema

## 1. Overview

MongoDB stores menu items and orders. The backend is responsible for database access and validation.

The structures below are proposed logical schemas. The actual MongoDB model definitions must implement the same agreed fields.

## 2. Menu Collection

Suggested collection: `menuItems`

Example document:

```json
{
  "_id": "MongoDB-generated-id",
  "name": "Veg Sandwich",
  "description": "Fresh vegetable sandwich",
  "price": 50,
  "available": true,
  "createdAt": "2026-10-13T08:00:00.000Z",
  "updatedAt": "2026-10-13T08:00:00.000Z"
}
```

Fields:

- `_id`: Unique database ID.
- `name`: Required item name.
- `description`: Optional description.
- `price`: Non-negative numeric price.
- `available`: Boolean availability.
- `createdAt`: Creation timestamp.
- `updatedAt`: Last update timestamp.

## 3. Orders Collection

Suggested collection: `orders`

Example document:

```json
{
  "_id": "MongoDB-generated-id",
  "orderNumber": "ORD-1001",
  "items": [
    {
      "itemId": "menu-item-id",
      "name": "Veg Sandwich",
      "price": 50,
      "quantity": 2,
      "subtotal": 100
    }
  ],
  "total": 100,
  "status": "New",
  "createdAt": "2026-10-13T08:05:00.000Z",
  "updatedAt": "2026-10-13T08:05:00.000Z"
}
```

Fields:

- `_id`: Unique database ID.
- `orderNumber`: Unique, human-readable order number.
- `items`: Snapshot of ordered items.
- `items.itemId`: Reference to the menu item.
- `items.name`: Name at the time of ordering.
- `items.price`: Price at the time of ordering.
- `items.quantity`: Positive integer quantity.
- `items.subtotal`: Price multiplied by quantity.
- `total`: Sum of item subtotals.
- `status`: Current order status.
- `createdAt`: Creation timestamp.
- `updatedAt`: Last update timestamp.

The backend must calculate all monetary values. Do not accept item prices, subtotals, or totals as trusted client input.

## 4. Order Status Values

Allowed values:

- `New`
- `Preparing`
- `Ready`
- `Collected`

An order is active whenever its status is not `Collected`.

## 5. Rush Level

Rush level can be calculated from the active order count rather than stored separately.

- 0–4: `Low`
- 5–9: `Medium`
- 10+: `High`

This prevents a stored rush value from becoming inconsistent with actual orders.

## 6. Data Integrity

- Ensure `orderNumber` is unique.
- Validate required fields and data types.
- Ensure quantity is a positive integer.
- Ensure price and total values are non-negative.
- Reject unknown menu item IDs.
- Recheck item availability when placing an order.
- Use database-level uniqueness where appropriate.
- Handle concurrent requests and order-number collisions safely.
- Use consistent timestamps.

## 7. Security and Privacy

- Never expose database credentials to the frontend.
- Never return private database fields unnecessarily.
- Do not store payment information because payment processing is outside this project's defined scope.
- Avoid logging sensitive order or authentication information.

## 8. Schema Agreement

Keep these fields consistent with `API_CONTRACT.md`. If the API uses `id` in responses while MongoDB uses `_id` internally, document and implement that conversion in the backend.
