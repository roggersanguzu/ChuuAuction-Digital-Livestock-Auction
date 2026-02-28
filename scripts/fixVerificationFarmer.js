// scripts/fixVerificationFarmer.js
// Usage: Run this script to link existing verifications to users
// Run with: node --loader ts-node/esm scripts/fixVerificationFarmer.js
// Or compile and run with regular node

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/digital-livestock-auction";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB\n");

  const User = (await import("../models/User.js")).default;
  const Verification = (await import("../models/Verification.js")).default;

  // Show usage
  console.log("=== Verification Farmer Linking Script ===\n");

  // Option 1: List all users
  console.log("--- All Users ---");
  const users = await User.find({}, "name email role").lean();
  users.forEach((u) => {
    console.log(
      `ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`,
    );
  });
  console.log("\n");

  // Option 2: List all verifications with null farmer
  console.log("--- Verifications with null farmer (unlinked) ---");
  const unlinkedVerifications = await Verification.find({
    farmer: null,
  }).lean();
  console.log(`Found ${unlinkedVerifications.length} unlinked verifications\n`);

  unlinkedVerifications.forEach((v) => {
    console.log(
      `ID: ${v._id} | Type: ${v.verificationType} | Status: ${v.status} | Created: ${v.createdAt}`,
    );
  });
  console.log("\n");

  // Option 3: Show linked verifications (for reference)
  console.log("--- Currently Linked Verifications ---");
  const linkedCount = await Verification.countDocuments({
    farmer: { $ne: null },
  });
  console.log(`Found ${linkedCount} linked verifications\n`);

  // Example: How to link a verification to a user
  console.log("--- How to link a verification ---");
  console.log(
    "To link a verification to a user, run this command in MongoDB shell:",
  );
  console.log(`
db.verifications.updateOne(
  { "_id": ObjectId("VERIFICATION_ID") },
  { "$set": { "farmer": ObjectId("USER_ID") } }
)
  `);

  console.log("\nExample:");
  console.log("db.verifications.updateOne(");
  console.log('  { "_id": ObjectId("65abc123def4567890123456") },');
  console.log(
    '  { "$set": { "farmer": ObjectId("65abc123def4567890123457") } }',
  );
  console.log(")");

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
