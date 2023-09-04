const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    title: String,
    name: String,
});

module.exports = mongoose.model.Categories || mongoose.model('Categories', CategorySchema);

