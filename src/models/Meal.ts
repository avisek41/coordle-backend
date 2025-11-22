import mongoose, { Document, Schema } from "mongoose";

// Define the Restaurant interface
export interface IRestaurant {
  link: string;
  name: string;
}

// Define the FoodOrder interface
export interface IFoodOrder {
  name: string;
  userId: string;
  meal?: string;
}

export enum MealType {
  Breakfast = "breakfast",
  Lunch = "lunch",
  Dinner = "dinner",
  Snack = "snack",
  PreGame = "pre-game",
  PostGameDinner = "post-game-dinner",
}

// Define the Meal interface
export interface IMeal extends Document {
  meal_date: string; // ISO date string
  order_deadline_date_time: string; // ISO date string
  meal_type: string;
  restaurants: IRestaurant[];
  trip_id: string;
  reminders: number[];
  food_order?: IFoodOrder[];
  owner_id?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Meal schema
const mealSchema = new Schema<IMeal>(
  {
    meal_date: {
      type: String,
      required: true,
      trim: true,
    },
    order_deadline_date_time: {
      type: String,
      required: true,
      trim: true,
    },
    meal_type: {
      type: String,
      required: true,
      enum: Object.values(MealType),
      trim: true,
    },
    restaurants: [
      {
        link: {
          type: String,
          required: true,
          trim: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    trip_id: {
      type: String,
      required: true,
      trim: true,
    },
    reminders: [
      {
        type: Number,
        required: false,
      },
    ],
    food_order: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        userId: {
          type: String,
          required: true,
          trim: true,
        },
        meal: {
          type: String,
          required: false,
          trim: true,
        },
      },
    ],
    owner_id: {
      type: String,
      required: false,
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

// Create indexes for better query performance
mealSchema.index({ trip_id: 1 });
mealSchema.index({ meal_date: 1 });
mealSchema.index({ meal_type: 1 });
mealSchema.index({ owner_id: 1 });

// Pre-save middleware to validate restaurants
mealSchema.pre("save", function (next) {
  // Ensure there is at least 1 restaurant
  if (!this.restaurants || this.restaurants.length < 1) {
    return next(new Error("Meal must have at least 1 restaurant"));
  }

  next();
});

const Meal = mongoose.model<IMeal>("Meal", mealSchema);

export default Meal;

