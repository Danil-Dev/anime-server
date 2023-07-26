const mongoose = require('mongoose')
require('dotenv').config()
function dbConnect(){
    mongoose.connect(
        process.env.DB_URL,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // useCreateIndex: true,
        }
    ).then( () => {
        console.log("Successfully connected to MongoDB.")
    }).catch ( (e) => {
        console.log(e)
        console.log("Unable to connect to MongoDB.")
    })
}

module.exports = dbConnect