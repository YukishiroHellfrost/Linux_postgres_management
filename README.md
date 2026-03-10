# Requisitos para que funcione
Tener instalado PostgreSQL
Tener Node v20.13.1(esta es la que usé)
Recordar usar el comando en la raiz npm install
Iniciar con npm start o node app.js
# Variables de entorno
Están muy pero que muy explícitas igual te explico
PORT=Puerto en que corre la aplicación ejemplo:8080
HOST=Host de la aplicación ejemplo: localhost
DB_PORT=Puerto de la base de datos ejemplo: 5432
DB_HOST=Host donde se encuentra alojada la base de datos
DB_USER=Usuario de la base de datos
DB_PASS=Contraseña de la base de datos
DB_NAME=Nombre de la base de datos(esto creo que ni lo uso XD pero lo tenía puesto en la plantilla pon 1 por si acaso)
BACKUP_DIR=Dirección donde quieres que se guarde el backup
JWT_USER=Nombre de usuario para autenticación de la jwt
JWT_PASSWORD=Contraseña para la autenticación jwt
JWT_SECRET=Clave secreta de jwt
# Swagger
La ruta para ver el swagger es http://${process.env.HOST}:${process.env.PORT}/api-docs
# JWT
La clave se está guardando en los headers en Authorization si tienes problema con esto puede comentar la línea 10 de routes/pgRouter
# Final
Disfruta de la aplicación.
