import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getPlaylistsByOwner, getVideosFromPlaylist } from "../controllers/playlist.controllers.js";

const router = Router();

router.route("/getPlaylistsById/:playlistId").get(
    getPlaylistById,
)

router.route("/getVideosFromPlaylist/:playlistId").get(
    getVideosFromPlaylist,
)

// secured routes

router.route("/createPlaylist").post(
    verifyJWT,
    createPlaylist,
)

router.route("/addVideoToPlaylist/:playlistId").post(
    verifyJWT,
    addVideoToPlaylist,
)

router.route("/getPlaylistsByOwner").get(
    verifyJWT,
    getPlaylistsByOwner,
)

router.route("/deletePlaylist/:playlistId").delete(
    verifyJWT,
    deletePlaylist,
)



export default router;