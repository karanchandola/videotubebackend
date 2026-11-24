import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";



const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))


app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({ extended: true, limit: "16kb"}));
app.use(express.static("public"));



// routes import 

import userRouter from "./routes/user.route.js"; // here we are using diff naming in import and export because we are using default export in user.route.js file
import videoRouter from "./routes/video.route.js";

// routes declaration for user
app.use("/api/v1/users", userRouter); //it pass the req like : https://localhost:5000/api/v1/users/register

// routes declaration for video
app.use("/api/v1/videos", videoRouter); //it pass the req like : https://localhost:5000/api/v1/videos/uploadVideo

export default app;