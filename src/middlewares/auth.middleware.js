import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynchandler.js";
import Jwt from "jsonwebtoken"


// here we can replace res as _ also
export const verifyJWT = asyncHandler(async (req, _, next) => {

    try {
        const token = req.cookies?.accessToken || req.headers?.authorization?.replace("Bearer ", "");
        
        if (!token) {
            throw new ApiError(401, "Unauthorized: No token provided");
        }

        const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Unauthorized: User not found");
        }
        req.user = user; // attach the user object to the request for further use in the route handlers
        next();
    } catch (error) {
        throw new ApiError(401, "Unauthorized", ["Invalid or expired token"]);
    }
})