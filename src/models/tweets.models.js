import mongoose from "mongoose";

const tweetSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner ID is required"],
    },
    content: {
        type: String,
        required: [true, "Content is required"],
        maxlength: [850, "Content cannot exceed 850 characters"],
    },
}, { timestamps: true });

export const Tweet = mongoose.model("Tweet", tweetSchema);