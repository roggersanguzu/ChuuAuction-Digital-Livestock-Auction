import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config({ quiet: true });

const [, , emailArg, passwordArg] = process.argv;
const email = String(emailArg || "").trim().toLowerCase();
const password = String(passwordArg || "");

if (!email || !password) {
  console.error("Usage: node scripts/resetUserPassword.js <email> <newPassword>");
  process.exit(1);
}

if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const user = await User.findOne({ email });

  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  user.password = await bcrypt.hash(password, 12);
  await user.save();

  console.log(`Password reset successfully for ${email}`);
  await mongoose.disconnect();
} catch (error) {
  console.error("Failed to reset password:", error.message);
  process.exit(1);
}
