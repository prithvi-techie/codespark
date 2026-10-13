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
