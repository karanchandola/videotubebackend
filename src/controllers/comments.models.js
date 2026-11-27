import { asyncHandler } from "../utils/asynchandler";
import { Comment } from "../models/comment.models";
import { ApiResponse } from "../utils/ApiResponse";
import { Video } from "../models/video.models";
import { Tweet } from "../models/tweets.models";


const addComment = asyncHandler(async (req, res) => {
    const { targetId } = req.params; // targetId can be videoId, tweetId, or commentId depending on the type of comment
    const { content, type } = req.body;
    const userId = req.user?._id;

    if (!targetId || !content || !type) {
        res.status(400);
        throw new ApiError(400, "Target ID, content, and type are required");
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
            throw new ApiError(400, "Invalid type. Type must be either video, comment, or tweet");
    }

    const comment = await Comment.create({
        content,
        type,
        targetId,
        user: userId,
    })

    if (!comment) {
        res.status(500);
        throw new ApiError(500, "Failed to create comment");
    }

    res.status(201).json(
        new ApiResponse(201, "Comment added successfully", comment)
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    const comment = await Comment.findById(commentId);

    if (!comment || comment.user.toString() !== userId.toString()) {
        res.status(404);
        throw new ApiError(404, "Comment not found or you are not authorized to edit this comment");
    }

    comment.content = content;
    await comment.save();

    res.status(200).json(
        new ApiResponse(200, "Comment updated successfully", comment)
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user?._id;

    if (!commentId) {
        res.status(400);
        throw new ApiError(400, "Comment ID is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment || comment.user.toString() !== userId.toString()) {
        res.status(404);
        throw new ApiError(404, "Comment not found or you are not authorized to delete this comment");
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json(
        new ApiResponse(200, "Comment deleted successfully", comment)
    )
})

const getComments = asyncHandler(async (req, res) => {
    const { targetId } = req.params; // targetId can be videoId, tweetId, or commentId depending on the type of comment

    const { lastId, limit } = req.query;

    if (!targetId) {
        res.status(400);
        throw new ApiError(400, "Target ID is required");
    }

    const query = lastId ? { _id: { $lt: lastId } } : {};

    const comments = await Comment.aggregate([
        {
            $match: {
                targetId: mongoose.Types.ObjectId(targetId),
                ...query,
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
    ]).limit(parseInt(limit) || 10).sort({ createdAt: -1 });


    console.log("Comments retrieved:", comments);

    if(!comments || comments.length === 0) {
        res.status(404);
        throw new ApiError(404, "No comments found for the provided target ID");
    }

    const nextLastId = comments.length > 0 ? comments[comments.length - 1]._id : null;

    res.status(200).json(
        new ApiResponse(200, "Comments retrieved successfully", { comments, nextLastId })
    )

})

const getCommentByOwner = asyncHandler(async (req, res) => {
    const { lastId, limit } = req.query;
    const query = lastId ? { _id: { $lt: lastId } } : {};

    const commnent = await Comment.find({ owner: req.user._id, ...query })
        .limit(parseInt(limit) || 10)
        .sort({ _id: -1 });

    if (!commnent || commnent.length === 0) {
        res.status(404);
        throw new ApiError(404, "No comments found for the provided user ID");
    }

    res.status(200).json(
        new ApiResponse(200, "Comments retrieved successfully", commnent)
    )
})

export {
    addComment,
    updateComment,
    deleteComment,
    getComments,
    getCommentByOwner
}

