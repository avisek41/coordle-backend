import mongoose, { Document, Schema } from "mongoose";

export interface IActivity extends Document {
  activity_name: string;
  reservation_date: Date;
  startTime: Date;
  endTime?: Date;
  phone?: string;
  website?: string;
  reservation_code?: string;
  tickets?: string;
  address?: string;
  notes?: string;
  activity_type: string;
  trip_id: string;
  owner_id: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    activity_name: {
      type: String,
      required: true,
      trim: true,
    },
    reservation_date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: false,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    reservation_code: {
      type: String,
      trim: true,
      default: "",
    },
    tickets: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    activity_type: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "restaurant",
        "tour",
        "museum",
        "bar_party",
        "event",
        "training",
        "relax",
        "fitness",
        "shopping",
        "concert",
        "kids",
        "theater",
        "meeting",
        "misc",
        "other",
      ],
    },
    trip_id: {
      type: String,
      required: true,
      trim: true,
    },
    owner_id: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({ trip_id: 1 });
activitySchema.index({ owner_id: 1 });
activitySchema.index({ reservation_date: 1 });
activitySchema.index({ activity_type: 1 });

activitySchema.pre("save", function (next) {
  if (this.startTime && this.endTime && this.endTime < this.startTime) {
    return next(new Error("End time cannot be before start time"));
  }
  next();
});

const Activity = mongoose.model<IActivity>("Activity", activitySchema);

export default Activity;

