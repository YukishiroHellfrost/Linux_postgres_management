const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/errors');

const authorization = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(unauthorized('Token no proporcionado o formato inválido'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return next(unauthorized('Token inválido o expirado'));
  }
};

module.exports = authorization;