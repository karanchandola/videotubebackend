import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
    },
    otp: {
        type: String,
        required: true,
    }
}, { timestamps: true, expires: 300 }); // OTP expires after 5 minutes (300 seconds)

export const OTP = mongoose.model("OTP", otpSchema);