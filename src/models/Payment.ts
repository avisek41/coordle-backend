import mongoose, { Document, Schema } from "mongoose";

// Define the Payment interface
export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  stripePaymentIntentId?: string; // Optional for checkout sessions
  stripeSessionId?: string; // For checkout sessions
  stripeCustomerId?: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "canceled";
  paymentMethod?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Payment schema
const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Plan ID is required"],
    },
    stripePaymentIntentId: {
      type: String,
      required: false, // Optional for checkout sessions
      unique: true,
      sparse: true, // Allow multiple null values
    },
    stripeSessionId: {
      type: String,
      required: false, // For checkout sessions
      unique: true,
      sparse: true, // Allow multiple null values
    },
    stripeCustomerId: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      default: "usd",
      uppercase: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "succeeded", "failed", "canceled"],
        message:
          "Payment status must be 'pending', 'succeeded', 'failed', or 'canceled'",
      },
      required: [true, "Payment status is required"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
paymentSchema.index({ userId: 1 });
paymentSchema.index({ planId: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ stripeSessionId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: 1 });

// Create and export the Payment model
const Payment = mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;
