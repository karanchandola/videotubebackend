import mongoose from "mongoose";


// in this schema we are storing individual subscribers data for each channel, so that we can easily get the list of subscribers for a channel and also check if a user is subscribed to a channel or not. and also due to the 16mb limit of mongodb document size, we cannot store all the subscribers in a single document for a channel, so we are storing each subscriber in a separate document. and also we can easily get the list of subscribers for a channel by querying the subscription collection with channel id.

const subscriptionSchema = new mongoose.Schema({
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    subscriber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

subscriptionSchema.index({ channel: 1, subscriber: 1 }, { unique: true }); // to ensure that a user can subscribe to a channel only once



const Subscription = mongoose.model("Subscription", subscriptionSchema);