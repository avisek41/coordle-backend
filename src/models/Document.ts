import mongoose, { Document, Schema } from "mongoose";

// Define the Document interface
export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string | undefined;
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  publicId: string;
  fileSize: number;
  mimeType: string;
  isVerified: boolean;
  expiryDate?: Date | undefined;
  metadata?:
    | {
        documentNumber?: string;
        issuingAuthority?: string;
        countryCode?: string;
        pages?: number;
        [key: string]: any;
      }
    | undefined;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Document schema
const documentSchema = new Schema<IDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },
    originalFileName: {
      type: String,
      required: [true, "Original file name is required"],
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },
    publicId: {
      type: String,
      required: [true, "Public ID is required"],
      trim: true,
      unique: true,
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [1, "File size must be greater than 0"],
      max: [10 * 1024 * 1024, "File size cannot exceed 10MB"], // 10MB limit
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
      enum: {
        values: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        message: "Unsupported file type",
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiryDate: {
      type: Date,
      required: false,
      validate: {
        validator: function (value: Date) {
          return !value || value > new Date();
        },
        message: "Expiry date must be in the future",
      },
    },
    metadata: {
      documentNumber: {
        type: String,
        required: false,
        trim: true,
      },
      issuingAuthority: {
        type: String,
        required: false,
        trim: true,
      },
      countryCode: {
        type: String,
        required: false,
        trim: true,
        uppercase: true,
        minlength: [2, "Country code must be 2 characters"],
        maxlength: [3, "Country code cannot be more than 3 characters"],
      },
      pages: {
        type: Number,
        required: false,
        min: [1, "Pages must be at least 1"],
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ expiryDate: 1 });
documentSchema.index({ isVerified: 1 });

// Virtual for checking if document is expired
documentSchema.virtual("isExpired").get(function () {
  return this.expiryDate ? this.expiryDate < new Date() : false;
});

// Virtual for days until expiry
documentSchema.virtual("daysUntilExpiry").get(function () {
  if (!this.expiryDate) return null;
  const now = new Date();
  const diffTime = this.expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware to set fileName if not provided
documentSchema.pre("save", function (next) {
  if (!this.fileName && this.originalFileName) {
    const timestamp = Date.now();
    const extension = this.originalFileName.split(".").pop();
    this.fileName = `${this.userId}_document_${timestamp}.${extension}`;
  }
  next();
});

// Create and export the Document model
const DocumentModel = mongoose.model<IDocument>("Document", documentSchema);

export default DocumentModel;
