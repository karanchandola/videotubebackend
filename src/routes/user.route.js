import { Router } from "express";
import { registerUser, logoutUser, loginUser, refreshAccessToken, getCurrentUser, updateUserAvatar, updateUserCoverImage, resetPasswordUsingOldPassword, resetPasswordEmail, resetPasswordUsingOTP, getUserChannelProfile, deleteUserAccount, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { sendVerificationEmail, verifyUser } from "../controllers/userverification.controller.js";
 
const router = Router();


router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1},
        { name: "coverImage", maxCount: 1}
    ]),
    registerUser
);

router.route("/login").post( loginUser );


// secured routes

router.route("/verificationOTP").post(
    verifyJWT,
    sendVerificationEmail,
)

router.route("/verifyUser").post(
    verifyJWT,
    verifyUser,
)

router.route("/logout").post(
    verifyJWT,
    logoutUser,
);

router.route("/refreshToken").post(
    refreshAccessToken,
)

router.route("/resetPassword").post(
    verifyJWT,
    resetPasswordUsingOldPassword,
)
 
router.route("/getCurrentUser").get(
    verifyJWT, 
    getCurrentUser,
)

router.route("/updateAvatar").post(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar,
)

router.route("/updateCoverImage").post(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage,
)

router.route("/resetPasswordOTP").post(
    resetPasswordEmail,
)

router.route("/resetPasswordUsingOTP").post(
    resetPasswordUsingOTP,
)

router.route("/getWatchHistory").get(
    verifyJWT,
    getWatchHistory,
)

router.route("/getUserChannelProfile/:username").get(
    verifyJWT,
    getUserChannelProfile,
)

router.route("/deleteUserAccount").delete(
    verifyJWT,
    deleteUserAccount,
)

export default router;
