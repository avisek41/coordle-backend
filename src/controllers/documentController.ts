import { Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { Document, type IDocument } from "../models";
import {
  uploadDocument,
  deleteDocument,
  getDocumentPreviewUrl,
  getDocumentThumbnailUrl,
} from "../utils/cloudinaryUtils";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
} from "../utils/apiResponse";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      // add more file types here like docx
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Please upload JPG, PNG, GIF, WebP, PDF, DOC, or DOCX files."
        )
      );
    }
  },
});

// Upload single document
export const uploadSingleDocument = upload.single("document");

/**
 * Upload a new document
 */
export const uploadDocumentController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    if (!req.file) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "No file uploaded"
      );
    }

    // Check file size
    if (req.file.size > 10 * 1024 * 1024) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "File size cannot exceed 10MB"
      );
    }

    // Upload to Cloudinary
    const uploadResult = await uploadDocument(
      req.file.buffer,
      userId,
      req.file.originalname,
      "document"
    );

    // Create document record
    const documentData = {
      userId: new mongoose.Types.ObjectId(userId),
      title: `Document - ${new Date().toLocaleDateString()}`,
      fileName: uploadResult.fileName,
      originalFileName: req.file.originalname,
      fileUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      metadata: {
        pages: uploadResult.pages,
      },
    };

    const document = new Document(documentData);
    await document.save();

    // Generate preview and thumbnail URLs
    const previewUrl = getDocumentPreviewUrl(uploadResult.publicId);
    const thumbnailUrl = getDocumentThumbnailUrl(uploadResult.publicId);

    const { title, fileName, originalFileName, ...docData } =
      document.toObject();
    const responseData = {
      ...docData,
      fileName: originalFileName, // Use original filename as fileName
      previewUrl,
      thumbnailUrl,
    };

    return sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Document uploaded successfully",
      responseData
    );
  } catch (error: any) {
    console.error("Upload document error:", error);

    if (error.message.includes("Unsupported file type")) {
      return sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, error.message);
    }

    if (error.message.includes("File too large")) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "File size exceeds the maximum limit of 10MB"
      );
    }

    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to upload document. Please try again."
    );
  }
};

/**
 * Get all documents for the authenticated user
 */
export const getUserDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      isVerified,
      isExpired,
    } = req.query;

    // Build filter
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (isVerified !== undefined) {
      filter.isVerified = isVerified === "true";
    }

    // Handle expired filter
    if (isExpired !== undefined) {
      const now = new Date();
      if (isExpired === "true") {
        filter.expiryDate = { $lt: now };
      } else {
        filter.$or = [
          { expiryDate: { $gte: now } },
          { expiryDate: { $exists: false } },
        ];
      }
    }

    // Build sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Execute queries
    const [documents, totalCount] = await Promise.all([
      Document.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Document.countDocuments(filter),
    ]);

    // Add preview and thumbnail URLs, exclude unnecessary fields
    const documentsWithUrls = documents.map((doc: any) => {
      const { title, fileName, originalFileName, ...cleanDoc } = doc;
      return {
        ...cleanDoc,
        fileName: originalFileName, // Use original filename as fileName
        previewUrl: getDocumentPreviewUrl(doc.publicId),
        thumbnailUrl: getDocumentThumbnailUrl(doc.publicId),
        isExpired: doc.expiryDate ? doc.expiryDate < new Date() : false,
        daysUntilExpiry: doc.expiryDate
          ? Math.ceil(
              (new Date(doc.expiryDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      };
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    const responseData = {
      documents: documentsWithUrls,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };

    return sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Documents retrieved successfully",
      responseData
    );
  } catch (error: any) {
    console.error("Get user documents error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve documents. Please try again."
    );
  }
};

/**
 * Get a specific document by ID
 */
export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    const { documentId } = req.params;

    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid document ID"
      );
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (!document) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Document not found"
      );
    }

    // Add preview and thumbnail URLs, exclude unnecessary fields
    const { title, fileName, originalFileName, ...cleanDoc } = document;
    const documentWithUrls = {
      ...cleanDoc,
      fileName: originalFileName, // Use original filename as fileName
      previewUrl: getDocumentPreviewUrl(document.publicId),
      thumbnailUrl: getDocumentThumbnailUrl(document.publicId),
      isExpired: document.expiryDate ? document.expiryDate < new Date() : false,
      daysUntilExpiry: document.expiryDate
        ? Math.ceil(
            (new Date(document.expiryDate).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    };

    return sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Document retrieved successfully",
      documentWithUrls
    );
  } catch (error: any) {
    console.error("Get document by ID error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve document. Please try again."
    );
  }
};

