import dotenv from "dotenv"
import { connectDB } from "./db/index.js"
import app from "./app.js";

dotenv.config({
    path: ".env"
})


connectDB()
.then(
    app.on("error", (err) => {
        console.error("Error connecting to MongoDB : ", err);
    }),
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port http://localhost:${process.env.PORT || 8000}`);
    })
)
.catch((err) => {
    console.error("Error connecting to MongoDB:", err);
})












































/*

import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import express from "express";

const app = express();

// in iffy funciton ; is used for clean code and to avoid any error in the code
;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (err) => {
            console.error("Error connecting to MongoDB : ", err);
        })

        app.listen(process.env.PORT, (req, res) => {
            console.log(`Server is running on port http://localhost:${process.env.PORT}`);
        })
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
})()

*/

