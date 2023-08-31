const mongoose = require('mongoose')




const AnimeSchema =  new mongoose.Schema({
    title: String,
    id: String,
    description: String,
    episodes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Episodes"
    }],
    image: String,
    genre: [String],
    release_date: Date,
    categories: [String],
    rating: Number
})

module.exports = mongoose.model['Anime'] || mongoose.model('Anime', AnimeSchema)