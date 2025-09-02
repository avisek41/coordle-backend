const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/coordle");

// Define the Plan schema (simplified for update)
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

// Update plan names function
async function updatePlanNames() {
  try {
    // Wait for connection to be ready
    await mongoose.connection.asPromise();

    console.log("🔄 Starting plan name updates...");

    // Update "Organizations Plan" to "Organizations"
    const organizationsUpdate = await Plan.updateMany(
      { planName: "Organizations Plan" },
      { $set: { planName: "Organizations" } }
    );
    console.log(`✅ Updated ${organizationsUpdate.modifiedCount} Organizations plans`);

    // Update "One Time Event Plan" to "One Time Event"
    const oneTimeEventUpdate = await Plan.updateMany(
      { planName: "One Time Event Plan" },
      { $set: { planName: "One Time Event" } }
    );
    console.log(`✅ Updated ${oneTimeEventUpdate.modifiedCount} One Time Event plans`);

    // Display updated plans
    const updatedPlans = await Plan.find().sort({ createdAt: -1 });
    console.log("\n📋 Updated plans:");
    
    updatedPlans.forEach((plan) => {
      console.log(
        `   - ${plan.planName}${
          plan.planVariant ? ` ${plan.planVariant}` : ""
        } ($${plan.price}) - ${plan.planId}`
      );
    });

    console.log("\n🎉 Plan name updates completed successfully!");
  } catch (error) {
    console.error("❌ Error updating plan names:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the update after connection is established
mongoose.connection.once("open", () => {
  updatePlanNames();
}); 