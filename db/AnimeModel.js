const mongoose = require('mongoose')

const episodeSchema = new mongoose.Schema({
    episode_number: Number,
    title: String,
    duration: String,
    aired_date: Date,
    description: String,
    video: String
});

const seasonSchema = new mongoose.Schema({
    season_number: Number,
    season_image: String,
    episodes: [episodeSchema]
});

const AnimeSchema =  new mongoose.Schema({
    title: String,
    id: String,
    description: String,
    seasons: [seasonSchema],
    image: String,
    genre: [String],
    release_date: Date,
    rating: Number
})

module.exports = mongoose.model['Anime'] || mongoose.model('Anime', AnimeSchema)