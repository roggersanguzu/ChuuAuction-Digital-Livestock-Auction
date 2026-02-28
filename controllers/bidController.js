// bidController.js - Controller for handling bid operations
import Bid from "../models/Bid.js";
import Auction from "../models/Auction.js";
import mongoose from "mongoose";

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

    // Create new bid - ensure bidderId is stored as ObjectId
    const newBid = new Bid({
      listingId,
      bidderId: new mongoose.Types.ObjectId(bidderId),
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

    console.log(
      "[BidController] getBidsByUser - Looking for bidderId:",
      userId,
    );

    // Query for both ObjectId AND string bidderId (to handle old bids stored as strings)
    const bids = await Bid.find({
      $or: [
        { bidderId: userId }, // Match string bidderId (old format)
        { bidderId: new mongoose.Types.ObjectId(userId) }, // Match ObjectId (new format)
      ],
    })
      .populate("listingId")
      .sort({ createdAt: -1 });

    console.log("[BidController] Found bids:", bids.length);

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

// Get all bids with auction details for a specific seller (auction initiator)
export const getBidsForSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;

    console.log("[BidController] Fetching bids for seller:", sellerId);

    // First, get all auctions by this seller
    const auctions = await Auction.find({ seller: sellerId });
    const auctionIds = auctions.map((a) => a._id);

    console.log("[BidController] Found auctions:", auctionIds.length);

    if (auctionIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        groupedByAuction: {},
      });
    }

    // Get all bids for these auctions
    const bids = await Bid.find({ listingId: { $in: auctionIds } })
      .populate({
        path: "listingId",
        select:
          "animalType breed age sex weight healthStatus quantity location photos description seller createdAt",
      })
      .sort({ createdAt: -1 });

    console.log("[BidController] Found bids:", bids.length);

    // Transform data to include auction details and seller check
    const transformedBids = bids.map((bid) => {
      const auction = bid.listingId;
      const isSeller =
        auction &&
        auction.seller &&
        new mongoose.Types.ObjectId(auction.seller).toString() ===
          new mongoose.Types.ObjectId(sellerId).toString();

      return {
        _id: bid._id,
        listingId: bid.listingId?._id,
        bidderId: bid.bidderId,
        bidderName: bid.bidderName,
        bidderPhone: bid.bidderPhone,
        amount: bid.amount,
        notes: bid.notes,
        status: bid.status,
        createdAt: bid.createdAt,
        updatedAt: bid.updatedAt,
        // Auction details
        auction: auction
          ? {
              animalType: auction.animalType,
              breed: auction.breed,
              age: auction.age,
              sex: auction.sex,
              weight: auction.weight,
              healthStatus: auction.healthStatus,
              quantity: auction.quantity,
              location: auction.location,
              description: auction.description,
              photos: auction.photos,
              createdAt: auction.createdAt,
              seller: auction.seller,
            }
          : null,
        // Whether current user is the auction seller
        canControl: isSeller,
      };
    });

    // Group bids by auction
    const groupedBids = transformedBids.reduce((acc, bid) => {
      const auctionId = bid.listingId?.toString() || "unknown";
      if (!acc[auctionId]) {
        acc[auctionId] = {
          auction: bid.auction,
          bids: [],
          canControl: bid.canControl,
        };
      }
      acc[auctionId].bids.push(bid);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      count: bids.length,
      groupedByAuction: groupedBids,
      data: transformedBids,
    });
  } catch (error) {
    console.error("[BidController] ❌ Error fetching seller bids:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch seller bids",
      error: error.message,
    });
  }
};

// Get all bids made by a user with auction details
export const getUserBidsWithAuctionDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(
      "[BidController] getUserBidsWithAuctionDetails - Looking for bidderId:",
      userId,
    );

    // First, let's check what bids exist in the database
    const allBids = await Bid.find({});
    console.log("[BidController] Total bids in database:", allBids.length);
    console.log(
      "[BidController] Sample bid bidderIds:",
      allBids.slice(0, 3).map((b) => ({
        _id: b._id,
        bidderId: b.bidderId,
        bidderIdType: typeof b.bidderId,
        bidderIdIsObjectId: b.bidderId instanceof mongoose.Types.ObjectId,
      })),
    );

    // Query for both ObjectId AND string bidderId (to handle old bids stored as strings)
    const bids = await Bid.find({
      $or: [
        { bidderId: userId }, // Match string bidderId (old format)
        { bidderId: new mongoose.Types.ObjectId(userId) }, // Match ObjectId (new format)
      ],
    })
      .populate({
        path: "listingId",
        select:
          "animalType breed age sex weight healthStatus quantity location photos description seller createdAt",
      })
      .sort({ createdAt: -1 });

    console.log("[BidController] Found user bids:", bids.length);

    const transformedBids = bids.map((bid) => {
      const auction = bid.listingId;
      return {
        _id: bid._id,
        listingId: bid.listingId?._id,
        bidderId: bid.bidderId,
        bidderName: bid.bidderName,
        bidderPhone: bid.bidderPhone,
        amount: bid.amount,
        notes: bid.notes,
        status: bid.status,
        createdAt: bid.createdAt,
        updatedAt: bid.updatedAt,
        // Auction details
        auction: auction
          ? {
              animalType: auction.animalType,
              breed: auction.breed,
              age: auction.age,
              sex: auction.sex,
              weight: auction.weight,
              healthStatus: auction.healthStatus,
              quantity: auction.quantity,
              location: auction.location,
              description: auction.description,
              photos: auction.photos,
              createdAt: auction.createdAt,
              seller: auction.seller,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      count: bids.length,
      data: transformedBids,
    });
  } catch (error) {
    console.error(
      "[BidController] ❌ Error fetching user bids with details:",
      error,
    );
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user bids",
      error: error.message,
    });
  }
};

