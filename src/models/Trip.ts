import mongoose, { Document, Schema } from "mongoose";

// Define the Trip interface
export interface ITrip extends Document {
  name: string;
  author: string;
  owner: {
    ref: string;
  };
  owner_id: string;
  photo_url: string;
  cover_image: {
    url: string;
    publicId: string;
    uploadedAt: Date;
  };
  display_start: string;
  display_end: string;
  start_date: Date;
  end_date: Date;
  to_address: string;
  to_location: {
    latitude: number;
    longitude: number;
  };
  from_address: string;
  from_location: {
    latitude: number;
    longitude: number;
  } | null;
  chatId: string;
  activity_count: number;
  broadcast_count: number;
  food_order_count: number;
  group_chat_count: number;
  lodging_count: number;
  miss_count: number;
  travel_count: number;
  trip_chat_count: number;
  invite_count: number;
  hosts: string[];
  users: string[];
  lastest_host_by: string | null;
  lastest_host_remove_by: string | null;
  remove_by: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Virtual field for trip duration
  duration?: string;
}

// Create the Trip schema
const tripSchema = new Schema<ITrip>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Trip name cannot be more than 100 characters"],
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      ref: {
        type: String,
        required: true,
        default: "/users/",
      },
    },
    owner_id: {
      type: String,
      required: true,
      trim: true,
    },
    photo_url: {
      type: String,
      default: "",
      trim: true,
    },
    cover_image: {
      url: {
        type: String,
        required: false,
        default: "",
        trim: true,
      },
      publicId: {
        type: String,
        required: false,
        default: "",
        trim: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    display_start: {
      type: String,
      required: true,
      trim: true,
    },
    display_end: {
      type: String,
      required: true,
      trim: true,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    to_address: {
      type: String,
      required: true,
      trim: true,
    },
    to_location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },
    from_address: {
      type: String,
      default: "",
      trim: true,
    },
    from_location: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
    chatId: {
      type: String,
      required: true,
      trim: true,
    },
    activity_count: {
      type: Number,
      default: 0,
    },
    broadcast_count: {
      type: Number,
      default: 0,
    },
    food_order_count: {
      type: Number,
      default: 0,
    },
    group_chat_count: {
      type: Number,
      default: 0,
    },
    lodging_count: {
      type: Number,
      default: 0,
    },
    miss_count: {
      type: Number,
      default: 0,
    },
    travel_count: {
      type: Number,
      default: 0,
    },
    trip_chat_count: {
      type: Number,
      default: 0,
    },
    invite_count: {
      type: Number,
      default: 0,
    },
    hosts: [
      {
        type: String,
        trim: true,
      },
    ],
    users: [
      {
        type: String,
        trim: true,
      },
    ],
    lastest_host_by: {
      type: String,
      default: null,
      trim: true,
    },
    lastest_host_remove_by: {
      type: String,
      default: null,
      trim: true,
    },
    remove_by: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
tripSchema.index({ owner_id: 1 });
tripSchema.index({ start_date: 1, end_date: 1 });

// Pre-save middleware to ensure owner ref is properly formatted
tripSchema.pre("save", function (next) {
  if (this.owner && !this.owner.ref.startsWith("/users/")) {
    this.owner.ref = `/users/${this.owner_id}`;
  }
  next();
});

// Virtual for trip duration
tripSchema.virtual("duration").get(function () {
  if (!this.start_date || !this.end_date) {
    return null;
  }

  const start = new Date(this.start_date);
  const end = new Date(this.end_date);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // If same date or 1 day difference, return "1 day"
  if (diffDays === 0 || diffDays === 1) {
    return "1 day";
  } else {
    return `${diffDays} days`;
  }
});

// Ensure virtual fields are included in JSON output
tripSchema.set("toJSON", { virtuals: true });
tripSchema.set("toObject", { virtuals: true });

const Trip = mongoose.model<ITrip>("Trip", tripSchema);

export default Trip;
