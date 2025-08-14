import { Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { TripDocument, Trip, type ITripDocument } from "../models";
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
  MESSAGES,
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
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Please upload JPG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, or XLSX files."
        )
      );
    }
  },
});

// Upload single document - accept multiple common field names
export const uploadSingleTripDocument = upload.single("document");

/**
 * Upload a new trip document
 * Only trip owner or hosts can upload documents
 */
export const uploadTripDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    const { tripId } = req.params;
    const { description, documentType, isPublic = "true" } = req.body;

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
    }

    if (!req.file) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_DOCUMENT_FILE_REQUIRED
      );
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }

    // Check if user is trip owner or host
    const userRef = `/users/${userId}`;
    const isOwner = trip.owner_id === userId;
    const isHost = trip.hosts.includes(userRef);

    if (!isOwner && !isHost) {
      return sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        MESSAGES.TRIP_DOCUMENT_ACCESS_DENIED
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

    // Upload to Cloudinary with trip-specific folder structure
    const uploadResult = await uploadDocument(
      req.file.buffer,
      tripId,
      req.file.originalname,
      "trip-documents",
      {
        tripId: tripId,
      }
    );

    // Auto-generate title from filename
    const autoTitle = req.file.originalname.replace(/\.[^/.]+$/, ""); // Remove file extension

    // Create trip document record
    const documentData = {
      tripId: new mongoose.Types.ObjectId(tripId),
      uploadedBy: new mongoose.Types.ObjectId(userId),
      title: autoTitle,
      description: description?.trim(),
      fileName: uploadResult.fileName,
      originalFileName: req.file.originalname,
      fileUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      documentType: documentType || "other",
      isPublic: isPublic === "true",
      metadata: {
        pages: uploadResult.pages,
      },
    };

    const tripDocument = new TripDocument(documentData);
    await tripDocument.save();

    // Generate preview and thumbnail URLs
    const previewUrl = getDocumentPreviewUrl(uploadResult.publicId);
    const thumbnailUrl = getDocumentThumbnailUrl(uploadResult.publicId);

    const responseData = {
      ...tripDocument.toObject(),
      previewUrl,
      thumbnailUrl,
    };

    return sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      MESSAGES.TRIP_DOCUMENT_UPLOADED,
      responseData
    );
  } catch (error: any) {
    console.error("Upload trip document error:", error);

    // Handle multer errors
    if (error.code === "LIMIT_FILE_SIZE") {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "File size exceeds the maximum limit of 10MB"
      );
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Unexpected field. Please use 'document' as the field name for the file upload."
      );
    }

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
      MESSAGES.TRIP_DOCUMENT_UPLOAD_FAILED
    );
  }
};

/**
 * Get all documents for a specific trip
 * Travelers can only see public documents, owners/hosts can see all
 */
export const getTripDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { tripId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      documentType,
      isPublic,
    } = req.query;

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }

    // Build filter
    const filter: any = { tripId: new mongoose.Types.ObjectId(tripId) };

    // Check user permissions
    const userRef = `/users/${userId}`;
    const isOwner = trip.owner_id === userId;
    const isHost = trip.hosts.includes(userRef);
    const isTraveler = trip.users.includes(userRef);

    // If user is not authenticated or not part of the trip, deny access
    if (!userId || (!isOwner && !isHost && !isTraveler)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        MESSAGES.TRIP_DOCUMENT_ACCESS_DENIED
      );
    }

    // If user is only a traveler, only show public documents
    if (!isOwner && !isHost) {
      filter.isPublic = true;
    }

    // Add additional filters
    if (documentType) {
      filter.documentType = documentType;
    }

    if (isPublic !== undefined && (isOwner || isHost)) {
      filter.isPublic = isPublic === "true";
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
      TripDocument.find(filter)
        .populate("uploadedBy", "email phoneNumber firstName lastName")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      TripDocument.countDocuments(filter),
    ]);

    // Add preview and thumbnail URLs
    const documentsWithUrls = documents.map((doc: any) => ({
      ...doc,
      previewUrl: getDocumentPreviewUrl(doc.publicId),
      thumbnailUrl: getDocumentThumbnailUrl(doc.publicId),
    }));

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
      MESSAGES.TRIP_DOCUMENTS_RETRIEVED,
      responseData
    );
  } catch (error: any) {
    console.error("Get trip documents error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve trip documents. Please try again."
    );
  }
};

/**
 * Get a specific trip document by ID
 */
