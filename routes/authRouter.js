const { Router } = require('express');
const AuthController = require('../controller/authController');

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoint para obtener token JWT
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión y obtiene un token JWT
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 *       400:
 *         description: Faltan credenciales
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', authController.login);

module.exports = router;