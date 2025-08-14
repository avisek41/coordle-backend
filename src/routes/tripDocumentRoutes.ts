import { Router, Request, Response } from "express";
import multer from "multer";
import {
  uploadTripDocument,
  uploadSingleTripDocument,
  getTripDocuments,
  getTripDocumentById,
  updateTripDocument,
  deleteTripDocument,
  getTripDocumentStats,
  testCloudinaryDeletion,
} from "../controllers/tripDocumentController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Trip Document CRUD routes
// All routes require authentication
router.use(authenticateToken);

// Upload a new trip document
router.post("/:tripId/documents", uploadSingleTripDocument, uploadTripDocument);

// Error handling middleware for multer
router.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "File size exceeds the maximum limit of 10MB",
        timestamp: new Date().toISOString(),
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message:
          "Unexpected field. Please use 'document' as the field name for the file upload.",
        timestamp: new Date().toISOString(),
      });
    }
  }
  return next(error);
});

// Get all documents for a trip
router.get("/:tripId/documents", getTripDocuments);

// Get a specific trip document
router.get("/:tripId/documents/:documentId", getTripDocumentById);

// Update trip document original filename
router.put("/:tripId/documents/:documentId", updateTripDocument);

// Delete a trip document
router.delete("/:tripId/documents/:documentId", deleteTripDocument);

// Get trip document statistics
router.get("/:tripId/documents/stats", getTripDocumentStats);

// Test Cloudinary deletion (for debugging)
router.post("/test-cloudinary-deletion", testCloudinaryDeletion);

export default router;
