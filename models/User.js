import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["Seller", "Buyer", "Administrator"],
      default: "Buyer",
    },
    accountStatus: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPasswordBeforeSave() {
  if (!this.isModified("password")) {
    return;
  }

  const passwordValue = String(this.password || "");
  if (!passwordValue || BCRYPT_HASH_PATTERN.test(passwordValue)) {
    return;
  }

  this.password = await bcrypt.hash(passwordValue, 12);
});

const User = mongoose.model("User", userSchema);
export default User;
