/**
 * Staff authentication middleware
 * Protects canteen staff operations (order status updates, item availability, active order dashboard).
 */
function staffAuth(req, res, next) {
  // Allow toggling auth in dev environment if explicitly requested via ENABLE_STAFF_AUTH=false
  if (process.env.ENABLE_STAFF_AUTH === 'false') {
    return next();
  }

  const expectedSecret = process.env.STAFF_AUTH_SECRET || 'codespark-staff-secret-2026';

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
