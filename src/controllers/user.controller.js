import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { deleteFileFromCloudinary, uploadFileOnCloudinary } from "../utils/coudinary.js";
import Jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "./userverification.controller.js";
import { OTP } from "../models/otp.models.js";
import mongoose from "mongoose";


const generateAccessandRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found", ["userId"]);
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save();

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Failed to generate access and refresh tokens", ["userId"]);
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // console.log("req.body", req.body);

    const { username, email, fullName, password } = req.body;

    if ([username, email, fullName, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required", ["username", "email", "fullName", "password"]);
    }

    const userExists = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (userExists) {
        throw new ApiError(409, "User already exists", ["username", "email"]);
    }

    // console.log("req.files", req.files);
    // console.log("avatar", req.files?.avatar?.[0]?.path);
    // console.log("coverImage", req.files?.coverImage?.[0]?.path);


    const avatarLocalPath = req.files?.avatar?.[0]?.path || null;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

    if (avatarLocalPath) {
        const avatarUploadRes = await uploadFileOnCloudinary(avatarLocalPath)

        if (!avatarUploadRes?.secure_url) {
            throw new ApiError(500, "Failed to upload avatar image to Cloudinary");
        }

        req.body.avatar = avatarUploadRes.secure_url;
    }

    if (coverImageLocalPath) {
        const coverImageUploadRes = await uploadFileOnCloudinary(coverImageLocalPath)

        if (!coverImageUploadRes?.secure_url) {
            throw new ApiError(500, "Failed to upload cover image to Cloudinary");
        }

        req.body.coverImage = coverImageUploadRes.secure_url;
    }


    // console.log("req.body after adding avatar and coverImage", req.body);

    const newUser = await User.create({
        username: username.toLowerCase().trim(),
        email,
        fullName,
        password,
        avatar: req.body?.avatar || "",
        coverImage: req.body?.coverImage || "https://res.cloudinary.com/dxjv0qg1k/image/upload/v1696351875/default-cover-image_ow7y6r.png",
    })

    if (!newUser) {
        throw new ApiError(500, "Failed to create user");
    }

    const userCreated = await User.findById(newUser._id).select("-password -refreshToken"); //here -password and -refreshToken means we are excluding these fields from the response

    if (!userCreated) {
        throw new ApiError(500, "Failed to create user");
    }

    return res.status(201).json(
        new ApiResponse(201, "User registered successfully", userCreated)
    )
}
)

const loginUser = asyncHandler(async (req, res) => {
    /* todo :
        1. Validata the fields are req.
        2. check if user exists or not.
        3. check password is correct or not with bcrypt
        4. if pass correct : then generate tokens.
        5. send response in secure cookies.
    */
    console.log("req.body", req.body);

    const { username, email, password } = req.body;

    // here we are using username or email for login, like optional methods login using username or email

    if (!(username || email) || !password) {
        throw new ApiError(400, "Username or email and password are required", ["username", "email", "password"]);
    }


    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User not found", ["username", "email"]);
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password); // in this we are passing the password from req.body and comparing it with the this.password which is the hashed password stored in the database

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid password", ["password"]);
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    if (!loggedInUser) {
        throw new ApiError(500, "Failed to login user");
    }

    const cookieOptions = {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, "User logged in successfully", { user: loggedInUser, accessToken, refreshToken })
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $unset: { refreshToken: 1 },
    }, { returnDocument: "after" }); // here we are unsetting the refreshToken field from the user document in the database when the user logs out, so that the refresh token is no longer valid and cannot be used to generate new access tokens.

    const cookieOptions = {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new ApiResponse(200, "User logged out successfully", {})
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers?.authorization?.replace("Bearer ", "");

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized: No refresh token provided");
    }

    try {

        const decodedToken = Jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Unauthorized: Invalid refresh token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Unauthorized: Refresh token is expired or does not match");
        }

        const { accessToken, refreshToken } = await generateAccessandRefreshTokens(user._id);

        const cookieOptions = {
            httpOnly: true,
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
                new ApiResponse(200, "Access token refreshed successfully", { accessToken, refreshToken })
            )
    } catch (error) {
        throw new ApiError(401, "Unauthorized", error?.message || ["Invalid or expired refresh token"]);
    }

})

const resetPasswordUsingOldPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required", ["oldPassword", "newPassword"]);
    }

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found", ["userId"]);
    }

    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isOldPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect", ["oldPassword"]);
    }

    user.password = newPassword;
    await user.save(); //here when we saving user data the pre save hook will be called and the password will be hashed before saving to the database

    return res.status(200).json(
        new ApiResponse(200, "Password changed successfully", {})
    )
})

const resetPasswordEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required", ["email"]);
    }

    const OTP = crypto.randomInt(100000, 1000000).toString(); // Generate a 6-digit OTP

    const subject = "Password Reset OTP";
    const text = `<p>Your OTP for password reset is: <strong>${OTP}</strong>. OTP is only valid for 5 minutes.</p>`;

    const emailResponse = await sendEmail(email, subject, text);

    if (!emailResponse) {
        throw new ApiError(500, "Failed to send password reset email");
    }

    const otpDocument = await OTP.findOneAndUpdate(
        { email },
        { otp: OTP },
        { upsert: true, returnDocument: "after" }
    )
    if (!otpDocument) {
        throw new ApiError(500, "Failed to create OTP document");
    }

    return res.status(200).json(
        new ApiResponse(200, "Password reset OTP sent successfully", { email })
    )
})

