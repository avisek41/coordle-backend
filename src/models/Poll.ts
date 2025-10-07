import mongoose, { Document, Schema } from "mongoose";

// Define the Poll interface
export interface IPoll extends Document {
  question: string;
  options: string[];
  allow_multi_answers: boolean;
  published: boolean;
  owner_id: string;
  createdBy: string;
  trip_id: string;
  status: "Open" | "Closed";
  create_poll_at: string;
  display_create_poll_at: string;
  close_poll_date: string;
  close_poll_time: string;
  close_poll_date_time: string;
  display_close_poll_date: string;
  display_close_poll_time: string;
  reminders: number[];
  createdAt: Date;
  updatedAt: Date;
}

// Create the Poll schema
const pollSchema = new Schema<IPoll>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Poll question cannot be more than 500 characters"],
    },
    options: [
      {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, "Poll option cannot be more than 200 characters"],
      },
    ],
    allow_multi_answers: {
      type: Boolean,
      required: true,
      default: false,
    },
    published: {
      type: Boolean,
      required: true,
      default: false,
    },
    owner_id: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },
    trip_id: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["Open", "Closed"],
      default: "Open",
      trim: true,
    },
    create_poll_at: {
      type: String,
      required: true,
      trim: true,
    },
    display_create_poll_at: {
      type: String,
      required: true,
      trim: true,
    },
    close_poll_date: {
      type: String,
      required: false,
      trim: true,
    },
    close_poll_time: {
      type: String,
      required: false,
      trim: true,
    },
    close_poll_date_time: {
      type: String,
      required: false,
      trim: true,
    },
    display_close_poll_date: {
      type: String,
      required: false,
      trim: true,
    },
    display_close_poll_time: {
      type: String,
      required: false,
      trim: true,
    },
    reminders: [
      {
        type: Number,
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
pollSchema.index({ owner_id: 1 });
pollSchema.index({ trip_id: 1 });
pollSchema.index({ status: 1 });
pollSchema.index({ published: 1 });
pollSchema.index({ create_poll_at: 1 });

// Pre-save middleware to validate poll options
pollSchema.pre("save", function (next) {
  // Ensure there are at least 2 options for a poll
  if (this.options.length < 2) {
    return next(new Error("Poll must have at least 2 options"));
  }
  
  // Ensure there are no more than 10 options
  if (this.options.length > 10) {
    return next(new Error("Poll cannot have more than 10 options"));
  }
  
  next();
});

// Virtual for poll duration (if close date is provided)
pollSchema.virtual("duration").get(function () {
  if (!this.create_poll_at || !this.close_poll_date) {
    return null;
  }

  const start = new Date(this.create_poll_at);
  const end = new Date(this.close_poll_date);
  
  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null;
  }
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Same day";
  } else if (diffDays === 1) {
    return "1 day";
  } else {
    return `${diffDays} days`;
  }
});

// Virtual for poll status display
pollSchema.virtual("status_display").get(function () {
  switch (this.status) {
    case "Open":
      return "Open for voting";
    case "Closed":
      return "Voting closed";
    default:
      return this.status;
  }
});

// Ensure virtual fields are included in JSON output
pollSchema.set("toJSON", { virtuals: true });
pollSchema.set("toObject", { virtuals: true });

const Poll = mongoose.model<IPoll>("Poll", pollSchema);

export default Poll;