export const getTripDocumentById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { tripId, documentId } = req.params;

    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
    }

    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_DOCUMENT_ID_REQUIRED
      );
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }

    // Check user permissions
    const userRef = `/users/${userId}`;
    const isOwner = trip.owner_id === userId;
    const isHost = trip.hosts.includes(userRef);
    const isTraveler = trip.users.includes(userRef);

    // If user is not part of the trip, deny access
    if (!isOwner && !isHost && !isTraveler) {
      return sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        MESSAGES.TRIP_DOCUMENT_ACCESS_DENIED
      );
    }

    // Find the document
    const document = await TripDocument.findOne({
      _id: documentId,
      tripId: new mongoose.Types.ObjectId(tripId),
    })
      .populate("uploadedBy", "email phoneNumber firstName lastName")
      .lean();

    if (!document) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.TRIP_DOCUMENT_NOT_FOUND
      );
    }

    // If user is only a traveler, check if document is public
    if (!isOwner && !isHost && !document.isPublic) {
      return sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        MESSAGES.TRIP_DOCUMENT_ACCESS_DENIED
      );
    }

    // Add preview and thumbnail URLs
    const documentWithUrls = {
      ...document,
      previewUrl: getDocumentPreviewUrl(document.publicId),
      thumbnailUrl: getDocumentThumbnailUrl(document.publicId),
    };

    return sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      MESSAGES.TRIP_DOCUMENT_RETRIEVED,
      documentWithUrls
    );
  } catch (error: any) {
    console.error("Get trip document by ID error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve trip document. Please try again."
    );
  }
};

/**
 * Update trip document metadata and optionally replace the file
 * Only the document uploader, trip owner, or hosts can update
 */
export const updateTripDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { tripId, documentId } = req.params;
    const {
      title,
      description,
      documentType,
      isPublic,
      documentNumber,
      issuingAuthority,
      countryCode,
    } = req.body;

    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
    }

    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_DOCUMENT_ID_REQUIRED
      );
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }

    // Check user permissions
    const userRef = `/users/${userId}`;
    const isOwner = trip.owner_id === userId;
    const isHost = trip.hosts.includes(userRef);

    if (!isOwner && !isHost) {
      return sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        MESSAGES.TRIP_DOCUMENT_ACCESS_DENIED
      );
    }

    // Find the document
    const document = await TripDocument.findOne({
      _id: documentId,
      tripId: new mongoose.Types.ObjectId(tripId),
    });

    if (!document) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.TRIP_DOCUMENT_NOT_FOUND
      );
    }

    // Handle file replacement if new file is uploaded
    if (req.file) {
      // Delete old file from Cloudinary
      try {
        const isImage = document.mimeType.startsWith("image/");
        const isPdf = document.mimeType === "application/pdf";
        const resourceType = isImage || isPdf ? "image" : "raw";
        await deleteDocument(document.publicId, resourceType);
      } catch (cloudinaryError) {
        console.error(
          "Error deleting old document from Cloudinary:",
          cloudinaryError
        );
        // Continue with upload even if deletion fails
      }

      // Upload new file to Cloudinary
      const uploadResult = await uploadDocument(
        req.file.buffer,
        tripId,
        req.file.originalname,
        "trip-documents",
        {
          tripId: tripId,
        }
      );

      // Update document with new file information
      document.fileName = uploadResult.fileName;
      document.originalFileName = req.file.originalname;
      document.fileUrl = uploadResult.url;
      document.publicId = uploadResult.publicId;
      document.fileSize = uploadResult.fileSize;
      document.mimeType = uploadResult.mimeType;
      if (uploadResult.pages) {
        document.metadata!.pages = uploadResult.pages;
      }
    }

    // Update fields
    if (title !== undefined) {
      document.title = title.trim();
    }

    if (description !== undefined) {
      document.description = description?.trim();
    }

    if (documentType !== undefined) {
      document.documentType = documentType;
    }

    if (isPublic !== undefined) {
      document.isPublic = isPublic === "true" || isPublic === true;
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

    // Add preview and thumbnail URLs
    const documentWithUrls = {
      ...document.toObject(),
      previewUrl: getDocumentPreviewUrl(document.publicId),
      thumbnailUrl: getDocumentThumbnailUrl(document.publicId),
    };

    return sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      MESSAGES.TRIP_DOCUMENT_UPDATED,
      documentWithUrls
    );
  } catch (error: any) {
    console.error("Update trip document error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to update trip document. Please try again."
    );
  }
};

/**
 * Delete a trip document
 * Only the document uploader, trip owner, or hosts can delete
 */
