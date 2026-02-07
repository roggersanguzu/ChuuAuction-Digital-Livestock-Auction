// routes/auctionRoutes.js
import express from "express";
import upload from "../middleware/upload.js";
import { createAuction } from "../controllers/auctionController.js";

const router = express.Router();

// GET: Show received bids page → /auctions/bids
router.get("/bids", (req, res) => {
  res.render("auctions/bids", {
    title: "Received Bids",
  });
});

// GET: Show create auction form → /auctions/create
router.get("/create", (req, res) => {
  res.render("auctions/create", {
    title: "Create Auction",
    errorMessage: req.query.error || null, // optional: for error feedback
    successMessage: req.query.success || null, // optional: for success feedback
  });
});

// POST: Create new auction → /auctions (clean root)
router.post("/", upload.array("animalPhotos", 4), createAuction);

export default router;
