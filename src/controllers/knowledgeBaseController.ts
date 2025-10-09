import { Request, Response } from "express";
import mongoose from "mongoose";
import { KnowledgeBase } from "../models";
import {
  sendSuccessResponse,
  sendErrorResponse,
  STATUS_CODES,
} from "../utils/apiResponse";

/**
 * Debug endpoint to check database collections
 * GET /api/knowledge-base/debug/collections
 */
export const debugCollections = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      sendErrorResponse(res, STATUS_CODES.INTERNAL_SERVER_ERROR, "Database not connected");
      return;
    }

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    // Try to count documents in temp_table
    let tempTableCount = 0;
    let tempTableSample: any[] = [];
    try {
      tempTableCount = await db.collection("temp_table").countDocuments();
      tempTableSample = await db.collection("temp_table").find({}).limit(2).toArray();
    } catch (error) {
      console.log("Error counting temp_table:", error);
    }

    // Try to count documents in knowledgebases
    let knowledgeBaseCount = 0;
    let knowledgeBaseSample: any[] = [];
    try {
      knowledgeBaseCount = await db.collection("knowledgebases").countDocuments();
      knowledgeBaseSample = await db.collection("knowledgebases").find({}).limit(2).toArray();
    } catch (error) {
      console.log("Error counting knowledgebases:", error);
    }

    sendSuccessResponse(res, STATUS_CODES.OK, "Database debug info", {
      database: db.databaseName,
      collections: collectionNames,
      tempTableCount,
      knowledgeBaseCount,
      tempTableExists: collectionNames.includes("temp_table"),
      knowledgebasesExists: collectionNames.includes("knowledgebases"),
      tempTableSample,
      knowledgeBaseSample
    });
  } catch (error) {
    console.error("Debug collections error:", error);
    sendErrorResponse(res, STATUS_CODES.INTERNAL_SERVER_ERROR, "Failed to get debug info");
  }
};

/**
 * Create a new knowledge base entry
 * POST /api/knowledge-base
 */
export const createKnowledgeBaseEntry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      knowledgeBaseName,
      title,
      subtitle,
      language = "en",
      url,
      bodyHtml,
      category,
      subcategory = "",
      keywords = "",
      lastModified,
      status = "PUBLISHED",
      archived = false,
    } = req.body;

    // Validate required fields
    if (!knowledgeBaseName || !title || !subtitle || !url || !bodyHtml || !category) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Knowledge base name, title, subtitle, URL, body HTML, and category are required"
      );
      return;
    }

    // Validate URL format
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(url)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "URL must be a valid HTTP or HTTPS URL"
      );
      return;
    }

    // Validate status
    if (!["PUBLISHED", "DRAFT", "ARCHIVED"].includes(status)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Status must be either 'PUBLISHED', 'DRAFT', or 'ARCHIVED'"
      );
      return;
    }

    // Create new knowledge base entry
    const knowledgeBaseEntry = new KnowledgeBase({
      knowledgeBaseName,
      title,
      subtitle,
      language,
      url,
      bodyHtml,
      category,
      subcategory,
      keywords,
      lastModified: lastModified || Date.now().toString(),
      status,
      archived,
    });

    const savedEntry = await knowledgeBaseEntry.save();

    sendSuccessResponse(
      res,
      STATUS_CODES.CREATED,
      "Knowledge base entry created successfully",
      savedEntry
    );
  } catch (error) {
    console.error("Error creating knowledge base entry:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to create knowledge base entry"
    );
  }
};

/**
 * Get all knowledge base entries with optional filtering and pagination
 * GET /api/knowledge-base
 */
export const getAllKnowledgeBaseEntries = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      category,
      subcategory,
      language = "en",
      status = "PUBLISHED",
      archived = "false",
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query object
    const query: any = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by subcategory
    if (subcategory) {
      query.subcategory = subcategory;
    }

    // Filter by language
    if (language) {
      query.language = language;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by archived status
    if (archived !== undefined) {
      query.archived = archived === "true";
    }

    // Text search across title, subtitle, and bodyHtml
    if (search) {
      query.$text = { $search: search as string };
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const entries = await KnowledgeBase.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select("-__v");

    // Get total count for pagination
    const totalEntries = await KnowledgeBase.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalEntries / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Knowledge base entries retrieved successfully",
      {
        entries,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEntries,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
        },
      }
    );
  } catch (error) {
    console.error("Error retrieving knowledge base entries:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve knowledge base entries"
    );
  }
};

/**
 * Get knowledge base entry by ID
 * GET /api/knowledge-base/:id
 */