// Mark a bid as winner - only the auction seller can do this
export const markBidAsWinner = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { sellerId } = req.body; // The seller's ID from the session

    console.log(
      "[BidController] Marking bid as winner:",
      bidId,
      "by seller:",
      sellerId,
    );

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required",
      });
    }

    // Find the bid first
    const bid = await Bid.findById(bidId).populate({
      path: "listingId",
      select: "seller",
    });

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found",
      });
    }

    // Check if the user is the auction seller
    if (!bid.listingId || !bid.listingId.seller) {
      return res.status(400).json({
        success: false,
        message: "Auction not found or has no seller",
      });
    }

    const auctionSellerId = bid.listingId.seller.toString();
    const requestSellerId = new mongoose.Types.ObjectId(sellerId).toString();

    if (auctionSellerId !== requestSellerId) {
      console.log(
        "[BidController] ❌ Unauthorized - Auction seller:",
        auctionSellerId,
        "Request from:",
        requestSellerId,
      );
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to mark winner for this auction. Only the auction creator can do this.",
      });
    }

    // First, reject all other bids for this auction
    await Bid.updateMany(
      {
        listingId: bid.listingId._id,
        _id: { $ne: bidId },
      },
      { status: "rejected" },
    );

    // Then mark this bid as accepted (winner)
    const winningBid = await Bid.findByIdAndUpdate(
      bidId,
      { status: "accepted" },
      { new: true },
    );

    console.log("[BidController] ✅ Bid marked as winner:", winningBid._id);

    return res.status(200).json({
      success: true,
      message: "Bid marked as winner successfully",
      data: winningBid,
    });
  } catch (error) {
    console.error("[BidController] ❌ Error marking bid as winner:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark bid as winner",
      error: error.message,
    });
  }
};

// Get bids for a specific auction (public for all, control for seller)
export const getBidsForAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { sellerId } = req.query; // Optional - if provided, seller gets control

    console.log(
      "[BidController] Fetching bids for auction:",
      auctionId,
      "sellerId:",
      sellerId,
    );

    const bids = await Bid.find({ listingId: auctionId })
      .populate({
        path: "bidderId",
        select: "name email phone",
      })
      .sort({ amount: -1 }); // Sort by highest bid first

    // Check if the requester is the seller
    let canControl = false;
    if (sellerId) {
      const auction = await Auction.findById(auctionId);
      if (auction && auction.seller) {
        canControl =
          auction.seller.toString() ===
          new mongoose.Types.ObjectId(sellerId).toString();
      }
    }

    const transformedBids = bids.map((bid) => ({
      _id: bid._id,
      listingId: bid.listingId,
      bidderId: bid.bidderId,
      bidderName: bid.bidderName,
      bidderPhone: bid.bidderPhone,
      amount: bid.amount,
      notes: bid.notes,
      status: bid.status,
      createdAt: bid.createdAt,
      updatedAt: bid.updatedAt,
      canControl: canControl && bid.status === "pending",
    }));

    return res.status(200).json({
      success: true,
      count: bids.length,
      canControl: canControl,
      data: transformedBids,
    });
  } catch (error) {
    console.error("[BidController] ❌ Error fetching auction bids:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch auction bids",
      error: error.message,
    });
  }
};

// Get ALL bids in the system (Admin only)
export const getAllBidsAdmin = async (req, res) => {
  try {
    console.log("[BidController] Fetching all bids for admin");

    const bids = await Bid.find()
      .populate({
        path: "listingId",
        select:
          "animalType breed age sex weight healthStatus quantity location photos description seller createdAt",
      })
      .sort({ createdAt: -1 });

    console.log("[BidController] Found all bids:", bids.length);

    // Transform data
    const transformedBids = bids.map((bid) => {
      const auction = bid.listingId;
      return {
        _id: bid._id,
        listingId: bid.listingId?._id,
        bidderId: bid.bidderId,
        bidderName: bid.bidderName,
        bidderPhone: bid.bidderPhone,
        amount: bid.amount,
        notes: bid.notes,
        status: bid.status,
        createdAt: bid.createdAt,
        updatedAt: bid.updatedAt,
        auction: auction
          ? {
              animalType: auction.animalType,
              breed: auction.breed,
              age: auction.age,
              sex: auction.sex,
              weight: auction.weight,
              healthStatus: auction.healthStatus,
              quantity: auction.quantity,
              location: auction.location,
              description: auction.description,
              photos: auction.photos,
              createdAt: auction.createdAt,
              seller: auction.seller,
            }
          : null,
      };
    });

    // Group by auction
    const groupedBids = transformedBids.reduce((acc, bid) => {
      const auctionId = bid.listingId?.toString() || "unknown";
      if (!acc[auctionId]) {
        acc[auctionId] = {
          auction: bid.auction,
          bids: [],
        };
      }
      acc[auctionId].bids.push(bid);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      count: bids.length,
      groupedByAuction: groupedBids,
      data: transformedBids,
    });
  } catch (error) {
    console.error("[BidController] ❌ Error fetching all bids:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all bids",
      error: error.message,
    });
  }
};

export default {
  createBid,
  getBidsForListing,
  getBidsByUser,
  updateBidStatus,
  getBidsForSeller,
  getUserBidsWithAuctionDetails,
  markBidAsWinner,
  getBidsForAuction,
  getAllBidsAdmin,
};
