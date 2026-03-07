import express from "express";
import multer from "multer";
import {
  submitVerification,
  processAIVerification,
  getAdminAIVerificationSubmissions,
  getAdminAIVerificationSubmission,
  analyzeVerificationForAdmin,
  getVerificationStatus,
  getFarmerVerifications,
  getVerificationByAuction,
  getAllVerifications,
  getMyVerifications,
  updateVerificationStatus,
  getCurrentUser,
} from "../controllers/verificationController.js";
const router = express.Router();
const requireLogin = (req, res, next) => {
  if (!req.session?.user) {
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    return res.redirect("/auth/login");
  }
  return next();
};
const requireAdmin = (req, res, next) => {
  const role = String(req.session?.user?.role || "")
    .trim()
    .toLowerCase();
  if (role !== "admin" && role !== "administrator") {
    if (req.path.startsWith("/api/")) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }
    return res.redirect("/auth/login");
  }
  return next();
};
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only images and PDFs are allowed."),
        false,
      );
    }
  },
});
const uploadFields = upload.fields([
  { name: "ownershipDocuments", maxCount: 5 },
  { name: "healthDocuments", maxCount: 5 },
  { name: "animalPhotos", maxCount: 10 },
]);
router.get("/submit", (req, res) => {
  res.render("verification/submit", {
    title: "Submit Verification Documents",
    auctionId: req.query.auctionId || null,
  });
});
router.get("/status", (req, res) => {
  res.render("verification/status", {
    title: "My Verifications",
  });
});
router.get("/my-verifications", (req, res) => {
  res.render("verification/list", {
    title: "My Verifications",
  });
});
router.get("/ai-status", requireLogin, requireAdmin, (req, res) => {
  res.render("verification/ai-status", {
    title: "AI Verification Status",
    user: req.session.user,
    layout: false,
  });
});
router.post("/api/submit", uploadFields, submitVerification);
router.post(
  "/api/process/:verificationId",
  requireLogin,
  requireAdmin,
  processAIVerification,
);
router.get("/api/status/:verificationId", getVerificationStatus);
router.get("/api/farmer/:farmerId", getFarmerVerifications);
router.get("/api/auction/:auctionId", getVerificationByAuction);
router.get("/api/admin/all", requireLogin, requireAdmin, getAllVerifications);
router.get(
  "/api/admin/ai-submissions",
  requireLogin,
  requireAdmin,
  getAdminAIVerificationSubmissions,
);
router.get(
  "/api/admin/ai-submissions/:verificationId",
  requireLogin,
  requireAdmin,
  getAdminAIVerificationSubmission,
);
router.post(
  "/api/admin/ai-submissions/:verificationId/analyze",
  requireLogin,
  requireAdmin,
  analyzeVerificationForAdmin,
);
router.get("/api/my-verifications", getMyVerifications);
router.patch(
  "/api/admin/:verificationId/status",
  requireLogin,
  requireAdmin,
  updateVerificationStatus,
);
router.get("/api/current-user", getCurrentUser);
export default router;

