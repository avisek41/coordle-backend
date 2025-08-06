import { ProfileOptions } from "../models";
import connectDB from "../config/db";

const seedProfileOptions = async () => {
  try {
    await connectDB();

    const profileOptionsData = [
      {
        category: "racialEthnic",
        options: [
          "Asian",
          "Black or African American",
          "Hispanic or Latino",
          "Native American or Alaska Native",
          "Native Hawaiian or Pacific Islander",
          "White",
          "Middle Eastern or North African",
          "Mixed Race",
          "Other",
          "Prefer not to say",
        ],
        displayOrder: 1,
      },
      {
        category: "pronouns",
        options: [
          "He/Him",
          "She/Her",
          "They/Them",
          "He/They",
          "She/They",
          "Other",
          "Prefer not to say",
        ],
        displayOrder: 2,
      },
      {
        category: "ageDemographic",
        options: [
          "18-24",
          "25-34",
          "35-44",
          "45-54",
          "55-64",
          "65+",
          "Prefer not to say",
        ],
        displayOrder: 3,
      },
      {
        category: "foodAllergies",
        options: [
          "All seafood (including shellfish)",
          "Dairy",
          "Gluten",
          "Tree Nuts",
          "Peanuts",
          "No Allergy",
          "Others",
        ],
        displayOrder: 4,
      },
      {
        category: "dietaryRestrictions",
        options: [
          "Vegetarian",
          "Vegan",
          "Pescatarian",

          "Paleo",
          "Halal",
          "Kosher",
          "None",
        ],
        displayOrder: 5,
      },
      {
        category: "genderIdentity",
        options: [
          "Man",
          "Woman",
          "Non-binary",
          "Genderfluid",
          "Agender",
          "Bigender",
          "Other",
          "Prefer not to say",
        ],
        displayOrder: 6,
      },
      {
        category: "sexualOrientation",
        options: [
          "Straight",
          "Gay",
          "Lesbian",
          "Bisexual",
          "Pansexual",
          "Asexual",
          "Other",
          "Prefer not to say",
        ],
        displayOrder: 7,
      },
      {
        category: "disabilityStatus",
        options: [
          "No disability",
          "Physical disability",
          "Visual impairment",
          "Hearing impairment",
          "Cognitive disability",
          "Mental health condition",
          "Chronic illness",
          "Other",
          "Prefer not to say",
        ],
        displayOrder: 8,
      },
    ];

    // Clear existing data
    await ProfileOptions.deleteMany({});

    // Insert new data
    const result = await ProfileOptions.insertMany(profileOptionsData);

    console.log(
      `✅ Successfully seeded ${result.length} profile options categories`
    );
    console.log("Categories seeded:");
    result.forEach((item) => {
      console.log(`  - ${item.category}: ${item.options.length} options`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding profile options:", error);
    process.exit(1);
  }
};

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedProfileOptions();
}

export default seedProfileOptions;
