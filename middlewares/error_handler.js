const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Error interno del servidor';

  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (err.stack) console.error(message)

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

const notFoundHandler = (req, res, next) => {
  const error = new AppError(`No se encontró la ruta ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};