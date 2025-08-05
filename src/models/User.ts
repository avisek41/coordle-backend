import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

// Define the user role enum
export enum UserRole {
  OWNER = "owner",
  HOST = "host",
  TRAVELLER = "traveller",
}

// Define the User interface
export interface IUser extends Document {
  name?: string; // Optional for phone-based registration
  email?: string; // Optional for phone-based registration
  password?: string; // Optional for phone-based registration
  phoneNumber: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isProfileSetup: boolean;
  userRole: UserRole;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Create the User schema
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: false, // Optional for phone-based registration
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    email: {
      type: String,
      required: false, // Optional for phone-based registration
      unique: true,
      sparse: true, // Allow multiple null values
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      required: false, // Optional for phone-based registration
      minlength: [6, "Password must be at least 6 characters long"],
    },
    phoneNumber: {
      type: String,
      required: false, // Optional for email-based registration
      unique: true,
      sparse: true, // Allow multiple null values
      trim: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isProfileSetup: {
      type: Boolean,
      default: false,
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

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    if (this.password) {
      const saltRounds = 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Create indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ userRole: 1 });

// Create and export the User model
const User = mongoose.model<IUser>("User", userSchema);

export default User;
