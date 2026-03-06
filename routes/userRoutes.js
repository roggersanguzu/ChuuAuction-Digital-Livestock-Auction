// userRoutes.js - Routes for user operations
import express from "express";
import {
  getCurrentUser,
  getDashboardStats,
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminUpdateUserStatus,
  adminResetUserPassword,
  adminDeleteUser,
} from "../controllers/userController.js";

const router = express.Router();

// Log all incoming requests to user routes
router.use((req, res, next) => {
  console.log(`[UserRoute] ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================
// USER API ROUTES
// ============================================

// Get current logged-in user
router.get("/current", getCurrentUser);

// Get dynamic dashboard statistics for current logged-in user
router.get("/dashboard-stats", getDashboardStats);

// Admin user management APIs
router.get("/admin/users", adminListUsers);
router.post("/admin/users", adminCreateUser);
router.patch("/admin/users/:userId", adminUpdateUser);
router.patch("/admin/users/:userId/status", adminUpdateUserStatus);
router.patch("/admin/users/:userId/password", adminResetUserPassword);
router.delete("/admin/users/:userId", adminDeleteUser);

export default router;