/**
 * Update document metadata
 */
export const updateDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    const { documentId } = req.params;
    const {
      description,
      expiryDate,
      documentNumber,
      issuingAuthority,
      countryCode,
      fileName: newFileName,
    } = req.body;

    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid document ID"
      );
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Document not found"
      );
    }

    // Update fields (title removed as it's auto-generated)

    if (description !== undefined) {
      document.description = description?.trim();
    }

    if (expiryDate !== undefined) {
      if (expiryDate) {
        document.expiryDate = new Date(expiryDate);
      } else {
        document.expiryDate = undefined;
      }
    }

    // Update filename if provided
    if (newFileName !== undefined) {
      const trimmedFileName = newFileName?.trim();
      if (trimmedFileName && trimmedFileName.length > 0) {
        // Preserve the original file extension
        const originalExtension = document.originalFileName.split(".").pop();
        const updatedFileName = trimmedFileName.endsWith(
          `.${originalExtension}`
        )
          ? trimmedFileName
          : `${trimmedFileName}.${originalExtension}`;

        document.originalFileName = updatedFileName;
      }
    }

    // Update metadata
    if (documentNumber !== undefined) {
      document.metadata!.documentNumber = documentNumber?.trim();
    }

    if (issuingAuthority !== undefined) {
      document.metadata!.issuingAuthority = issuingAuthority?.trim();
    }

    if (countryCode !== undefined) {
      document.metadata!.countryCode = countryCode?.toUpperCase();
    }

    await document.save();

    // Add preview and thumbnail URLs, exclude unnecessary fields
    const { title, fileName, originalFileName, ...docData } =
      document.toObject();
    const documentWithUrls = {
      ...docData,
      fileName: originalFileName, // Use original filename as fileName
      previewUrl: getDocumentPreviewUrl(document.publicId),
      thumbnailUrl: getDocumentThumbnailUrl(document.publicId),
    };

    return sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Document updated successfully",
      documentWithUrls
    );
  } catch (error: any) {
    console.error("Update document error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to update document. Please try again."
    );
  }
};

/**
 * Delete a document
 */
export const deleteDocumentController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    const { documentId } = req.params;

    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid document ID"
      );
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Document not found"
      );
    }

    // Determine resource type for Cloudinary deletion
    const isImage = document.mimeType.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    // Delete from Cloudinary
    try {
      await deleteDocument(document.publicId, resourceType);
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await Document.findByIdAndDelete(documentId);

    return sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Document deleted successfully"
    );
  } catch (error: any) {
    console.error("Delete document error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to delete document. Please try again."
    );
  }
};

/**
 * Get document statistics for the user
 */
export const getDocumentStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();

    const stats = await Document.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
          verifiedCount: {
            $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
          },
          expiredCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$expiryDate", null] },
                    { $lt: ["$expiryDate", now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expiringCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$expiryDate", null] },
                    { $gte: ["$expiryDate", now] },
                    {
                      $lte: [
                        "$expiryDate",
                        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const result = {
      overview: stats[0] || {
        totalDocuments: 0,
        totalSize: 0,
        verifiedCount: 0,
        expiredCount: 0,
        expiringCount: 0,
      },
    };

    return sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Document statistics retrieved successfully",
      result
    );
  } catch (error: any) {
    console.error("Get document stats error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve document statistics. Please try again."
    );
  }
};
