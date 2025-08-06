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

  // Profile fields (all optional)
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  pronouns?: string;
  country?: string;
  state?: string;
  postalCode?: string;
  preferredAirport?: string;
  racialEthnic?: string;
  ageDemographic?: string;
  foodAllergies?: string[];
  dietaryRestrictions?: string;
  genderIdentity?: string;
  sexualOrientation?: string;
  disabilityStatus?: string;

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

    // Profile fields (all optional)
    firstName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "First name cannot be more than 50 characters"],
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "Last name cannot be more than 50 characters"],
    },
    preferredName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "Preferred name cannot be more than 50 characters"],
    },
    pronouns: {
      type: String,
      required: false,
      trim: true,
      maxlength: [20, "Pronouns cannot be more than 20 characters"],
    },
    country: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "Country cannot be more than 50 characters"],
    },
    state: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "State cannot be more than 50 characters"],
    },
    postalCode: {
      type: String,
      required: false,
      trim: true,
      maxlength: [20, "Postal code cannot be more than 20 characters"],
    },
    preferredAirport: {
      type: String,
      required: false,
      trim: true,
      maxlength: [10, "Preferred airport cannot be more than 10 characters"],
    },
    racialEthnic: {
      type: String,
      required: false,
      trim: true,
      maxlength: [
        100,
        "Racial/ethnic background cannot be more than 100 characters",
      ],
    },
    ageDemographic: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "Age demographic cannot be more than 50 characters"],
    },
    foodAllergies: {
      type: [String],
      required: false,
      default: [],
    },
    dietaryRestrictions: {
      type: String,
      required: false,
      trim: true,
      maxlength: [
        200,
        "Dietary restrictions cannot be more than 200 characters",
      ],
    },
    genderIdentity: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "Gender identity cannot be more than 50 characters"],
    },
    sexualOrientation: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "Sexual orientation cannot be more than 50 characters"],
    },
    disabilityStatus: {
      type: String,
      required: false,
      trim: true,
      maxlength: [50, "Disability status cannot be more than 50 characters"],
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
