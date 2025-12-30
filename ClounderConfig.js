import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Cloudinary configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// -----------------------------
// Upload file to Cloudinary
// -----------------------------
export async function UploadFile(filepath) {
    try {
        const uploadResult = await cloudinary.uploader.upload(filepath, {
            resource_type: 'auto'
        });

        // Delete local file after successful upload
        fs.unlink(filepath, (err) => {
            if (err) console.log(`Failed to delete local file: ${filepath}`, err);
        });

        return {
            mediaurl: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            resource_type: uploadResult.resource_type,
            format: uploadResult.format,
            ok: true
        };
    } catch (error) {
        console.log("Failed to upload media:", error.message);
        throw new Error(error.message);
    }
}

// -----------------------------
// Delete file from Cloudinary
// -----------------------------
export async function DeleteFile(public_id) {
    try {
        const result = await cloudinary.uploader.destroy(public_id, { resource_type: 'auto' });
        return { msg: "Successfully deleted file", result, ok: true, public_id };
    } catch (err) {
        console.log("Failed to delete media:", err.message);
        throw new Error(err.message);
    }
}
