const logger = require('../utils/logger');

const loggingMiddleware = (req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
};

module.exports = loggingMiddleware;