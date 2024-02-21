const mongoose = require('mongoose');

const StudioSchema = new mongoose.Schema({
    title: String,
    id: String,
    link: String,
})

module.exports = mongoose.model.Studio || mongoose.model('Studio', StudioSchema);