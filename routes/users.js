import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

router.post("/users", async (req, res) => {
  const { name, email, phone, role, password, confirmPassword } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message:
        "Required fields missing: name (or fullName), email, password, role",
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

    const hashedPassword = await bcrypt.hash(password, 12);

    const normalizedRole =
      role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

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
    console.error("Registration failed:", err);

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
