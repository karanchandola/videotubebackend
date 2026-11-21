import { Resend } from "resend";
import { asyncHandler } from "../utils/asynchandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { OTP } from "../models/otp.models.js";
import { User } from "../models/user.models.js";
import nodemailer from "nodemailer";
import crypto from "crypto";


// using this later for sending email, but for now we are using nodemailer
// const sendEmail = async (to, subject, text) => {
//     const resend = new Resend(process.env.RESEND_API_KEY);

//     const emailResponse = await resend.emails.send({
//         from: 'onboarding@resend.dev',
//         to: to,
//         subject: subject,
//         html: text,
//     });

//     return emailResponse;
// }


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async(to, subject, text) => {
    const mailOptions = {
        from : process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: text,
    }

    const emailResponse = await transporter.sendMail(mailOptions);

    return emailResponse;
}

// we can use same fucntion for sending verfication email, and also for resend otp 
const sendVerificationEmail = asyncHandler(async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new ApiError(400, "Email is required", ["email"]);
        }

        const OTp = crypto.randomInt(100000, 1000000).toString(); // Generate a 6-digit OTP

        const subject = "Email Verification";
        const text = `<p>Your OTP for email verification is: <strong>${OTp}</strong>. OTP is only valid for 5 minutes.</p>`;

        const emailResponse = await sendEmail(email, subject, text);

        // console.log("Email response:", emailResponse);

        if (!emailResponse) {
            throw new ApiError(500, "Failed to send verification email");
        }

        const otpDocument = await OTP.findOneAndUpdate(
            { email },
            { otp: OTp, createdAt: new Date() },
            { upsert: true, returnDocument: "after" }
        );

        if (!otpDocument) {
            throw new ApiError(500, "Failed to create OTP document");
        }

        return res.status(200).json(
            new ApiResponse(200, "Verification email sent successfully", { email })
        )

    } catch (error) {
        throw new ApiError(500, "Failed to send verification email", error?.message || ["verification"]);
    }
})

const verifyUser = asyncHandler(async (req, res) => {
    try {
        const { email, otp } = req.body;

        if(!email) {
            throw new ApiError(400, "Email is required", ["email"]);
        }

        const otpDocument = await OTP.findOne({ email });

        if(!otpDocument) {
            throw new ApiError(400, "OTP not found for the provided email", ["otp"]);
        }

        if(otpDocument.otp !== otp) {
            throw new ApiError(400, "Invalid OTP", ["otp"]);
        }

        const user = await User.findOneAndUpdate(
            { email },
            { verified: true },
            { returnDocument: "after" }
        ).select("-password -refreshToken"); // Exclude sensitive fields

        if(!user) {
            throw new ApiError(404, "User not found", ["user"]);
        }

        await otpDocument.deleteOne(); // Delete the OTP document after successful verification

        return res.status(200).json(
            new ApiResponse(200, "User verified successfully", { user })
        );


    } catch (error) {
        throw new ApiError(500, "Failed to verify user", error?.message || ["verification"]);
    }
})

export { sendVerificationEmail, verifyUser, sendEmail };