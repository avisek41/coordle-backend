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
  pages?: number; // Optional property for PDF page count
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

export interface DocumentUploadData {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pages?: number | undefined;
}

/**
 * Upload document (PDF, images, or other supported file types)
 */
export const uploadDocument = async (
  buffer: Buffer,
  userId: string,
  originalFileName: string,
  documentType: string,
  options?: {
    quality?: string;
    pages?: number;
  }
): Promise<DocumentUploadData> => {
  try {
    const fileExtension = originalFileName.split(".").pop()?.toLowerCase();
    const timestamp = Date.now();
    const fileName = `${documentType}_${timestamp}`;

    // Determine resource type based on file extension
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(
      fileExtension || ""
    );
    const isPdf = fileExtension === "pdf";
    const isDoc = ["doc", "docx"].includes(fileExtension || "");

    let resourceType: "image" | "raw" = "raw";
    let uploadOptions: any = {
      folder: `coordle/users/${userId}/documents`,
      public_id: fileName,
      overwrite: false,
      resource_type: resourceType,
    };

    // Configure upload options based on file type
    if (isImage) {
      resourceType = "image";
      uploadOptions = {
        ...uploadOptions,
        resource_type: "image",
        transformation: [
          {
            quality: options?.quality || "auto",
            fetch_format: "auto",
          },
        ],
      };
    } else if (isPdf) {
      uploadOptions = {
        ...uploadOptions,
        resource_type: "image", // PDF as image for preview
        pages: options?.pages || true, // Extract all pages or specific pages
        transformation: [
          {
            quality: options?.quality || "auto",
            fetch_format: "jpg",
          },
        ],
      };
    } else {
      // For other document types (doc, docx), store as raw
      uploadOptions = {
        ...uploadOptions,
        resource_type: "raw",
      };
    }

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

    // Determine MIME type based on file extension
    let mimeType = "application/octet-stream";
    if (isImage) {
      mimeType = `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`;
    } else if (isPdf) {
      mimeType = "application/pdf";
    } else if (fileExtension === "doc") {
      mimeType = "application/msword";
    } else if (fileExtension === "docx") {
      mimeType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      fileName: `${fileName}.${fileExtension}`,
      fileSize: result.bytes,
      mimeType,
      pages: result.pages,
    };
  } catch (error) {
    throw new Error(`Failed to upload document: ${error}`);
  }
};

/**
 * Delete document from Cloudinary
 */
export const deleteDocument = async (
  publicId: string,
  resourceType: "image" | "raw" = "raw"
): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    throw new Error(`Failed to delete document: ${error}`);
  }
};

/**
 * Generate preview URL for document
 */
export const getDocumentPreviewUrl = (
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    page?: number;
    quality?: string;
  }
): string => {
  return cloudinary.url(publicId, {
    width: options?.width || 800,
    height: options?.height || 600,
    crop: "fit",
    page: options?.page || 1,
    quality: options?.quality || "auto",
    fetch_format: "auto",
  });
};

/**
 * Generate thumbnail URL for document
 */
export const getDocumentThumbnailUrl = (
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    page?: number;
  }
): string => {
  return cloudinary.url(publicId, {
    width: options?.width || 200,
    height: options?.height || 200,
    crop: "fit",
    page: options?.page || 1,
    quality: "auto",
    fetch_format: "auto",
  });
};

/**
 * Upload banner image to Cloudinary
 */
export const uploadBannerImage = async (
  buffer: Buffer,
  title: string,
  options?: {
    width?: number;
    height?: number;
    quality?: string;
  }
): Promise<{ url: string; publicId: string }> => {
  try {
    const timestamp = Date.now();
    const uploadOptions = {
      folder: "coordle/banners",
      public_id: `banner_${title.replace(/\s+/g, "_")}_${timestamp}`,
      transformation: [
        {
          width: options?.width || 1200,
          height: options?.height || 400,
          crop: "fill",
          gravity: "auto",
        },
        {
          quality: options?.quality || "auto",
          fetch_format: "auto",
        },
      ],
      overwrite: false,
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

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    throw new Error(`Failed to upload banner image: ${error}`);
  }
};

/**
 * Delete banner image from Cloudinary
 */
export const deleteBannerImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new Error(`Failed to delete banner image: ${error}`);
  }
};
