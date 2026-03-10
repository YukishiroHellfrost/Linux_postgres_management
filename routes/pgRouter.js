const { Router } = require('express');
const PgController = require('../controller/pgController');
const authMiddleware = require('../middlewares/auth');
const { validateDbName, validateBackupFile } = require('../middlewares/validation.js');

const router = Router();
const pgController = new PgController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * @swagger
 * /api/pg/:
 *   get:
 *     summary: Lista todas las bases de datos
 *     tags: [PostgreSQL]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de bases de datos
 */
router.get('/', pgController.getDatabase);

/**
 * @swagger
 * /api/pg/{name}:
 *   get:
 *     summary: Crea un backup de la base de datos especificada
 *     tags: [PostgreSQL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre de la base de datos (solo letras, números, _)
 *     responses:
 *       200:
 *         description: Backup creado
 *       400:
 *         description: Nombre inválido
 */
router.get('/:name', validateDbName, pgController.meackBackup);

/**
 * @swagger
 * /api/pg/restore/{name}:
 *   post:
 *     summary: Restaura una base de datos desde un backup
 *     tags: [PostgreSQL]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre de la base de datos destino
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               backupFile:
 *                 type: string
 *                 description: Ruta del archivo .sql (opcional, si no se envía se usa el más reciente)
 *     responses:
 *       200:
 *         description: Restauración exitosa
 *       400:
 *         description: Datos inválidos
 */
router.post('/restore/:name', validateDbName, validateBackupFile, pgController.restoreBackup);

module.exports = router;