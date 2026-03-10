const express = require('express');
const cors=require("cors");
const { db,connectDB}=require("./bd_config.js")
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger_config.js')
const { notFoundHandler, errorHandler } = require('../middlewares/error_handler.js');

 
class Server{
    constructor(){
        this.app=express()
        this.port=process.env.PORT

        // Conectar base de datos
        this.db_listen()

        //Ejecutar Middlewares
        this.middleware();
        //Ejecutar rutas
        this.routes();
        //Ejecutar handlers de error
        this.errorHandling()
    }

    middleware(){
        //Implementar los JSON en expres
        this.app.use(express.json())
        //Aplicación de Cors
        this.app.use(cors())
        // Ruta para Swagger UI
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    }
    routes(){
        this.app.use("/api/pg",require("../routes/pgRouter.js"))
        this.app.use('/api/auth', require('../routes/authRouter.js'));
    }
    errorHandling() {
        this.app.use(notFoundHandler);
        this.app.use(errorHandler);
      }
    listen(){
        this.app.listen(this.port,()=>{
            console.log("Ecuchando puerto", this.port)
        })
    }
    async db_listen(){
        
    }
}
module.exports=Server;