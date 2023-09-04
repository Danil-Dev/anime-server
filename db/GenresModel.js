const mongoose = require("mongoose");


const GenreSchema = new mongoose.Schema({
    title: String,
    name: String,
});

module.exports = mongoose.model.Genres || mongoose.model("Genres", GenreSchema)

