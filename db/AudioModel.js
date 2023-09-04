const mongoose = require('mongoose');

const AudioSchema = new mongoose.Schema({
    title: String,
    name: String,
    language: String,
})

module.exports = mongoose.model.Audio || mongoose.model('Audio', AudioSchema);