import cloudinary from "../config/cloudinary";

export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

export interface ProfilePhotoData {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  thumbnailUrl: string;
}

/**
 * Upload profile photo directly from buffer
 */
export const uploadProfilePhoto = async (
  buffer: Buffer,
  userId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: string;
  }
): Promise<ProfilePhotoData> => {
  try {
    const uploadOptions = {
      folder: `coordle/users/${userId}/profile`,
      public_id: `profile_${userId}_${Date.now()}`,
      transformation: [
        {
          width: options?.width || 500,
          height: options?.height || 500,
          crop: "fill",
          gravity: "face",
        },
        {
          quality: options?.quality || "auto",
          fetch_format: "auto",
        },
      ],
      overwrite: true,
      resource_type: "image" as const,
    };

    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(uploadOptions, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result as CloudinaryUploadResult);
            }
          })
          .end(buffer);
      }
    );

    // Generate thumbnail URL
    const thumbnailUrl = cloudinary.url(result.public_id, {
      width: 150,
      height: 150,
      crop: "fill",
      gravity: "face",
      quality: "auto",
      fetch_format: "auto",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      thumbnailUrl,
    };
  } catch (error) {
    throw new Error(`Failed to upload profile photo: ${error}`);
  }
};

/**
 * Delete profile photo from Cloudinary
 */
export const deleteProfilePhoto = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new Error(`Failed to delete profile photo: ${error}`);
  }
};

/**
 * Generate optimized URL for existing image
 */
export const getOptimizedImageUrl = (
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  }
): string => {
  return cloudinary.url(publicId, {
    width: options?.width,
    height: options?.height,
    crop: options?.crop || "fill",
    quality: options?.quality || "auto",
    fetch_format: "auto",
  });
};

/**
 * Extract public ID from Cloudinary URL
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    const matches = url.match(/\/v\d+\/(.+)\.[a-z]+$/);
    return matches ? matches[1] || null : null;
  } catch (error) {
    return null;
  }
};
