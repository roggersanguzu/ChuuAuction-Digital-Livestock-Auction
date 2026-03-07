import express from "express";
import upload from "../middleware/upload.js";
import {
  createAuction,
  getAllAuctions,
  getAuctionById,
  getFilteredAuctions,
} from "../controllers/auctionController.js";
const router = express.Router();
router.use((req, res, next) => {
  next();
});
router.get(
  "/api/all",
  (req, res, next) => {
    next();
  },
  getAllAuctions,
);
router.get(
  "/api/filter",
  (req, res, next) => {
    next();
  },
  getFilteredAuctions,
);
router.get(
  "/api/:id",
  (req, res, next) => {
next();
  },
  getAuctionById,
);
router.get("/bids", (req, res) => {
  res.render("auctions/bids", { title: "Received Bids" });
});
router.get("/animalList", (req, res) => {
  res.render("auctions/animalList", { title: "Animal List" });
});
router.get("/create", (req, res) => {
  res.render("auctions/create", {
    title: "Create Auction",
    errorMessage: req.query.error || null,
    successMessage: req.query.success || null,
  });
});
router.post("/", upload.array("animalPhotos", 4), createAuction);
export default router;

