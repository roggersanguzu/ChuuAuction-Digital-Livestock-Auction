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
  getUserNotifications,
  getAdminAnalytics,
  getAdminSettings,
  updateAdminSettings,
  getAdminSystemHealth,
  runAdminSecurityAction,
  getUserSettings,
  updateUserSettings,
} from "../controllers/userController.js";
const router = express.Router();
router.use((req, res, next) => {
  next();
});
router.get("/current", getCurrentUser);
router.get("/dashboard-stats", getDashboardStats);
router.get("/notifications", getUserNotifications);
router.get("/settings", getUserSettings);
router.put("/settings", updateUserSettings);
router.get("/admin/analytics", getAdminAnalytics);
router.get("/admin/settings", getAdminSettings);
router.put("/admin/settings", updateAdminSettings);
router.get("/admin/system-health", getAdminSystemHealth);
router.post("/admin/security-actions", runAdminSecurityAction);
router.get("/admin/users", adminListUsers);
router.post("/admin/users", adminCreateUser);
router.patch("/admin/users/:userId", adminUpdateUser);
router.patch("/admin/users/:userId/status", adminUpdateUserStatus);
router.patch("/admin/users/:userId/password", adminResetUserPassword);
router.delete("/admin/users/:userId", adminDeleteUser);
export default router;
