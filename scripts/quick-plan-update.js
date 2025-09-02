const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/coordle"
);

// Define the schemas
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phoneNumber: String,
    userRole: String,
    planId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

const planSchema = new mongoose.Schema(
  {
    planName: String,
    planVariant: String,
    price: Number,
    currency: String,
    planId: String,
    features: [String],
    allowedHost: Number,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Plan = mongoose.model("Plan", planSchema);

// Quick plan update function
async function quickPlanUpdate() {
  try {
    // Wait for connection to be ready
    await mongoose.connection.asPromise();

    console.log("🚀 Quick Plan Update for Existing Owners");
    console.log("========================================");

    // Get all plans
    const plans = await Plan.find();
    console.log("\n📋 Available Plans:");
    plans.forEach((plan, index) => {
      console.log(
        `${index + 1}. ${plan.planName}${
          plan.planVariant ? ` ${plan.planVariant}` : ""
        } - $${plan.price} - ID: ${plan._id}`
      );
    });

    // Get Organizations PRO plan (recommended for owners)
    const orgProPlan = plans.find(
      (p) => p.planName === "Organizations" && p.planVariant === "PRO"
    );
    const oneTimeEventPlan = plans.find((p) => p.planName === "One Time Event");

    if (!orgProPlan) {
      console.log("\n❌ Organizations PRO plan not found!");
      return;
    }

    console.log(
      `\n🎯 Using plan: ${orgProPlan.planName} ${orgProPlan.planVariant} (ID: ${orgProPlan._id})`
    );

    // Count owners without plans
    const ownersWithoutPlans = await User.countDocuments({
      userRole: "owner",
      $or: [{ planId: { $exists: false } }, { planId: null }],
    });

    console.log(`\n👥 Found ${ownersWithoutPlans} owners without plans`);

    if (ownersWithoutPlans === 0) {
      console.log("✅ All owners already have plans!");
      return;
    }

    // Update all owners without plans to have the Organizations PRO plan
    const result = await User.updateMany(
      {
        userRole: "owner",
        $or: [{ planId: { $exists: false } }, { planId: null }],
      },
      { $set: { planId: orgProPlan._id } }
    );

    console.log(
      `\n✅ Successfully updated ${result.modifiedCount} owners with plan: ${orgProPlan.planName} ${orgProPlan.planVariant}`
    );

    // Show verification
    const updatedOwners = await User.find({
      userRole: "owner",
      planId: orgProPlan._id,
    });

    console.log(
      `\n📊 Verification - Owners with ${orgProPlan.planName} ${orgProPlan.planVariant}:`
    );
    updatedOwners.forEach((owner) => {
      console.log(`   - ${owner.name || owner.email || owner.phoneNumber}`);
    });

    // Final summary
    const totalOwners = await User.countDocuments({ userRole: "owner" });
    const ownersWithPlans = await User.countDocuments({
      userRole: "owner",
      planId: { $exists: true, $ne: null },
    });

    console.log(`\n📈 Final Summary:`);
    console.log(`   - Total owners: ${totalOwners}`);
    console.log(`   - Owners with plans: ${ownersWithPlans}`);
    console.log(`   - Owners without plans: ${totalOwners - ownersWithPlans}`);

    console.log("\n🎉 Quick plan update completed!");
  } catch (error) {
    console.error("❌ Error in quick plan update:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the update after connection is established
mongoose.connection.once("open", () => {
  quickPlanUpdate();
});
