import express from "express";
import {
  uploadDocumentController,
  uploadSingleDocument,
  getUserDocuments,
  getDocumentById,
  updateDocument,
  deleteDocumentController,
  getDocumentStats,
} from "../controllers/documentController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// All document routes require authentication
router.use(authenticateToken);

// Document CRUD operations
router.post("/upload", uploadSingleDocument, uploadDocumentController);
router.get("/", getUserDocuments);
router.get("/stats", getDocumentStats);
router.get("/:documentId", getDocumentById);
router.put("/:documentId", updateDocument);
router.delete("/:documentId", deleteDocumentController);

export default router;
