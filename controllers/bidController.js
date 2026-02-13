// bidController.js - Controller for handling bid operations
import Bid from "../models/Bid.js";
import Auction from "../models/Auction.js";

// Create a new bid
export const createBid = async (req, res) => {
  try {
    console.log("[BidController] Creating new bid");
    console.log("[BidController] Request body:", req.body);

    const { listingId, bidderId, bidderName, bidderPhone, amount, notes } =
      req.body;

    // Validation
    if (!listingId || !bidderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: listingId, bidderId, or amount",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Bid amount must be greater than 0",
      });
    }

    // Check if listing exists
    const listing = await Auction.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Create new bid
    const newBid = new Bid({
      listingId,
      bidderId,
      bidderName,
      bidderPhone,
      amount,
      notes: notes || "",
      status: "pending",
      createdAt: new Date(),
    });

    await newBid.save();

    console.log("[BidController] ✅ Bid created successfully:", newBid._id);

    return res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      data: newBid,
    });
  } catch (error) {
    console.error("[BidController] ❌ Error creating bid:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create bid",
      error: error.message,
    });
  }
};

// Get all bids for a listing
export const getBidsForListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    const bids = await Bid.find({ listingId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bids.length,
      data: bids,
    });
  } catch (error) {
    console.error("[BidController] ❌ Error fetching bids:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bids",
      error: error.message,
    });
  }
};

// Get all bids made by a user
export const getBidsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const bids = await Bid.find({ bidderId: userId })
      .populate("listingId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bids.length,
      data: bids,
    });
  } catch (error) {
    console.error("[BidController] ❌ Error fetching user bids:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user bids",
      error: error.message,
    });
  }
};

// Update bid status (accept/reject)
export const updateBidStatus = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'accepted', 'rejected', or 'pending'",
      });
    }

    const bid = await Bid.findByIdAndUpdate(bidId, { status }, { new: true });

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Bid ${status} successfully`,
      data: bid,
    });
  } catch (error) {
    console.error("[BidController] ❌ Error updating bid status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update bid status",
      error: error.message,
    });
  }
};

export default {
  createBid,
  getBidsForListing,
  getBidsByUser,
  updateBidStatus,
};
