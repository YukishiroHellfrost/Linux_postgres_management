class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  const badRequest = (msg = 'Solicitud incorrecta') => new AppError(msg, 400);
  const unauthorized = (msg = 'No autorizado') => new AppError(msg, 401);
  const forbidden = (msg = 'Prohibido') => new AppError(msg, 403);
  const notFound = (msg = 'Recurso no encontrado') => new AppError(msg, 404);
  const internalServer = (msg = 'Error interno del servidor') => new AppError(msg, 500);
  
  module.exports = {
    AppError,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    internalServer,
  };