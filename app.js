
require('dotenv').config();
const Server = require("./config/server-config")

const main=()=>{
    const server=new Server();
    server.listen()
}

main();