import express from "express";
import upload from "../middleware/upload.js";
import {
  createAuction,
  getAllAuctions,
  getAuctionById,
  getFilteredAuctions,
} from "../controllers/auctionController.js";

const router = express.Router();

// Log all incoming requests to auction routes
router.use((req, res, next) => {
  console.log(`[Route] ${req.method} ${req.originalUrl}`);
  console.log(`[Route] Session user:`, req.session?.user || "MISSING");
  next();
});

// ============================================
// API ROUTES - MUST COME FIRST (before page routes)
// ============================================
router.get(
  "/api/all",
  (req, res, next) => {
    console.log("[Route] API /api/all hit - calling getAllAuctions");
    next();
  },
  getAllAuctions,
);

router.get(
  "/api/filter",
  (req, res, next) => {
    console.log("[Route] API /api/filter hit - calling getFilteredAuctions");
    next();
  },
  getFilteredAuctions,
);

router.get(
  "/api/:id",
  (req, res, next) => {
    console.log(
      "[Route] API /api/:id hit - calling getAuctionById with ID:",
      req.params.id,
    );
    next();
  },
  getAuctionById,
);

// ============================================
// PAGE ROUTES - COME AFTER API ROUTES
// ============================================
router.get("/bids", (req, res) => {
  console.log("[Route] Rendering bids page");
  res.render("auctions/bids", { title: "Received Bids" });
});

router.get("/animalList", (req, res) => {
  console.log("[Route] Rendering animalList page");
  res.render("auctions/animalList", { title: "Animal List" });
});

router.get("/create", (req, res) => {
  console.log("[Route] Rendering create auction form");
  res.render("auctions/create", {
    title: "Create Auction",
    errorMessage: req.query.error || null,
    successMessage: req.query.success || null,
  });
});

// ============================================
// POST ROUTES
// ============================================
router.post("/", upload.array("animalPhotos", 4), createAuction);

export default router;
