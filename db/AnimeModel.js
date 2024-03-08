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
    genres: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Genres' }],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Categories' }],
    release_date: Date,
    rating: Number,
    image_banner: String,
    audios: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Audio"
    }],
    studio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Studio"
    }
})

module.exports = mongoose.model['Anime'] || mongoose.model('Anime', AnimeSchema)