export const getKnowledgeBaseEntryById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Entry ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid entry ID format"
      );
      return;
    }

    const entry = await KnowledgeBase.findById(id).select("-__v");

    if (!entry) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Knowledge base entry not found");
      return;
    }

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Knowledge base entry retrieved successfully",
      entry
    );
  } catch (error) {
    console.error("Error retrieving knowledge base entry:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve knowledge base entry"
    );
  }
};

/**
 * Update knowledge base entry by ID
 * PUT /api/knowledge-base/:id
 */
export const updateKnowledgeBaseEntry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      knowledgeBaseName,
      title,
      subtitle,
      language,
      url,
      bodyHtml,
      category,
      subcategory,
      keywords,
      lastModified,
      status,
      archived,
    } = req.body;

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Entry ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid entry ID format"
      );
      return;
    }

    // Check if entry exists
    const existingEntry = await KnowledgeBase.findById(id);
    if (!existingEntry) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Knowledge base entry not found");
      return;
    }

    // Validate URL format if provided
    if (url) {
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(url)) {
        sendErrorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "URL must be a valid HTTP or HTTPS URL"
        );
        return;
      }
    }

    // Validate status if provided
    if (status && !["PUBLISHED", "DRAFT", "ARCHIVED"].includes(status)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Status must be either 'PUBLISHED', 'DRAFT', or 'ARCHIVED'"
      );
      return;
    }

    // Build update object
    const updateData: any = {};
    if (knowledgeBaseName !== undefined) updateData.knowledgeBaseName = knowledgeBaseName;
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (language !== undefined) updateData.language = language;
    if (url !== undefined) updateData.url = url;
    if (bodyHtml !== undefined) updateData.bodyHtml = bodyHtml;
    if (category !== undefined) updateData.category = category;
    if (subcategory !== undefined) updateData.subcategory = subcategory;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (lastModified !== undefined) updateData.lastModified = lastModified;
    if (status !== undefined) updateData.status = status;
    if (archived !== undefined) updateData.archived = archived;

    // Update entry
    const updatedEntry = await KnowledgeBase.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-__v");

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Knowledge base entry updated successfully",
      updatedEntry
    );
  } catch (error) {
    console.error("Error updating knowledge base entry:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to update knowledge base entry"
    );
  }
};

/**
 * Delete knowledge base entry by ID
 * DELETE /api/knowledge-base/:id
 */
export const deleteKnowledgeBaseEntry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Entry ID is required");
      return;
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid entry ID format"
      );
      return;
    }

    // Check if entry exists
    const existingEntry = await KnowledgeBase.findById(id);
    if (!existingEntry) {
      sendErrorResponse(res, STATUS_CODES.NOT_FOUND, "Knowledge base entry not found");
      return;
    }

    // Delete entry
    await KnowledgeBase.findByIdAndDelete(id);

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Knowledge base entry deleted successfully"
    );
  } catch (error) {
    console.error("Error deleting knowledge base entry:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to delete knowledge base entry"
    );
  }
};

/**
 * Search knowledge base entries by text
 * GET /api/knowledge-base/search
 */
export const searchKnowledgeBaseEntries = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      q,
      page = "1",
      limit = "10",
      category,
      subcategory,
      language = "en",
      status = "PUBLISHED",
      archived = "false",
    } = req.query;

    if (!q) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Search query is required");
      return;
    }

    // Build query object
    const query: any = {
      $text: { $search: q as string },
    };

    // Apply filters
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (language) query.language = language;
    if (status) query.status = status;
    if (archived !== undefined) query.archived = archived === "true";

    // Calculate pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute search with pagination
    const entries = await KnowledgeBase.find(query)
      .sort({ score: { $meta: "textScore" } })
      .skip(skip)
      .limit(limitNum)
      .select("-__v");

    // Get total count for pagination
    const totalEntries = await KnowledgeBase.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalEntries / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Knowledge base search completed successfully",
      {
        query: q,
        entries,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEntries,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
        },
      }
    );
  } catch (error) {
    console.error("Error searching knowledge base entries:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to search knowledge base entries"
    );
  }
};

/**
 * Get knowledge base entries by category
 * GET /api/knowledge-base/category/:category
 */
export const getKnowledgeBaseEntriesByCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category } = req.params;
    const {
      page = "1",
      limit = "10",
      subcategory,
      language = "en",
      status = "PUBLISHED",
      archived = "false",
    } = req.query;

    if (!category) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Category is required");
      return;
    }

    // Build query object
    const query: any = { category };

    // Apply additional filters
    if (subcategory) query.subcategory = subcategory;
    if (language) query.language = language;
    if (status) query.status = status;
    if (archived !== undefined) query.archived = archived === "true";

    // Calculate pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const entries = await KnowledgeBase.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-__v");

    // Get total count for pagination
    const totalEntries = await KnowledgeBase.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalEntries / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      `Knowledge base entries for category '${category}' retrieved successfully`,
      {
        category,
        entries,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEntries,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
        },
      }
    );
  } catch (error) {
    console.error("Error retrieving knowledge base entries by category:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve knowledge base entries by category"
    );
  }
};

