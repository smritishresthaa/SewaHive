// backend/middleware/error.js
function notFoundHandler(req, res, next) {
  res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  // Basic logging – in real prod you’d use a logger like Winston
  // but this is enough for FYP
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    message,
    details: err.details || null,
  });
}

module.exports = { errorHandler, notFoundHandler };
