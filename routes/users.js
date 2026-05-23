import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
const router = express.Router();

function normalizePublicRegistrationRole(inputRole) {
  const role = String(inputRole || "").trim().toLowerCase();
  if (role === "seller" || role === "farmer") return "Seller";
  if (role === "buyer") return "Buyer";
  return null;
}

router.post("/users", async (req, res) => {
  const { name, email, phone, role, password, confirmPassword, terms } = req.body;
  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({
      success: false,
      message:
        "Required fields missing: name, email, phone, password, role",
    });
  }
  if (!terms) {
    return res.status(400).json({
      success: false,
      message: "Terms & Conditions must be accepted",
    });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
  }
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }
    const normalizedRole = normalizePublicRegistrationRole(role);
    if (!normalizedRole) {
      return res.status(400).json({
        success: false,
        message: "Please select either Seller or Buyer",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : undefined,
      role: normalizedRole,
      password: hashedPassword,
    });
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: err.message,
    });
  }
});
export default router;
