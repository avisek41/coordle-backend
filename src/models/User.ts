import mongoose, { Document, Schema } from "mongoose";

// Define the user role enum
export enum UserRole {
  OWNER = "owner",
  HOST = "host",
  TRAVELLER = "traveller",
}

// Define the User interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  userRole: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Create the User schema
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    userRole: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: "User role must be either 'owner', 'host', or 'traveller'",
      },
      required: [true, "User role is required"],
      default: UserRole.TRAVELLER,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ userRole: 1 });

// Create and export the User model
const User = mongoose.model<IUser>("User", userSchema);

export default User;