export const deleteTripDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { tripId, documentId } = req.params;

    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
    }

    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_DOCUMENT_ID_REQUIRED
      );
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }

    // Check user permissions
    const userRef = `/users/${userId}`;
    const isOwner = trip.owner_id === userId;
    const isHost = trip.hosts.includes(userRef);

    if (!isOwner && !isHost) {
      return sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        MESSAGES.TRIP_DOCUMENT_ACCESS_DENIED
      );
    }

    // Find the document
    const document = await TripDocument.findOne({
      _id: documentId,
      tripId: new mongoose.Types.ObjectId(tripId),
    });

    if (!document) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.TRIP_DOCUMENT_NOT_FOUND
      );
    }

    // Determine resource type for Cloudinary deletion
    const isImage = document.mimeType.startsWith("image/");
    const isPdf = document.mimeType === "application/pdf";
    const resourceType = isImage || isPdf ? "image" : "raw";

    // Validate publicId
    if (!document.publicId || document.publicId.trim() === "") {
      console.error("Invalid publicId for document:", {
        documentId: documentId,
        publicId: document.publicId,
      });
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid document public ID"
      );
    }

    console.log(`Attempting to delete document from Cloudinary:`, {
      publicId: document.publicId,
      resourceType: resourceType,
      mimeType: document.mimeType,
      isImage: isImage,
      isPdf: isPdf,
      fileName: document.originalFileName,
      fileUrl: document.fileUrl,
    });

    // Delete from Cloudinary
    try {
      await deleteDocument(document.publicId, resourceType);
      console.log(
        `Successfully deleted document from Cloudinary: ${document.publicId}`
      );
    } catch (cloudinaryError: any) {
      console.error("Cloudinary deletion error:", {
        error: cloudinaryError.message,
        publicId: document.publicId,
        resourceType: resourceType,
        errorCode: cloudinaryError.http_code,
        errorDetails: cloudinaryError,
      });
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await TripDocument.findByIdAndDelete(documentId);
    console.log(`Successfully deleted document from database: ${documentId}`);

    return sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      MESSAGES.TRIP_DOCUMENT_DELETED
    );
  } catch (error: any) {
    console.error("Delete trip document error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to delete trip document. Please try again."
    );
  }
};

/**
 * Test Cloudinary deletion (for debugging)
 */
export const testCloudinaryDeletion = async (req: Request, res: Response) => {
  try {
    const { publicId, resourceType = "raw" } = req.body;

    if (!publicId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Public ID is required"
      );
    }

    console.log(`Testing Cloudinary deletion with:`, {
      publicId: publicId,
      resourceType: resourceType,
    });

    try {
      await deleteDocument(publicId, resourceType as "image" | "raw");
      return sendSuccessResponse(
        res,
        STATUS_CODES.OK,
        "Cloudinary deletion test successful"
      );
    } catch (cloudinaryError: any) {
      return sendErrorResponse(
        res,
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        `Cloudinary deletion test failed: ${cloudinaryError.message}`,
        cloudinaryError
      );
    }
  } catch (error: any) {
    console.error("Test Cloudinary deletion error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Test failed"
    );
  }
};

/**
 * Get trip document statistics
 */
export const getTripDocumentStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { tripId } = req.params;

    if (!userId) {
      return sendErrorResponse(
        res,
        STATUS_CODES.UNAUTHORIZED,
        "User not authenticated"
      );
    }

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        MESSAGES.TRIP_ID_REQUIRED
      );
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return sendErrorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }

    // Check user permissions
    const userRef = `/users/${userId}`;
    const isOwner = trip.owner_id === userId;
    const isHost = trip.hosts.includes(userRef);
    const isTraveler = trip.users.includes(userRef);

    if (!isOwner && !isHost && !isTraveler) {
      return sendErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        MESSAGES.TRIP_DOCUMENT_ACCESS_DENIED
      );
    }

    const tripObjectId = new mongoose.Types.ObjectId(tripId);

    // Build match filter
    const matchFilter: any = { tripId: tripObjectId };

    // If user is only a traveler, only count public documents
    if (!isOwner && !isHost) {
      matchFilter.isPublic = true;
    }

    const stats = await TripDocument.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
          publicCount: {
            $sum: { $cond: [{ $eq: ["$isPublic", true] }, 1, 0] },
          },
          privateCount: {
            $sum: { $cond: [{ $eq: ["$isPublic", false] }, 1, 0] },
          },
        },
      },
    ]);

    // Get document type distribution
    const typeStats = await TripDocument.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$documentType",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const result = {
      overview: stats[0] || {
        totalDocuments: 0,
        totalSize: 0,
        publicCount: 0,
        privateCount: 0,
      },
      documentTypes: typeStats,
    };

    return sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Trip document statistics retrieved successfully",
      result
    );
  } catch (error: any) {
    console.error("Get trip document stats error:", error);
    return sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve trip document statistics. Please try again."
    );
  }
};