const resetPasswordUsingOTP = asyncHandler(async (req, res) => {
    const { otp, newPassword } = req.body;

    if (!(otp && newPassword)) {
        throw new ApiError(400, "Old password and new password are required", ["oldPassword", "newPassword"]);
    }

    const otpDocument = await OTP.findOne({ otp });

    if (!otpDocument) {
        throw new ApiError(400, "Invalid OTP", ["otp"]);
    }

    if (otpDocument.otp !== otp) {
        throw new ApiError(400, "Invalid OTP", ["otp"]);
    }

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found", ["userId"]);
    }

    user.password = newPassword;
    await user.save(); //here when we saving user data the pre save hook will be called and the password will be hashed before saving to the database

    await otpDocument.deleteOne(); // Delete the OTP document after successful password reset

    return res.status(200).json(
        new ApiResponse(200, "Password changed successfully", {})
    )
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, "Current user fetched successfully", req.user)
    )
})

// design update account details later based on the requirments.


const updateUserAvatar = asyncHandler(async (req, res) => {
    try {
        const avatarLocalPath = req.file?.path || null;

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar image is required", ["avatar"]);
        }

        const avatarUploadRes = await uploadFileOnCloudinary(avatarLocalPath);

        if (!avatarUploadRes?.secure_url) {
            throw new ApiError(500, "Failed to upload avatar image to Cloudinary");
        }

        const updatedUser = await User.findByIdAndUpdate(req.user?._id, {
            $set: { avatar: avatarUploadRes.secure_url }
        }, { new: true, }
        ).select("-password -refreshToken"); // return the updated user document without password and refreshToken

        if (!updatedUser) {
            throw new ApiError(500, "Failed to update user avatar");
        }

        const publicId = avatarUploadRes.secure_url.split("/").pop().split(".")[0]; // Extracting public ID from the new uploaded avatar URL

        const deleteprvAvatar = await deleteFileFromCloudinary(publicId);

        console.log("deleteprvAvatar", deleteprvAvatar); //check the response what it returns when the file is deleted successfully or not found or failed to delete. It will help to handle the error properly.

        if (deleteprvAvatar?.result !== "ok" && deleteprvAvatar?.result !== "not found") {
            throw new ApiError(500, "Failed to delete previous avatar image from Cloudinary");
        }

        return res.status(200).json(
            new ApiResponse(200, "User avatar updated successfully", updatedUser)
        );
    } catch (error) {
        throw new ApiError(500, "Failed to update user avatar", error?.message || ["avatar"]);
    }

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    try {
        const coverImageLocalPath = req.file?.path || null;

        if (!coverImageLocalPath) {
            throw new ApiError(400, "Cover image is required", ["coverImage"]);
        }

        const coverImageUploadRes = await uploadFileOnCloudinary(coverImageLocalPath);

        if (!coverImageUploadRes?.secure_url) {
            throw new ApiError(500, "Failed to upload cover image to Cloudinary");
        }

        const updatedUser = await User.findByIdAndUpdate(req.user?._id, {
            $set: { coverImage: coverImageUploadRes.secure_url }
        }, { new: true, }
        ).select("-password -refreshToken"); // return the updated user document without password and refreshToken

        if (!updatedUser) {
            throw new ApiError(500, "Failed to update user cover image");
        }

        const publicId = coverImageUploadRes.secure_url.split("/").pop().split(".")[0]; // Extracting public ID from the new uploaded avatar URL

        const deleteprvAvatar = await deleteFileFromCloudinary(publicId);

        console.log("deleteprvAvatar", deleteprvAvatar);

        if (deleteprvAvatar?.result !== "ok" && deleteprvAvatar?.result !== "not found") {
            throw new ApiError(500, "Failed to delete previous cover image from Cloudinary");
        }

        return res.status(200).json(
            new ApiResponse(200, "User cover image updated successfully", updatedUser)
        );
    } catch (error) {
        throw new ApiError(500, "Failed to update user cover image", error?.message || ["coverImage"]);
    }

})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username || username?.trim() === "") {
        throw new ApiError(400, "Username is required", ["username"]);
    }

    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        }, // in this we get list of all subscribers for the channel
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        }, // in this we get list of all channels to which the user is subscribed to
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                subscriberCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                createdAt: 1,
            }
        }
    ])

    console.log("channel", channel);

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found", ["username"]);
    }

    return res.status(200).json(
        new ApiResponse(200, "Channel profile fetched successfully", channel[0])
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id) //we used mongoose.Types.ObjectId to convert the string id to ObjectId type
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" } //we used $first to get the first element of the owner array because we know that there will be only one owner for each video
                        }
                    }
                ]

            }
        }
    ])

    if (!user?.length) {
        throw new ApiError(404, "User not found", ["userId"]);
    }

    return res.status(200).json(
        new ApiResponse(200, "Watch history fetched successfully", user[0].watchHistory)
    )
})

const deleteUserAccount = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(400, "User ID is required", ["userId"]);
    }

    const accountDeleted = await User.findByIdAndDelete(userId);

    if (!accountDeleted) {
        throw new ApiError(500, "Failed to delete user account", ["userId"]);
    }

    return res.status(200).json(
        new ApiResponse(200, "User account deleted successfully", {})
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    resetPasswordEmail,
    resetPasswordUsingOTP,
    resetPasswordUsingOldPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    deleteUserAccount
};