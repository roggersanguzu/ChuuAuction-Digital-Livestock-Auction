// userRoutes.js - Routes for user operations
import express from "express";
import { getCurrentUser } from "../controllers/userController.js";

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

export default router;
