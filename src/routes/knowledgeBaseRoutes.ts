import { Router } from "express";
import {
  createKnowledgeBaseEntry,
  getAllKnowledgeBaseEntries,
  getKnowledgeBaseEntryById,
  updateKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  searchKnowledgeBaseEntries,
  getKnowledgeBaseEntriesByCategory,
  getKnowledgeBaseCategories,
  getKnowledgeBaseSubcategories,
  bulkCreateKnowledgeBaseEntries,
  debugCollections,
} from "../controllers/knowledgeBaseController";

const router = Router();

// Debug route
router.get("/debug/collections", debugCollections);

// Knowledge Base CRUD operations
router.post("/", createKnowledgeBaseEntry);
router.get("/", getAllKnowledgeBaseEntries);
router.get("/search", searchKnowledgeBaseEntries);
router.get("/categories", getKnowledgeBaseCategories);
router.get("/categories/:category/subcategories", getKnowledgeBaseSubcategories);
router.get("/category/:category", getKnowledgeBaseEntriesByCategory);
router.get("/:id", getKnowledgeBaseEntryById);
router.put("/:id", updateKnowledgeBaseEntry);
router.delete("/:id", deleteKnowledgeBaseEntry);

// Bulk operations
router.post("/bulk", bulkCreateKnowledgeBaseEntries);

export default router;
