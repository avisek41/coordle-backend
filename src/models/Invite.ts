import mongoose, { Document, Schema } from "mongoose";

// Define the invite type enum
export enum InviteType {
  EMAIL = "email",
  PHONE = "phone",
}

// Define the Invite interface
export interface IInvite extends Document {
  tripId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId; // User who sent the invite
  inviteType: InviteType;
  contactInfo: string; // Email or phone number
  status: "pending" | "accepted" | "declined" | "expired";
  userId?: mongoose.Types.ObjectId; // User ID if they registered
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Invite schema
const inviteSchema = new Schema<IInvite>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteType: {
      type: String,
      enum: Object.values(InviteType),
      required: true,
    },
    contactInfo: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired"],
      default: "pending",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: function () {
        // Default expiry: 30 days from creation
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
inviteSchema.index({ tripId: 1, status: 1 });
inviteSchema.index({ invitedBy: 1, status: 1 });
inviteSchema.index({ inviteType: 1, status: 1 });
inviteSchema.index({ contactInfo: 1, inviteType: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

export const Invite = mongoose.model<IInvite>("Invite", inviteSchema);
