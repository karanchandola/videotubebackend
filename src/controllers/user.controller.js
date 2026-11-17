import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { uploadFileOnCloudinary } from "../utils/coudinary.js";
import fs from "fs";

const registerUser = asyncHandler(async (req, res) => {
    
    console.log("req.body", req.body);
    const {username, email, fullName, password} = req.body;

    if( [username, email, fullName, password].some(field => field?.trim() === "")){
        throw new ApiError(400, "All fields are required", ["username", "email", "fullName", "password"]);
    }

    const userExists = await User.findOne({
        $or: [ { username }, { email }]
    });

    if(userExists){
        throw new ApiError(409, "User already exists", ["username", "email"]);
    }

    console.log("req.files", req.files);
    console.log("avatar", req.files?.avatar?.[0]?.path);
    console.log("coverImage", req.files?.coverImage?.[0]?.path);


    const avatarLocalPath = req.files?.avatar?.[0]?.path || null;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

    if(avatarLocalPath){
        const avatarUploadRes = await uploadFileOnCloudinary(avatarLocalPath)

        if(!avatarUploadRes?.secure_url){
            throw new ApiError(500, "Failed to upload avatar image to Cloudinary");
        }

        req.body.avatar = avatarUploadRes.secure_url;
    }

    if(coverImageLocalPath){
        const coverImageUploadRes = await uploadFileOnCloudinary(coverImageLocalPath)

        if(!coverImageUploadRes?.secure_url){
            throw new ApiError(500, "Failed to upload cover image to Cloudinary");
        }

        req.body.coverImage = coverImageUploadRes.secure_url;
    }


    console.log("req.body after adding avatar and coverImage", req.body);

    const newUser = await User.create({
        username: username.toLowerCase().trim(),
        email,
        fullName,
        password,
        avatar: req.body?.avatar || "",
        coverImage: req.body?.coverImage || "",
    })

    if(!newUser){
        throw new ApiError(500, "Failed to create user");
    }

    const userCreated = await User.findById(newUser._id).select("-password -refreshToken"); //here -password and -refreshToken means we are excluding these fields from the response

    if(!userCreated){
        throw new ApiError(500, "Failed to create user");
    }

    fs.unlinkSync(avatarLocalPath); // delete the file from local storage after successful upload
    fs.unlinkSync(coverImageLocalPath);

    return res.status(201).json(
        new ApiResponse(201, "User registered successfully", userCreated)
    )
}
)

export { registerUser };