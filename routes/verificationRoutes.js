// routes/verificationRoutes.js
import express from "express";
import multer from "multer";
import {
  submitVerification,
  processAIVerification,
  getVerificationStatus,
  getFarmerVerifications,
  getVerificationByAuction,
} from "../controllers/verificationController.js";

const router = express.Router();

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
router.get("/status/:verificationId", (req, res) => {
  res.render("verification/status", {
    title: "Verification Status",
    verificationId: req.params.verificationId,
  });
});

// GET: Show farmer's verifications
router.get("/my-verifications", (req, res) => {
  res.render("verification/list", {
    title: "My Verifications",
  });
});

// ============================================
// API ROUTES
// ============================================

// POST: Submit verification documents
router.post("/api/submit", uploadFields, submitVerification);

// POST: Process AI verification
router.post("/api/process/:verificationId", processAIVerification);

// GET: Get verification status
router.get("/api/status/:verificationId", getVerificationStatus);

// GET: Get farmer's verifications
router.get("/api/farmer/:farmerId", getFarmerVerifications);

// GET: Get verification by auction ID
router.get("/api/auction/:auctionId", getVerificationByAuction);

export default router;
