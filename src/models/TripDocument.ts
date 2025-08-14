import mongoose, { Document, Schema } from "mongoose";

// Define the TripDocument interface
export interface ITripDocument extends Document {
  tripId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId; // User who uploaded the document
  title: string;
  description?: string;
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  publicId: string;
  fileSize: number;
  mimeType: string;
  documentType?: string; // e.g., 'itinerary', 'booking', 'passport', 'visa', etc.
  isPublic: boolean; // Whether travelers can view this document
  metadata?: {
    documentNumber?: string;
    issuingAuthority?: string;
    countryCode?: string;
    pages?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Create the TripDocument schema
const tripDocumentSchema = new Schema<ITripDocument>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: [true, "Trip ID is required"],
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader ID is required"],
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
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        message: "Unsupported file type",
      },
    },
    documentType: {
      type: String,
      required: false,
      trim: true,
      enum: {
        values: [
          "itinerary",
          "booking",
          "passport",
          "visa",
          "insurance",
          "ticket",
          "receipt",
          "other",
        ],
        message: "Invalid document type",
      },
    },
    isPublic: {
      type: Boolean,
      default: true, // Default to public so travelers can view
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
tripDocumentSchema.index({ tripId: 1, createdAt: -1 });
tripDocumentSchema.index({ uploadedBy: 1 });
tripDocumentSchema.index({ isPublic: 1 });
tripDocumentSchema.index({ documentType: 1 });

// Pre-save middleware to set fileName if not provided
tripDocumentSchema.pre("save", function (next) {
  if (!this.fileName && this.originalFileName) {
    const timestamp = Date.now();
    const extension = this.originalFileName.split(".").pop();
    this.fileName = `${this.tripId}_${this.uploadedBy}_${timestamp}.${extension}`;
  }
  next();
});

// Create and export the TripDocument model
const TripDocument = mongoose.model<ITripDocument>("TripDocument", tripDocumentSchema);

export default TripDocument; 