import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { deleteFileFromCloudinary, uploadFileOnCloudinary } from "../utils/coudinary.js";
import { View } from "../models/views.model.js";


const uploadVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description, duration, isPublic } = req.body;

        if (!title || !description || !duration || !isPublic) {
            res.status(400);
            throw new Error("Please provide all required fields");
        }

        const videoLocalPath = req.files?.video?.[0]?.path || null;
        const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path || null;

        if (!videoLocalPath || !thumbnailLocalPath) {
            res.status(400);
            throw new Error("Please provide both video and thumbnail files");
        }

        const isVideoUploaded = await uploadFileOnCloudinary(videoLocalPath);

        if (!isVideoUploaded || !isVideoUploaded.secure_url) {
            res.status(500);
            throw new Error("Video upload failed");
        }

        const isThumbnailUploaded = await uploadFileOnCloudinary(thumbnailLocalPath);

        if (!isThumbnailUploaded || !isThumbnailUploaded.secure_url) {
            res.status(500);
            throw new Error("Thumbnail upload failed");
        }

        console.log("Video uploaded successfully:", isVideoUploaded.secure_url);
        console.log("Thumbnail uploaded successfully:", isThumbnailUploaded.secure_url);

        const video = await Video.create({
            title,
            description,
            duration,
            owner: req.user?._id,
            videoFile: isVideoUploaded.secure_url,
            thumbnail: isThumbnailUploaded.secure_url,
            isPublic: isPublic || true,
        })
        console.log("Video document created successfully:", video);

        if (!video) {
            res.status(500);
            throw new Error("Video upload failed");
        }

        res.status(201).json(
            new ApiResponse(201, "Video uploaded successfully", video)
        )

    } catch (error) {
        throw new ApiError(500, "Internal Server Error during video upload", error.message);
    }


})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        res.status(400);
        throw new Error("Video ID is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        res.status(404);
        throw new Error("Video not found");
    }

    const isOwner = video.owner.toString() === req.user?._id.toString();

    if (!isOwner) {
        res.status(403);
        throw new Error("You are not authorized to delete this video");
    }

    const videoCloudinaryId = video.videoFile.split("/").pop().split(".")[0]; // extract the public_id from the video URL

    const thumbnailCloudinaryId = video.thumbnail.split("/").pop().split(".")[0]; // extract the public_id from the thumbnail URL

    const isVideoDeleted = await video.deleteOne();

    if (!isVideoDeleted) {
        res.status(500);
        throw new Error("Failed to delete video");
    }

    await deleteFileFromCloudinary(videoCloudinaryId);
    await deleteFileFromCloudinary(thumbnailCloudinaryId);

    res.status(200).json(
        new ApiResponse(200, "Video deleted successfully", { videoId })
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        res.status(400);
        throw new Error("Video ID is required");
    }

    const video = await Video.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(videoId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "subscriber",
                            as: "subscribers",
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$ownerDetails" },
                subscribersCount: { $size: "$ownerDetails.subscribers" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        }
    ])

    console.log("Video fetched successfully:", video);

    if (!video || video.length === 0) {
        res.status(404);
        throw new Error("Video not found");
    }

    if (!video[0].isPublic && video[0].owner._id.toString() !== req.user?._id.toString()) {
        res.status(403);
        throw new Error("You are not authorized to view this video");
    } // this cond. is to check if the video is private and the user is not the owner of the video, then throw an error

    res.status(200).json(
        new ApiResponse(200, "Video fetched successfully", video[0])
    );
})

// here we are getting video for any user based on their id
const getVideosByChannelId = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const limit = parseInt(req.query?.limit) || 10; // default limit is 10
    const { lastId } = req.query;

    if (!channelId) {
        res.status(400);
        throw new Error("Channel ID is required");
    }

    const query = lastId ? { _id: { $lt: lastId } } : {};

    const videos = await Video.find({ owner: channelId, isPublic: true, ...query })
        .limit(limit)
        .sort({ _id: -1 })
        .select("-owner -description -isPublic -updatedAt");


    if (!videos || videos.length === 0) {
        res.status(404);
        throw new Error("No videos found");
    }

    const nextLastID = videos[videos.length - 1]._id; // get the last video id to be used as lastId in the next request

    res.status(200).json(
        new ApiResponse(200, "Videos fetched successfully", { videos, nextLastID })
    );
});

const getVideosByOwner = asyncHandler(async (req, res) => {
    const { lastId, limit } = req.query;

    const query = lastId ? { _id: { $lt: lastId } } : {};

    const videos = await Video.find({ owner: req.user?._id, ...query })
        .select("-owner -description -updatedAt").limit(parseInt(limit) || 10).sort({ _id: -1 });

    if (!videos || videos.length === 0) {
        res.status(404);
        throw new Error("No videos found");
    }

    return res.status(200).json(
        new ApiResponse(200, "Videos fetched successfully", { videos })
    );
})

// here we are using cursur based pagination to fetch videos, so that we can fetch videos in chunks and not all at once, which will be helpful in case of large number of videos
const getVideos = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query?.limit) || 10; // default limit is 10
    const { lastId } = req.query; // here if lastId is provided, then we will fetch videos which are less than lastId, else we will fetch videos from the beginning within limit.

    const query = lastId ? { _id: { $lt: lastId } } : {};

    const videos = await Video.aggregate([
        {
            $match: query
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [{
                    $project: {
                        username: 1,
                        avatar: 1,
                    }
                }]
            }
        },
        {
            $addFields: {
                owner: { $first: "$ownerDetails" }
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                views: 1,
                duration: 1,
                thumbnail: 1,
                createdAt: 1,
                videoFile: 1,
                owner: 1,
            } // here we are not taking owner details in the response because we are already taking it in the previous step, so we don't need to take it again
        }
    ]).
        limit(limit)
        .sort({ _id: -1 });

    console.log("Videos fetched successfully:", videos);

    if (!videos || videos.length === 0) {
        res.status(404);
        throw new Error("No videos found");
    }

    const nextLastID = videos[videos.length - 1]._id; // get the last video id to be used as lastId in the next request

    res.status(200).json(
        new ApiResponse(200, "Videos fetched successfully", { videos, nextLastID })
    );
})

const increaseViewsByOne = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const viewLog = await View.findOneAndUpdate(
        { video: videoId, user: req.user?._id },
        { $setOnInsert: { video: videoId, user: req.user?._id } },
        { upsert: true, returnDocument: "before" } // new: false gives us the state BEFORE the operation
    );

    if(viewLog) {
        return res.status(200).json(
            new ApiResponse(200, "View already logged for this user", { videoId })
        )
    }
    const video = await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    }, { returnDocument: "after" });

    if (!video) {
        res.status(404);
        throw new Error("Video not found");
    }

    return res.status(200).json(
        new ApiResponse(200, "Video views increased successfully", { video })
    )
})

const togglePublic = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);

    if (!video) {
        res.status(404);
        throw new Error("Video not found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        res.status(403);
        throw new Error("You are not authorized to toggle the public status of this video");
    }

    video.isPublic = !video.isPublic;
    await video.save();

    return res.status(200).json(
        new ApiResponse(200, "Video public status toggled successfully", { video })
    )
})

export {
    uploadVideo,
    getVideoById,
    getVideos,
    getVideosByChannelId,
    deleteVideo,
    getVideosByOwner,
    increaseViewsByOne,
    togglePublic,
}