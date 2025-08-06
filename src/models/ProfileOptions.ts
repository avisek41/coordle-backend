import mongoose, { Document, Schema } from "mongoose";

// Define the ProfileOptions interface
export interface IProfileOptions extends Document {
  category: string;
  options: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Create the ProfileOptions schema
const profileOptionsSchema = new Schema<IProfileOptions>(
  {
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "racialEthnic",
          "pronouns", 
          "ageDemographic",
          "foodAllergies",
          "dietaryRestrictions",
          "genderIdentity",
          "sexualOrientation",
          "disabilityStatus"
        ],
        message: "Category must be one of the predefined values"
      },
      unique: true,
      trim: true
    },
    options: {
      type: [String],
      required: [true, "Options array is required"],
      validate: {
        validator: function(options: string[]) {
          return options.length > 0;
        },
        message: "At least one option must be provided"
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, "Display order must be 0 or greater"]
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for better query performance
profileOptionsSchema.index({ category: 1 });
profileOptionsSchema.index({ isActive: 1 });
profileOptionsSchema.index({ displayOrder: 1 });

// Create and export the ProfileOptions model
const ProfileOptions = mongoose.model<IProfileOptions>("ProfileOptions", profileOptionsSchema);

export default ProfileOptions; 