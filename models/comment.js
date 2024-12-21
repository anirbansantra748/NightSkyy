const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    text: String,
    createdAt: { type: Date, default: Date.now },
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
    },
    post: {  // Add this reference to link the comment to a specific post
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    }
});

module.exports = mongoose.model('Comment', CommentSchema);
