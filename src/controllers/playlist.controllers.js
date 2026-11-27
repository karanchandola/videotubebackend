import Jwt from "jsonwebtoken";
import { Playlist } from "../models/playlist.models.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { title, description, visibility } = req.body;

    if (!title) {
        res.status(400);
        throw new ApiError(400, "Playlist title is required");
    }

    const playlist = await Playlist.create({
        title,
        description,
        owner: req.user?._id,
        visibility: visibility || "public", // default to public if not provided
    })

    if (!playlist) {
        res.status(500);
        throw new ApiError(500, "Failed to create playlist");
    }

    res.status(201).json(
        new ApiResponse(201, "Playlist created successfully", playlist)
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    const playlist = await Playlist.findOneAndDelete({
        _id: playlistId,
        owner: req.user?._id,
    });

    if (!playlist) {
        res.status(404);
        throw new ApiError(404, "Playlist not found or you do not have permission to delete it");
    }

    res.status(200).json(
        new ApiResponse(200, "Playlist deleted successfully", playlist)
    )
})

const getPlaylistsByOwner = asyncHandler(async (req, res) => {
    const playlists = await Playlist.find({ owner: req.user?._id }).select("-videos"); // excluding the videos field as this endpoint is just to get the list of playlists, so to make it lightweight we are excluding the videos field.

    if (!playlists) {
        res.status(404);
        throw new ApiError(404, "No playlists found for this user");
    }

    res.status(200).json(
        new ApiResponse(200, "Playlists retrieved successfully", playlists)
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    const playlist = await Playlist.findOne({
        _id: playlistId,
    }); // Populate the videos array with video details

    if (!playlist) {
        res.status(404);
        throw new ApiError(404, "Playlist not found or you do not have permission to view it");
    }

    if (playlist.visibility === "private") {

        // we are using the same logic as in verifyJWT middleware to get the userId from the token, because we are not using verifyJWT middleware here, so we need to manually decode the token and get the userId from it.
        const token = req.cookies?.accessToken || req.headers?.authorization?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized: No token provided");
        }

        const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        const currentUserId = user?._id;

        if (!currentUserId) {
            res.status(401);
            throw new ApiError(401, "Unauthorized: User not authenticated");
        }

        if (playlist.owner.toString() !== currentUserId.toString()) {
            res.status(403);
            throw new ApiError(403, "Forbidden: You do not have permission to view this private playlist");
        }
    }

    playlist.videos = await Promise.all(playlist.videos.map(async (videoId) => {
        const video = await Video.findById(videoId);
        return video;
    }));

    res.status(200).json(
        new ApiResponse(200, "Playlist retrieved successfully", playlist)
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    const playlist = await Playlist.findOneAndUpdate(
        { _id: playlistId, owner: req.user?._id },
        { name, description },
        { returnDocument: "after" },
    );

    if (!playlist) {
        res.status(404);
        throw new ApiError(404, "Playlist not found or you do not have permission to update it");
    }

    res.status(200).json(
        new ApiResponse(200, "Playlist updated successfully", playlist)
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { videoId } = req.body;

    if (!videoId) {
        res.status(400);
        throw new ApiError(400, "Video ID is required to add to playlist");
    }

    const videoExists = await Video.exists({ _id: videoId });

    if (!videoExists) {
        res.status(404);
        throw new ApiError(404, "Video not found");
    }

    if(videoExists.isPublic === false && videoExists.owner.toString() !== req.user?._id.toString()) {
        res.status(403);
        throw new ApiError(403, "Forbidden: You do not have permission to add this private video to the playlist");
    }// Checking if the video is private and if the current user is the owner of the video. If not, throw a 403 error.

    const playlist = await Playlist.findOneAndUpdate(
        { _id: playlistId, owner: req.user?._id },
        { $addToSet: { videos: videoId } }, // $addToSet ensures no duplicates
        { returnDocument: "after" }
    );

    if (!playlist) {
        res.status(404);
        throw new ApiError(404, "Playlist not found or you do not have permission to modify it");
    }

    res.status(200).json(
        new ApiResponse(200, "Video added to playlist successfully", playlist)
    )
})

const getVideosFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    const playlist = await Playlist.findOne({
        _id: playlistId,
        owner: req.user?._id,
    }).populate("videos");

    console.log("Retrieved playlist:", playlist); // Debugging line

    if (!playlist) {
        res.status(404);
        throw new ApiError(404, "Playlist not found or you do not have permission to view it");
    }

    res.status(200).json(
        new ApiResponse(200, "Videos retrieved from playlist successfully", playlist.videos)
    )
})


export {
    createPlaylist,
    deletePlaylist,
    getPlaylistsByOwner,
    getPlaylistById,
    updatePlaylist,
    addVideoToPlaylist,
    getVideosFromPlaylist,
}