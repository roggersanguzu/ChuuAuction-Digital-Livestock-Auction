// scripts/linkVerifications.js
// Links existing verifications to a user
// Run with: node scripts/linkVerifications.js

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/digital-livestock-auction";

const FARMER_ID = "698d5fee49063128c7747f3e"; // Roggers Anguzu

const VERIFICATION_IDS = [
  "69a28a4646e72944092d046c",
  "69a28f5ba5cc3d3406494e25",
  "69a29fcf6af53bdb318b8f30",
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB\n");

  const Verification = (await import("../models/Verification.js")).default;

  for (const verId of VERIFICATION_IDS) {
    const result = await Verification.updateOne(
      { _id: verId },
      { $set: { farmer: FARMER_ID } },
    );
    console.log(`Linked ${verId}: ${result.modifiedCount} document updated`);
  }

  // Verify the updates
  console.log("\n--- Updated Verifications ---");
  const updated = await Verification.find({ _id: { $in: VERIFICATION_IDS } })
    .populate("farmer", "name email")
    .lean();

  updated.forEach((v) => {
    console.log(
      `ID: ${v._id} | Farmer: ${v.farmer?.name || "Guest"} | Email: ${v.farmer?.email || "N/A"}`,
    );
  });

  await mongoose.disconnect();
  console.log("\nDone! Disconnected from MongoDB");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
