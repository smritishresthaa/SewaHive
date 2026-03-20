// backend/middleware/maintenanceMode.js
const AdminServiceConfig = require('../models/AdminServiceConfig');

/**
 * Middleware to block regular users when maintenance mode is ON.
 * Allows only admins and API routes for admin panel.
 */
module.exports = async function maintenanceMode(req, res, next) {
  try {
    // Allow admin and auth routes (including /api prefix)
    const path = req.path || req.originalUrl || '';
    if (
      path.startsWith('/admin') ||
      path.startsWith('/api/admin') ||
      path.startsWith('/auth') ||
      path.startsWith('/api/auth')
    ) {
      return next();
    }

    // Fetch maintenance mode flag from DB
    const config = await AdminServiceConfig.findOne();
    if (config && config.maintenanceMode) {
      // Check if user is admin (assume req.user injected by auth middleware)
      if (req.user && req.user.role === 'admin') {
        return next();
      }
      // Block regular users
      return res.status(503).json({
        message: 'Platform is under maintenance. Please try again later.',
        maintenance: true,
      });
    }
    next();
  } catch (err) {
    // On error, allow request to avoid accidental lockout
    next();
  }
};
