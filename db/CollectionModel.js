const mongoose = require('mongoose')

const animeCollectionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    animeIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Anime'
    }]
});

module.exports = mongoose.model['Collection'] || mongoose.model('Collection', animeCollectionSchema);