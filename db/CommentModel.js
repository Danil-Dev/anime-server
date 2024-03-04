const mongoose = require("mongoose");

const CommentModel = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    commentType: {
        type: String,
        enum: ['Anime', 'Episode'],
        required: true
    },
    forId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now()
    }
})

module.exports = mongoose.model['Comment'] || mongoose.model('Comment', CommentModel)