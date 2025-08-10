import mongoose, { Document, Schema } from "mongoose";

// Define the Banner interface
export interface IBanner extends Document {
  title: string;
  imageUrl: string;
  redirectLink: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Banner schema
const bannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    imageUrl: {
      type: String,
      required: [true, "Banner image URL is required"],
      trim: true,
    },
    redirectLink: {
      type: String,
      required: [true, "Banner redirect link is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create indexes for better query performance
bannerSchema.index({ isActive: 1, order: 1 });
bannerSchema.index({ createdAt: -1 });

// Create and export the Banner model
const Banner = mongoose.model<IBanner>("Banner", bannerSchema);

export default Banner;
