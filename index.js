//require
const http = require('http')
const dotenv = require('dotenv')
const app = require('./app')

//Setup environment
dotenv.config()
console.log(process.env.PORT)
const PORT = process.env.PORT
app.set('port', PORT)
const server = http.createServer(app)
server.on('listening', () => {
    const address = server.address();
    const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + PORT;
    console.log('Listening on ' + bind);
})

server.listen(PORT);
