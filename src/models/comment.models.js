import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, "Content is required"],
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        required: [true, "Video ID is required"],
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner ID is required"],
    }
}, { timestamps: true });


export const Comment = mongoose.model("Comment", commentSchema);