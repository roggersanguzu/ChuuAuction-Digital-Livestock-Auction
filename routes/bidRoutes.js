// bidRoutes.js - Routes for bid operations
import express from "express";
import {
  createBid,
  getBidsForListing,
  getBidsByUser,
  updateBidStatus,
  getBidsForSeller,
  getUserBidsWithAuctionDetails,
  markBidAsWinner,
  getBidsForAuction,
  getAllBidsAdmin,
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

// Get all bids made by a user with auction details (user's personal bids) - MUST come BEFORE /user/:userId
router.get(
  "/user/:userId/details",
  (req, res, next) => {
    console.log(
      "[BidRoute] GET /user/:userId/details - Fetching user bids with auction details:",
      req.params.userId,
    );
    console.log("[BidRoute] Session info:", {
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      sessionID: req.sessionID,
      cookies: req.headers.cookie ? "present" : "missing",
    });
    next();
  },
  getUserBidsWithAuctionDetails,
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

// ============================================
// NEW ADVANCED BID ROUTES
// ============================================

// Get all bids with auction details for a specific seller (auction initiator)
router.get(
  "/seller/:sellerId",
  (req, res, next) => {
    console.log(
      "[BidRoute] GET /seller/:sellerId - Fetching bids for seller:",
      req.params.sellerId,
    );
    next();
  },
  getBidsForSeller,
);

// Mark a bid as winner - only the auction seller can do this
router.post(
  "/:bidId/mark-winner",
  (req, res, next) => {
    console.log(
      "[BidRoute] POST /:bidId/mark-winner - Marking bid as winner:",
      req.params.bidId,
    );
    next();
  },
  markBidAsWinner,
);

// Get bids for a specific auction (with seller control check)
router.get(
  "/auction/:auctionId",
  (req, res, next) => {
    console.log(
      "[BidRoute] GET /auction/:auctionId - Fetching bids for auction:",
      req.params.auctionId,
    );
    next();
  },
  getBidsForAuction,
);

// Get ALL bids in the system (Admin only)
router.get(
  "/admin/all",
  (req, res, next) => {
    console.log("[BidRoute] GET /admin/all - Fetching all bids for admin");
    next();
  },
  getAllBidsAdmin,
);

export default router;
