import mongoose, { Document, Schema } from "mongoose";

// Define the Announcement interface
export interface IAnnouncement extends Document {
  tripId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Announcement schema
const announcementSchema = new Schema<IAnnouncement>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: [true, "Trip ID is required"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user ID is required"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [1000, "Message cannot be more than 1000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
announcementSchema.index({ tripId: 1, createdAt: -1 });
announcementSchema.index({ createdBy: 1 });

const Announcement = mongoose.model<IAnnouncement>(
  "Announcement",
  announcementSchema
);

export default Announcement;
