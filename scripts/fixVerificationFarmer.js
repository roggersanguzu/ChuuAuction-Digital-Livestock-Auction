import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/digital-livestock-auction";
async function main() {
  await mongoose.connect(MONGO_URI);
  const User = (await import("../models/User.js")).default;
  const Verification = (await import("../models/Verification.js")).default;
  const users = await User.find({}, "name email role").lean();
  users.forEach((u) => {
});
  const unlinkedVerifications = await Verification.find({
    farmer: null,
  }).lean();
  unlinkedVerifications.forEach((v) => {
});
  const linkedCount = await Verification.countDocuments({
    farmer: { $ne: null },
  });
console.log(`
db.verifications.updateOne(
  { "_id": ObjectId("VERIFICATION_ID") },
  { "$set": { "farmer": ObjectId("USER_ID") } }
)
  `);
await mongoose.disconnect();
}
main().catch((err) => {
  process.exit(1);
});
