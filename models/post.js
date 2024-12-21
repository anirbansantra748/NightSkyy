const mongoose = require("mongoose");
const PostSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        username: String,
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment',
        },
    ],
    likes: { type: Number, default: 0 },
    likedBy:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User'
        }
    ]
});

module.exports = mongoose.model('Post', PostSchema);
