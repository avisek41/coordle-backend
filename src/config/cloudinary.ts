import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dvy2fizdf",
  api_key: process.env.CLOUDINARY_API_KEY || "688983972382638",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "3r_tnbfxNU38VsII5P8U-DZus7w",
});

export default cloudinary;
