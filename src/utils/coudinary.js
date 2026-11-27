import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**     
 * Upload a file to Cloudinary
 * @param {string} filePath - The path to the file to upload
 * @returns {Promise<Object>} - A promise that resolves to the upload result
 */

export const uploadFileOnCloudinary = async (filePath) => {
    try {
        console.log("filePath", filePath);
        if (!filePath) throw new Error("File path is required for uploading to Cloudinary");

        // uploading file to cloudinary
        if (filePath.endsWith(".mp4")) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_large(
                    filePath,
                    {
                        resource_type: "video",
                        chunk_size: 6000000, // 6MB
                    },
                    (error, uploadResult) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        resolve(uploadResult);
                    }
                );
            });
            fs.unlinkSync(filePath);
            return result;
        }

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
        })
        fs.unlinkSync(filePath); // delete the file from local storage after successful upload
        return result;
    } catch (error) {
        fs.unlinkSync(filePath); // delete the file from local storage if upload fails
        throw new Error(error.message);
    }
}

export const deleteFileFromCloudinary = async (publicId) => {
    try {

        if (!publicId) throw new Error("Public ID is required for deleting from Cloudinary");

        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
}