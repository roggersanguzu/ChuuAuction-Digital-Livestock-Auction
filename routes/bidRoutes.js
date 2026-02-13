// bidRoutes.js - Routes for bid operations
import express from "express";
import {
  createBid,
  getBidsForListing,
  getBidsByUser,
  updateBidStatus,
} from "../controllers/bidController.js";

const router = express.Router();

// Log all incoming requests to bid routes
router.use((req, res, next) => {
  console.log(`[BidRoute] ${req.method} ${req.originalUrl}`);
  console.log(`[BidRoute] Session user:`, req.session?.user || "MISSING");
  next();
});

// ============================================
// BID API ROUTES
// ============================================

// Create a new bid
router.post(
  "/create",
  (req, res, next) => {
    console.log("[BidRoute] POST /create - Creating new bid");
    next();
  },
  createBid,
);

// Get all bids for a specific listing
router.get(
  "/listing/:listingId",
  (req, res, next) => {
    console.log(
      "[BidRoute] GET /listing/:listingId - Fetching bids for listing:",
      req.params.listingId,
    );
    next();
  },
  getBidsForListing,
);

// Get all bids made by a specific user
router.get(
  "/user/:userId",
  (req, res, next) => {
    console.log(
      "[BidRoute] GET /user/:userId - Fetching bids for user:",
      req.params.userId,
    );
    next();
  },
  getBidsByUser,
);

// Update bid status (accept/reject)
router.patch(
  "/:bidId/status",
  (req, res, next) => {
    console.log(
      "[BidRoute] PATCH /:bidId/status - Updating bid status:",
      req.params.bidId,
    );
    next();
  },
  updateBidStatus,
);

export default router;
