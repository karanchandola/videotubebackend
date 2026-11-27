import ApiError from "../utils/ApiError";
import { Like } from "../models/likes.models";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asynchandler";
import { Video } from "../models/video.models";
import { Tweet } from "../models/tweets.models";


const getLikes = asyncHandler(async (req, res) => {
    const { targetId } = req.params;

    if (!targetId) {
        res.status(400);
        throw new ApiError(400, "Target ID is required");
    }

    const likes = await Like.countDocuments({ targetId: targetId });
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
        throw new ApiError(400, "Target ID and type are required");
    }

    switch (type) {
        case "Video":
            const video = await Video.exists({ _id: targetId });
            if (!video) {
                res.status(404);
                throw new ApiError(404, "Video not found");
            }
            break;
        case "Comment":
            const comment = await Comment.exists({ _id: targetId });
            if (!comment) {
                res.status(404);
                throw new ApiError(404, "Comment not found");
            }
            break;
        case "Tweet":
            const tweet = await Tweet.exists({ _id: targetId });
            if (!tweet) {
                res.status(404);
                throw new ApiError(404, "Tweet not found");
            }
            break;
        default:
            res.status(400);
            throw new ApiError(400, "Invalid type. Type must be either video, comment, or tweet");
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
        throw new ApiError(400, "Target ID is required");
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

const getLikedContent = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const likedContent = await Like.find({ likeBy: userId }).populate("targetId");

    if (!likedContent) {
        res.status(404);
        throw new ApiError(404, "No liked content found for the user");
    }

    return res.status(200).json(
        new ApiResponse(200, "Liked content retrieved successfully", likedContent)
    )
})


export {
    getLikes,
    setLikes,
    removeLikes,
    getLikedContent,
}


