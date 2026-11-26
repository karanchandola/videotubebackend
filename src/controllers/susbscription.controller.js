import { Subscription } from "../models/subscription.models.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";



const addSubscriber = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const userId = req.user?.id;

    if (!channelId) {
        res.status(400);
        throw new ApiError(400, "Channel ID is required");
    }

    const subscription = await Subscription.create({
        channel: channelId,
        subscriber: userId,
    })

    if (!subscription) {
        res.status(500);
        throw new ApiError(500, "Failed to create subscription");
    }

    res.status(201).json(
        new ApiResponse(201, "Subscription successful", subscription)
    )
})


const removeSubscriber = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user?.id;

    if (!channelId) {
        res.status(400);
        throw new ApiError(400, "Channel ID is required");
    }

    const subscription = await Subscription.findOneAndDelete({
        channel: channelId,
        subscriber: userId,
    });

    if (!subscription) {
        res.status(404);
        throw new ApiError(404, "Subscription not found");
    }

    res.status(200).json(
        new ApiResponse(200, "Unsubscribed successfully", subscription)
    )
})




export {
    addSubscriber,
    removeSubscriber,
}