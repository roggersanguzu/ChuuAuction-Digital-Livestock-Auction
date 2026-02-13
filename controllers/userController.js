// userController.js - Controller for user operations
import User from "../models/User.js";

// Get current logged-in user
export const getCurrentUser = async (req, res) => {
  try {
    console.log("[UserController] Fetching current user");
    console.log("[UserController] Session:", req.session);

    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const userId = req.session.user._id || req.session.user.id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("[UserController] ✅ User found:", user.name);

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "Not provided",
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[UserController] ❌ Error fetching current user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user data",
      error: error.message,
    });
  }
};

export default {
  getCurrentUser,
};
