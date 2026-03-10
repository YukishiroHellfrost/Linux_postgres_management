const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Bases de datos',
      version: '1.0.0',
      description: 'Documentación de la API para gestión de Bases de datos',
    },
    servers: [
      {
        url: `http://${process.env.HOST}:${process.env.PORT}`, // Ajusta según tu configuración
        description: 'Servidor local',
      },
    ],
    components: {
      schemas: {
        Pg: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'solutel' },
          

          },
          required: ['name'],
        },
        Error: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: false },
            mensaje: { type: 'string', example: 'Error al manejar la base de datos' },
            error: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'], // Archivos donde buscar comentarios JSDoc
};

module.exports = swaggerJSDoc(options);