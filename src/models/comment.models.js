import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, "Content is required"],
    },
    type: {
        type: String,
        enum: ["Video", "Comment", "Tweet"],
        required: [true, "Type is required"],
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "types", // here we are using refPath to dynamically reference the target model based on the type field which can only be video or tweet. This allows us to create a polymorphic relationship where a comment can belong to different types of content.
        required: [true, "Target ID is required"],
    },
    owner: {    
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Owner ID is required"],
    }
}, { timestamps: true });

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);