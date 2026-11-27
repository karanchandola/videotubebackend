import mongoose from "mongoose";


const likeSchema = new mongoose.Schema({
    likeBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"],
    },
    type: {
        type: String,
        enum: ["Video", "Comment", "Tweet"],
        required: [true, "Type is required"],
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "types", // here we are using refPath to dynamically reference the target model based on the type field which can only be video, comment, or tweet. This allows us to create a polymorphic relationship where a like can belong to different types of content.
        required: [true, "Target ID is required"],
    }
}, { timestamps: true });

export const Like = mongoose.model("Like", likeSchema);