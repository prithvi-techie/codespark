# Project Rules

## Coding Standards

1. Keep code readable and modular.
2. Use clear, consistent names.
3. Avoid unnecessary dependencies.
4. Avoid unrelated rewrites.
5. Keep documentation synchronized with implementation.
6. Use consistent API field names and order status values.
7. Separate presentation, API communication, business logic, and data access.

## Frontend Rules

- Use HTML, CSS, and Vanilla JavaScript.
- Keep API calls in a dedicated module.
- Display loading, empty, success, and error states.
- Treat browser-side totals as provisional.
- Never trust the browser to determine final prices or availability.
- Render untrusted API content safely using `textContent` and safe DOM methods.
- Do not put database credentials or private server secrets in browser code.
- Do not rely on hidden buttons as staff authorization.

## Backend Rules

- Validate request bodies, parameters, and query strings.
- Calculate order totals from trusted database prices.
- Recheck item availability at checkout.
- Reject invalid quantities, item IDs, and status values.
- Protect staff endpoints using authentication and authorization.
- Use consistent JSON responses and HTTP status codes.
- Do not expose stack traces or internal server details.
- Restrict CORS to approved frontend origins.
- Apply appropriate rate limits and request-size limits.
- Prevent NoSQL injection through input validation and safe query construction.
- Use environment variables for secrets and database configuration.

## Database Rules

- Enforce unique order numbers.
- Store item snapshots in orders to preserve the ordered name and price.
- Validate data types and required fields.
- Use least-privilege database credentials.
- Keep database access on the backend.

## Integration Rules

- Follow `API_CONTRACT.md`.
- Follow `DATABASE_SCHEMA.md`.
- Agree on contract changes before implementing them.
- Do not silently change endpoint paths or response fields.
- Test success cases and failure cases.
- Keep mock data separate from production API behavior.

## Security and Deployment

- Never commit real secrets or `.env` files.
- Commit `.env.example` with placeholder names only.
- Use HTTPS in production.
- Configure production environment variables in Render.
- Review dependencies and run available security checks.
- Test staff authorization and unavailable-item checkout before the demo.

## Definition of Done

A feature is complete only when its UI, API behavior, validation, error handling, and integration work together as intended.
