const { badRequest } = require('../utils/errors');

/**
 * Middleware para validar el nombre de la base de datos en req.params.name
 * - Verifica que exista
 * - Solo caracteres alfanuméricos y guión bajo
 * - Longitud máxima 63 (límite de PostgreSQL)
 */
const validateDbName = (req, res, next) => {
  const { name } = req.params;

  if (!name) {
    return next(badRequest('El nombre de la base de datos es requerido'));
  }

  // Caracteres permitidos: letras, números, guión bajo
  const validNameRegex = /^[a-zA-Z0-9_]+$/;
  if (!validNameRegex.test(name)) {
    return next(badRequest('El nombre de la base de datos solo puede contener letras, números y guiones bajos'));
  }

  // Límite de PostgreSQL para identificadores
  if (name.length > 63) {
    return next(badRequest('El nombre de la base de datos no puede exceder 63 caracteres'));
  }

  next();
};

/**
 * Middleware para validar el campo opcional backupFile en req.body
 * - Si está presente, debe ser string y tener extensión .sql
 */
const validateBackupFile = (req, res, next) => {
  const { backupFile } = req.body;

  // Es opcional, si no viene, continuar
  if (backupFile !== undefined && backupFile !== null) {
    if (typeof backupFile !== 'string') {
      return next(badRequest('El campo backupFile debe ser una cadena de texto'));
    }

    // Validar extensión .sql (insensible a mayúsculas)
    if (!backupFile.toLowerCase().endsWith('.sql')) {
      return next(badRequest('El archivo de backup debe tener extensión .sql'));
    }
  }

  next();
};

module.exports = {
  validateDbName,
  validateBackupFile
};