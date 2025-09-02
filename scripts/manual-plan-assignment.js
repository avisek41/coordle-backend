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

// Manual plan assignment function
async function manualPlanAssignment() {
  try {
    // Wait for connection to be ready
    await mongoose.connection.asPromise();

    console.log("🔄 Starting manual plan assignment...");

    // Get all available plans
    const availablePlans = await Plan.find().sort({ price: -1 });
    console.log(`📋 Available plans:`);
    
    availablePlans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.planName}${plan.planVariant ? ` ${plan.planVariant}` : ""} ($${plan.price}) - ID: ${plan._id}`);
    });

    // Get all owners
    const allOwners = await User.find({ userRole: "owner" }).sort({ createdAt: -1 });
    console.log(`\n👥 All owners:`);
    
    allOwners.forEach((owner, index) => {
      const currentPlan = owner.planId ? "Has Plan" : "No Plan";
      console.log(`${index + 1}. ${owner.name || owner.email || owner.phoneNumber} - ${currentPlan}`);
    });

    // Example manual assignments (you can modify these)
    const manualAssignments = [
      // Format: { userEmail: "user@example.com", planName: "Organizations", planVariant: "PRO" }
      // Add your specific assignments here
      // Example:
      // { userEmail: "admin@company.com", planName: "Organizations", planVariant: "PRO" },
      // { userEmail: "event@company.com", planName: "One Time Event" }
    ];

    if (manualAssignments.length === 0) {
      console.log("\n⚠️  No manual assignments configured. Please edit the script to add specific assignments.");
      console.log("Example format:");
      console.log('{ userEmail: "admin@company.com", planName: "Organizations", planVariant: "PRO" }');
      return;
    }

    console.log(`\n🔄 Processing ${manualAssignments.length} manual assignments...`);

    for (const assignment of manualAssignments) {
      try {
        // Find the user
        const user = await User.findOne({ email: assignment.userEmail });
        if (!user) {
          console.log(`❌ User with email ${assignment.userEmail} not found`);
          continue;
        }

        // Find the plan
        let plan;
        if (assignment.planVariant) {
          plan = await Plan.findOne({ 
            planName: assignment.planName, 
            planVariant: assignment.planVariant 
          });
        } else {
          plan = await Plan.findOne({ planName: assignment.planName });
        }

        if (!plan) {
          console.log(`❌ Plan ${assignment.planName}${assignment.planVariant ? ` ${assignment.planVariant}` : ""} not found`);
          continue;
        }

        // Update the user's plan
        await User.findByIdAndUpdate(user._id, { planId: plan._id });
        console.log(`✅ Assigned ${plan.planName}${plan.planVariant ? ` ${plan.planVariant}` : ""} to ${user.email}`);

      } catch (error) {
        console.error(`❌ Error assigning plan to ${assignment.userEmail}:`, error);
      }
    }

    // Show final summary
    const totalOwners = await User.countDocuments({ userRole: "owner" });
    const ownersWithPlans = await User.countDocuments({ 
      userRole: "owner", 
      planId: { $exists: true, $ne: null } 
    });

    console.log(`\n📈 Final Summary:`);
    console.log(`   - Total owners: ${totalOwners}`);
    console.log(`   - Owners with plans: ${ownersWithPlans}`);
    console.log(`   - Owners without plans: ${totalOwners - ownersWithPlans}`);

    console.log("\n🎉 Manual plan assignment completed!");

  } catch (error) {
    console.error("❌ Error in manual plan assignment:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the assignment after connection is established
mongoose.connection.once("open", () => {
  manualPlanAssignment();
}); 