/**
 * Get all unique categories
 * GET /api/knowledge-base/categories
 */
export const getKnowledgeBaseCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { language = "en", status = "PUBLISHED", archived = "false" } = req.query;

    // Build query object
    const query: any = {};
    if (language) query.language = language;
    if (status) query.status = status;
    if (archived !== undefined) query.archived = archived === "true";

    // Get unique categories
    const categories = await KnowledgeBase.distinct("category", query);

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Knowledge base categories retrieved successfully",
      { categories }
    );
  } catch (error) {
    console.error("Error retrieving knowledge base categories:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve knowledge base categories"
    );
  }
};

/**
 * Get all unique subcategories for a given category
 * GET /api/knowledge-base/categories/:category/subcategories
 */
export const getKnowledgeBaseSubcategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category } = req.params;
    const { language = "en", status = "PUBLISHED", archived = "false" } = req.query;

    if (!category) {
      sendErrorResponse(res, STATUS_CODES.BAD_REQUEST, "Category is required");
      return;
    }

    // Build query object
    const query: any = { category };
    if (language) query.language = language;
    if (status) query.status = status;
    if (archived !== undefined) query.archived = archived === "true";

    // Get unique subcategories for the category
    const subcategories = await KnowledgeBase.distinct("subcategory", query);

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      `Knowledge base subcategories for category '${category}' retrieved successfully`,
      { category, subcategories }
    );
  } catch (error) {
    console.error("Error retrieving knowledge base subcategories:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to retrieve knowledge base subcategories"
    );
  }
};

/**
 * Bulk create knowledge base entries
 * POST /api/knowledge-base/bulk
 */
export const bulkCreateKnowledgeBaseEntries = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      sendErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Entries array is required and must not be empty"
      );
      return;
    }

    const results = [];
    const errors = [];
    const successfulEntries = [];

    // Process each entry
    for (let i = 0; i < entries.length; i++) {
      try {
        const entryData = entries[i];
        const {
          knowledgeBaseName,
          title,
          subtitle,
          language = "en",
          url,
          bodyHtml,
          category,
          subcategory = "",
          keywords = "",
          lastModified,
          status = "PUBLISHED",
          archived = false,
        } = entryData;

        // Validate required fields
        if (!knowledgeBaseName || !title || !subtitle || !url || !bodyHtml || !category) {
          errors.push({
            index: i,
            entry: entryData,
            error: "Knowledge base name, title, subtitle, URL, body HTML, and category are required",
          });
          continue;
        }

        // Validate URL format
        const urlRegex = /^https?:\/\/.+/;
        if (!urlRegex.test(url)) {
          errors.push({
            index: i,
            entry: entryData,
            error: "URL must be a valid HTTP or HTTPS URL",
          });
          continue;
        }

        // Validate status
        if (status && !["PUBLISHED", "DRAFT", "ARCHIVED"].includes(status)) {
          errors.push({
            index: i,
            entry: entryData,
            error: "Status must be either 'PUBLISHED', 'DRAFT', or 'ARCHIVED'",
          });
          continue;
        }

        // Create entry
        const knowledgeBaseEntry = new KnowledgeBase({
          knowledgeBaseName,
          title,
          subtitle,
          language,
          url,
          bodyHtml,
          category,
          subcategory,
          keywords,
          lastModified: lastModified || Date.now().toString(),
          status,
          archived,
        });

        const savedEntry = await knowledgeBaseEntry.save();
        successfulEntries.push(savedEntry);

        results.push({
          index: i,
          success: true,
          entryId: savedEntry._id,
          message: "Entry created successfully",
        });
      } catch (error) {
        console.error(`Error creating entry at index ${i}:`, error);
        errors.push({
          index: i,
          entry: entries[i],
          error: (error as Error).message || "Failed to create entry",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = errors.length;

    sendSuccessResponse(
      res,
      STATUS_CODES.OK,
      "Bulk creation completed",
      {
        results,
        errors,
        summary: {
          total: entries.length,
          successful: successCount,
          failed: errorCount,
        },
        entries: successfulEntries,
      }
    );
  } catch (error) {
    console.error("Error in bulk creation:", error);
    sendErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      "Failed to create knowledge base entries in bulk"
    );
  }
};
