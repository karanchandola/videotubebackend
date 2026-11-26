import ApiError from "../utils/ApiError";
import { Like } from "../models/likes.models";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asynchandler";


const getLikes = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        res.status(400);
        throw new ApiError(400, "Video ID is required");
    }

    const likes = await Like.find({ targetId: videoId });
    res.status(200).json(
        new ApiResponse(200, "Likes retrieved successfully", likes)
    )
})

const setLikes = asyncHandler(async (req, res) => {
    const { targetId } = req.params;
    const { type } = req.body;

    const userId = req.user?._id;

    if (!targetId || !type) {
        res.status(400);
        throw new ApiError(400, "Video ID and type are required");
    }

    // switch (type) {
    //     case "video":
    //         const video = await Video.findById(targetId);
    //         if (!video) {
    //             res.status(404);
    //             throw new ApiError(404, "Video not found");
    //         }
    //         break;
    //     case "comment":
    //         const comment = await Comment.findById(targetId);
    //         if (!comment) {
    //             res.status(404);
    //             throw new ApiError(404, "Comment not found");
    //         }
    //         break;
    //     case "tweet":
    //         const tweet = await Tweet.findById(targetId);
    //         if (!tweet) {
    //             res.status(404);
    //             throw new ApiError(404, "Tweet not found");
    //         }
    //         break;
    //     default: 
    //         throw new ApiError(400, "Invalid type. Type must be either video, comment, or tweet");
    // } 
    // we can use switch case method also this is simple but we are going with model's custom validation method because we have already defined the enum in the model so we don't need to check it here again.

    if(type !== "Video" && type !== "Comment" && type !== "Tweet") {
        res.status(400);
        throw new ApiError(400, "Invalid type. Type must be either Video, Comment, or Tweet");
    }

    const like = await Like.create({
        likeBy: userId,
        type,
        targetId: targetId,
    })

    if (!like) {
        res.status(500);
        throw new ApiError(500, "Failed to create like");
    }

    res.status(201).json(
        new ApiResponse(201, "Like created successfully", like)
    )
})

const removeLikes = asyncHandler(async (req, res) => {
    const { targetId } = req.params;

    const userId = req.user?._id;

    if (!targetId) {
        res.status(400);
        throw new ApiError(400, "Video ID is required");
    }

    const like = await Like.findOneAndDelete({ likeBy: userId, targetId: targetId }); // we are not passing type here because every obj. contain idv. _id, so we can find the like by userId and targetId only.

    if (!like) {
        res.status(404);
        throw new ApiError(404, "Like not found");
    }

    return res.status(200).json(
        new ApiResponse(200, "Like removed successfully", like)
    )
})


export {
    getLikes,
    setLikes,
    removeLikes,
}


