// routes/verificationRoutes.js
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

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs only
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

// File upload configuration for multiple document types
const uploadFields = upload.fields([
  { name: "ownershipDocuments", maxCount: 5 },
  { name: "healthDocuments", maxCount: 5 },
  { name: "animalPhotos", maxCount: 10 },
]);

// ============================================
// PAGE ROUTES (for rendering HTML views)
// ============================================

// GET: Show verification upload form
router.get("/submit", (req, res) => {
  res.render("verification/submit", {
    title: "Submit Verification Documents",
    auctionId: req.query.auctionId || null,
  });
});

// GET: Show verification status page
router.get("/status", (req, res) => {
  res.render("verification/status", {
    title: "My Verifications",
  });
});

// GET: Show farmer's verifications
router.get("/my-verifications", (req, res) => {
  res.render("verification/list", {
    title: "My Verifications",
  });
});

// GET: Admin AI verification status module
router.get("/ai-status", requireLogin, requireAdmin, (req, res) => {
  res.render("verification/ai-status", {
    title: "AI Verification Status",
    user: req.session.user,
    layout: false,
  });
});

// ============================================
// API ROUTES
// ============================================

// POST: Submit verification documents
router.post("/api/submit", uploadFields, submitVerification);

// POST: Process AI verification
router.post(
  "/api/process/:verificationId",
  requireLogin,
  requireAdmin,
  processAIVerification,
);

// GET: Get verification status
router.get("/api/status/:verificationId", getVerificationStatus);

// GET: Get farmer's verifications
router.get("/api/farmer/:farmerId", getFarmerVerifications);

// GET: Get verification by auction ID
router.get("/api/auction/:auctionId", getVerificationByAuction);

// ============================================
// NEW API ROUTES - For status.hbs page
// ============================================

// GET: Get all verifications (Admin only)
router.get("/api/admin/all", requireLogin, requireAdmin, getAllVerifications);

// GET: Admin AI submissions with advanced search/filter
router.get(
  "/api/admin/ai-submissions",
  requireLogin,
  requireAdmin,
  getAdminAIVerificationSubmissions,
);

// GET: Admin AI submission details
router.get(
  "/api/admin/ai-submissions/:verificationId",
  requireLogin,
  requireAdmin,
  getAdminAIVerificationSubmission,
);

// POST: Run AI analysis for one submission
router.post(
  "/api/admin/ai-submissions/:verificationId/analyze",
  requireLogin,
  requireAdmin,
  analyzeVerificationForAdmin,
);

// GET: Get current user's verifications (Farmer/Seller/Buyer)
router.get("/api/my-verifications", getMyVerifications);

// PATCH: Update verification status (Admin only)
router.patch(
  "/api/admin/:verificationId/status",
  requireLogin,
  requireAdmin,
  updateVerificationStatus,
);

// GET: Get current user info
router.get("/api/current-user", getCurrentUser);

export default router;
