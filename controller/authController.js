const { request, response } = require('express');
const jwt = require('jsonwebtoken');
const { badRequest, unauthorized, internalServer } = require('../utils/errors');

class AuthController {
  async login(req = request, res = response, next) {
    try{

        const { username, password } = req.body;
    
        if (!username || !password) {
          return next(badRequest('Usuario y contraseña son requeridos'));
        }
    
        // Validar contra variables de entorno
        const validUser = process.env.JWT_USER;
        const validPass = process.env.JWT_PASSWORD;
    
        if (username !== validUser || password !== validPass) {
          return next(unauthorized('Credenciales inválidas'));
        }
    
        // Generar token (payload simple, expira 3 horas)
        const token = jwt.sign(
          { username },
          process.env.JWT_SECRET,
          { expiresIn: '3h' }
        );
    
        res.json({
          success: true,
          token,
          expiresIn: '3h'
        });
      }catch(error){
        next(internalServer(`Error al autenticar: ${error.message}`));
      }
    }
}

module.exports = AuthController;