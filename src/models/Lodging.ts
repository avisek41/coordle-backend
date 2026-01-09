import mongoose, { Document, Schema } from "mongoose";

export interface ILodging extends Document {
  lodging_name: string;
  check_in: Date;
  check_out: Date;
  phone?: string;
  website?: string;
  reservation_code?: string;
  address?: string;
  notes?: string;
  trip_id: string;
  owner_id: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const lodgingSchema = new Schema<ILodging>(
  {
    lodging_name: {
      type: String,
      required: true,
      trim: true,
    },
    check_in: {
      type: Date,
      required: true,
    },
    check_out: {
      type: Date,
      required: true,
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

lodgingSchema.index({ trip_id: 1 });
lodgingSchema.index({ owner_id: 1 });
lodgingSchema.index({ check_in: 1 });

lodgingSchema.pre("save", function (next) {
  if (this.check_in && this.check_out && this.check_out < this.check_in) {
    return next(new Error("Check-out date cannot be before check-in date"));
  }
  next();
});

const Lodging = mongoose.model<ILodging>("Lodging", lodgingSchema);

export default Lodging;
