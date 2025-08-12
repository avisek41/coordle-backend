import mongoose, { Document, Schema } from "mongoose";

// Define the Plan interface
export interface IPlan extends Document {
  planName: string;
  planVariant?: string;
  price: number;
  currency: string;
  planId: string;
  stripePlanId: string;
  features: string[];
  allowedHost: number;
  allocation?: string;
  participants?: string;
  maxParticipants?: number;
  freeTrial?: string;
  months?: number;
  trialDays: number;
  successUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Plan schema
const planSchema = new Schema<IPlan>(
  {
    planName: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
    },
    planVariant: {
      type: String,
      required: false,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Plan price is required"],
      min: [0, "Price cannot be negative"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      default: "usd",
      uppercase: true,
    },
    planId: {
      type: String,
      required: [true, "Plan ID is required"],
      unique: true,
      trim: true,
    },
    stripePlanId: {
      type: String,
      required: [true, "Stripe Plan ID is required"],
      unique: true,
      trim: true,
    },
    features: {
      type: [String],
      required: [true, "Plan features are required"],
    },
    allowedHost: {
      type: Number,
      required: [true, "Allowed hosts count is required"],
      min: [1, "At least 1 host must be allowed"],
    },
    allocation: {
      type: String,
      required: false,
      trim: true,
    },
    participants: {
      type: String,
      required: false,
      trim: true,
    },
    maxParticipants: {
      type: Number,
      required: false,
      min: [1, "Max participants must be at least 1"],
    },
    freeTrial: {
      type: String,
      required: false,
      trim: true,
    },
    months: {
      type: Number,
      required: false,
      min: [1, "Months must be at least 1"],
    },
      trialDays: {
    type: Number,
    required: [true, "Trial days are required"],
    min: [0, "Trial days cannot be negative"],
    default: 0,
  },
  successUrl: {
    type: String,
    required: false,
    trim: true,
  },
  },
  {
    timestamps: true,
  }
);

// Create indexes
planSchema.index({ planId: 1 });
planSchema.index({ stripePlanId: 1 });
planSchema.index({ planName: 1 });

// Create and export the Plan model
const Plan = mongoose.model<IPlan>("Plan", planSchema);

export default Plan;
