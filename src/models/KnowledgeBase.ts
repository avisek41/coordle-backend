import mongoose, { Document, Schema } from "mongoose";

// Define the KnowledgeBase interface based on the provided JSON structure
export interface IKnowledgeBase extends Document {
  knowledgeBaseName: string;
  title: string;
  subtitle: string;
  language: string;
  url: string;
  bodyHtml: string;
  category: string;
  subcategory: string;
  keywords: string;
  lastModified: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create the KnowledgeBase schema
const knowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    knowledgeBaseName: {
      type: String,
      required: [true, "Knowledge base name is required"],
      trim: true,
      maxlength: [200, "Knowledge base name cannot be more than 200 characters"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [500, "Title cannot be more than 500 characters"],
    },
    subtitle: {
      type: String,
      required: [true, "Subtitle is required"],
      trim: true,
      maxlength: [1000, "Subtitle cannot be more than 1000 characters"],
    },
    language: {
      type: String,
      required: [true, "Language is required"],
      trim: true,
      maxlength: [10, "Language code cannot be more than 10 characters"],
      default: "en",
    },
    url: {
      type: String,
      required: [true, "URL is required"],
      trim: true,
      maxlength: [2000, "URL cannot be more than 2000 characters"],
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "URL must be a valid HTTP or HTTPS URL",
      },
    },
    bodyHtml: {
      type: String,
      required: [true, "Body HTML is required"],
      maxlength: [50000, "Body HTML cannot be more than 50000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [100, "Category cannot be more than 100 characters"],
    },
    subcategory: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, "Subcategory cannot be more than 100 characters"],
      default: "",
    },
    keywords: {
      type: String,
      required: false,
      trim: true,
      maxlength: [500, "Keywords cannot be more than 500 characters"],
      default: "",
    },
    lastModified: {
      type: String,
      required: [true, "Last modified timestamp is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["PUBLISHED", "DRAFT", "ARCHIVED"],
        message: "Status must be either 'PUBLISHED', 'DRAFT', or 'ARCHIVED'",
      },
      required: [true, "Status is required"],
      default: "PUBLISHED",
    },
    archived: {
      type: Boolean,
      required: [true, "Archived status is required"],
      default: false,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create indexes for better query performance
knowledgeBaseSchema.index({ knowledgeBaseName: 1 });
knowledgeBaseSchema.index({ title: "text", subtitle: "text", bodyHtml: "text" });
knowledgeBaseSchema.index({ category: 1 });
knowledgeBaseSchema.index({ subcategory: 1 });
knowledgeBaseSchema.index({ language: 1 });
knowledgeBaseSchema.index({ status: 1 });
knowledgeBaseSchema.index({ archived: 1 });
knowledgeBaseSchema.index({ createdAt: -1 });
knowledgeBaseSchema.index({ lastModified: -1 });

// Create and export the KnowledgeBase model
const KnowledgeBase = mongoose.model<IKnowledgeBase>("KnowledgeBase", knowledgeBaseSchema);

export default KnowledgeBase;
