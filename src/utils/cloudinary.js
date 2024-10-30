import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

async function uploadOnCloudinary(localFilePath) {
  try {
    if (!localFilePath) throw new Error("Colud not find the file path");
    // upload the file on cloudinary
    const res = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    fs.unlinkSync(localFilePath);
    return res;
  } catch (error) {
    if (localFilePath) fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return error;
  }
}

async function destoryOnCloudinary(publicId) {
  await await cloudinary.v2.uploader.destroy(publicId);
}
export { uploadOnCloudinary, destoryOnCloudinary };
