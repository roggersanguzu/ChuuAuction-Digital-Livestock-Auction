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
router.use((req, res, next) => {
  next();
});
router.post(
  "/create",
  (req, res, next) => {
    next();
  },
  createBid,
);
router.get(
  "/listing/:listingId",
  (req, res, next) => {
next();
  },
  getBidsForListing,
);
router.get(
  "/user/:userId/details",
  (req, res, next) => {
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
router.get(
  "/user/:userId",
  (req, res, next) => {
next();
  },
  getBidsByUser,
);
router.patch(
  "/:bidId/status",
  (req, res, next) => {
next();
  },
  updateBidStatus,
);
router.get(
  "/seller/:sellerId",
  (req, res, next) => {
next();
  },
  getBidsForSeller,
);
router.post(
  "/:bidId/mark-winner",
  (req, res, next) => {
next();
  },
  markBidAsWinner,
);
router.get(
  "/auction/:auctionId",
  (req, res, next) => {
next();
  },
  getBidsForAuction,
);
router.get(
  "/admin/all",
  (req, res, next) => {
    next();
  },
  getAllBidsAdmin,
);
export default router;

