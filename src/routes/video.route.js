import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { deleteVideo, getVideoById, getVideos, getVideosById, getVideosByOwner, uploadVideo } from "../controllers/video.controller.js";

const router = Router();


router.route("/getVideoById/:videoId").get(
    getVideoById,
)

router.route("/getVideosById/:ownerId").get(
    getVideosById,
)

router.route("/getVideos").get(
    getVideos,
)


// secured routes

router.route("/uploadVideo").post(
    verifyJWT,
    upload.fields([
        { name: "video", maxCount: 1},
        { name: "thumbnail", maxCount: 1}
    ]),
    uploadVideo,
)

router.route("/deleteVideo/:videoId").delete(
    verifyJWT,
    deleteVideo,
)

router.route("/getVideosByOwner").get(
    verifyJWT,
    getVideosByOwner,
)


export default router;