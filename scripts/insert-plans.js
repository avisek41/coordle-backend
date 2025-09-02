const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/coordle")
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error.message);
    console.log(
      "💡 Make sure MongoDB is running and MONGO_URI is set correctly"
    );
    process.exit(1);
  });

// Define the Plan schema (simplified for insertion)
const planSchema = new mongoose.Schema(
  {
    planName: String,
    planVariant: String,
    price: Number,
    currency: String,
    planId: String,
    features: [String],
    allowedHost: Number,
    allocation: String,
    participants: String,
    maxParticipants: Number,
    freeTrial: String,
    months: Number,
    trialDays: Number,
  },
  { timestamps: true }
);

const Plan = mongoose.model("Plan", planSchema);

// Your plan data
const plans = [
  {
    planName: "One Time Event",
    price: 250,
    currency: "usd",
    features: ["1 Trip", "3 Hosts per trip"],
    allowedHost: 3,
    allocation: "(101 - 200 participants)",
    participants: "up to 200 participants",
    maxParticipants: 200,
    planId: "price_1PLORZL3qbE5MV2US4eD1PCY",
    trialDays: 7,
  },
  {
    planName: "One Time Event",
    price: 175,
    currency: "usd",
    features: ["1 Trip", "3 Hosts per trip"],
    allowedHost: 3,
    allocation: "(0 - 100 participants)",
    participants: "up to 100 participants",
    maxParticipants: 100,
    planId: "price_1QCijvQ5Jb8tAZRGyBE0DKzP",
    trialDays: 7,
  },
  {
    planName: "Organizations",
    planVariant: "PRO",
    price: 1200,
    currency: "usd",
    features: [
      "Unlimited trips",
      "Invite unlimited members",
      "3 Hosts per trip",
      "15 Days free trial",
    ],
    allowedHost: 3,
    freeTrial: "15 Days",
    months: 12,
    planId: "price_1QCilhQ5Jb8tAZRGxmyh7YD7",
    trialDays: 15,
  },
  {
    planName: "Organizations",
    planVariant: "STANDARD",
    price: 840,
    currency: "usd",
    features: [
      "Unlimited trips",
      "Invite unlimited members",
      "3 Hosts per trip",
      "15 Days free trial",
    ],
    allowedHost: 3,
    freeTrial: "15 Days",
    months: 6,
    planId: "price_1QCimuQ5Jb8tAZRGwz1s5ZNh",
    trialDays: 15,
  },
];

// Insert plans function
async function insertPlans() {
  try {
    // Wait for connection to be ready
    await mongoose.connection.asPromise();

    console.log("🌱 Starting plan insertion...");

    // Clear existing plans first
    await Plan.deleteMany({});
    console.log("🗑️  Cleared existing plans");

    // Insert new plans
    const createdPlans = await Plan.insertMany(plans);
    console.log(`✅ Successfully created ${createdPlans.length} plans:`);

    createdPlans.forEach((plan) => {
      console.log(
        `   - ${plan.planName}${
          plan.planVariant ? ` ${plan.planVariant}` : ""
        } ($${(plan.price / 100).toFixed(2)}) - ${plan.planId}`
      );
    });

    console.log("🎉 Plan insertion completed successfully!");
  } catch (error) {
    console.error("❌ Error inserting plans:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the insertion after connection is established
mongoose.connection.once("open", () => {
  insertPlans();
});
