const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/coordle");

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

// Assign plans to existing owners function
async function assignPlansToOwners() {
  try {
    // Wait for connection to be ready
    await mongoose.connection.asPromise();

    console.log("🔄 Starting plan assignment to existing owners...");

    // Get all available plans
    const availablePlans = await Plan.find().sort({ price: -1 });
    console.log(`📋 Found ${availablePlans.length} available plans:`);
    
    availablePlans.forEach((plan) => {
      console.log(
        `   - ${plan.planName}${plan.planVariant ? ` ${plan.planVariant}` : ""} ($${plan.price}) - ID: ${plan._id}`
      );
    });

    // Find all owners without plans
    const ownersWithoutPlans = await User.find({
      userRole: "owner",
      $or: [
        { planId: { $exists: false } },
        { planId: null }
      ]
    });

    console.log(`\n👥 Found ${ownersWithoutPlans.length} owners without plans:`);
    ownersWithoutPlans.forEach((owner) => {
      console.log(`   - ${owner.name || owner.email || owner.phoneNumber} (${owner.userRole})`);
    });

    if (ownersWithoutPlans.length === 0) {
      console.log("✅ All owners already have plans assigned!");
      return;
    }

    // Get user input for plan assignment strategy
    console.log("\n🎯 Plan Assignment Options:");
    console.log("1. Assign 'Organizations PRO' plan to all owners (recommended for business users)");
    console.log("2. Assign 'One Time Event' plan to all owners (for event organizers)");
    console.log("3. Assign plans based on user email domain (business vs personal)");
    console.log("4. Manual assignment for each owner");

    // For now, let's use option 1 (Organizations PRO) as default
    const defaultPlan = availablePlans.find(p => p.planName === "Organizations" && p.planVariant === "PRO");
    
    if (!defaultPlan) {
      console.log("❌ Organizations PRO plan not found. Please check your plans.");
      return;
    }

    console.log(`\n🔄 Assigning '${defaultPlan.planName} ${defaultPlan.planVariant}' plan to all owners...`);

    // Update all owners without plans
    const updateResult = await User.updateMany(
      {
        userRole: "owner",
        $or: [
          { planId: { $exists: false } },
          { planId: null }
        ]
      },
      { $set: { planId: defaultPlan._id } }
    );

    console.log(`✅ Successfully assigned plans to ${updateResult.modifiedCount} owners`);

    // Verify the updates
    const updatedOwners = await User.find({
      userRole: "owner",
      planId: defaultPlan._id
    });

    console.log(`\n📊 Verification - Owners with ${defaultPlan.planName} ${defaultPlan.planVariant}:`);
    updatedOwners.forEach((owner) => {
      console.log(`   - ${owner.name || owner.email || owner.phoneNumber} (${owner.userRole}) - Plan: ${owner.planId}`);
    });

    // Show summary
    const totalOwners = await User.countDocuments({ userRole: "owner" });
    const ownersWithPlans = await User.countDocuments({ 
      userRole: "owner", 
      planId: { $exists: true, $ne: null } 
    });

    console.log(`\n📈 Summary:`);
    console.log(`   - Total owners: ${totalOwners}`);
    console.log(`   - Owners with plans: ${ownersWithPlans}`);
    console.log(`   - Owners without plans: ${totalOwners - ownersWithPlans}`);

    console.log("\n🎉 Plan assignment completed successfully!");

  } catch (error) {
    console.error("❌ Error assigning plans to owners:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the assignment after connection is established
mongoose.connection.once("open", () => {
  assignPlansToOwners();
}); 