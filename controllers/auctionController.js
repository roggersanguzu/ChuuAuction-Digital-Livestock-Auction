import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import { uploadFromBuffer } from "../utils/cloudinaryUpload.js";
export const createAuction = async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
return res.status(400).render("auctions/create", {
        errorMessage: "Please upload at least 2 animal photos.",
      });
    }
    const {
      animalType,
      breed,
      ageYears,
      ageMonths,
      sex,
      weight,
      healthStatus,
      quantity,
      location,
      vaccinated,
      vaccinationLicense,
      description,
      startingPrice,
      reservePrice,
      endDate,
      endTime,
      timezone,
    } = req.body;
    let endAt = null;
    if (endDate && endTime) {
      const tzSuffix = String(timezone || "EAT").toUpperCase() === "UTC" ? "Z" : "+03:00";
      const parsed = new Date(`${endDate}T${endTime}:00${tzSuffix}`);
      if (!Number.isNaN(parsed.getTime())) {
        endAt = parsed;
      }
    }
const uploadedImages = await Promise.all(
      req.files.map(async (file, index) => {
try {
          const result = await uploadFromBuffer(file.buffer, "animal-auctions");
return result;
        } catch (uploadErr) {
throw uploadErr;
        }
      }),
    );
    const photos = uploadedImages.map((img) => ({
      url: img.secure_url,
      publicId: img.public_id,
    }));
    const sellerId = req.session?.user?.id || req.user?._id;
    if (!sellerId) {
      return res.status(401).render("auctions/create", {
        errorMessage: "Please log in again before creating an auction.",
      });
    }
    const auction = await Auction.create({
      animalType,
      breed,
      age: { years: Number(ageYears), months: Number(ageMonths) },
      sex,
      weight: Number(weight),
      healthStatus,
      quantity: Number(quantity),
      location,
      vaccinated: vaccinated === "on",
      vaccinationLicense: vaccinated === "on" ? vaccinationLicense : null,
      description,
      startingPrice: Number(startingPrice) || 0,
      reservePrice: Number(reservePrice) || 0,
      currentHighestBid: Number(startingPrice) || 0,
      photos,
      seller: sellerId,
      endAt,
      timezone: timezone || "EAT",
    });
    return res.render("auctions/create", {
      successMessage: "Auction created successfully",
      auctionId: auction._id.toString(),
    });
  } catch (err) {
    return res.status(500).render("auctions/create", {
      errorMessage: "Failed to create auction. Check server logs for details.",
    });
  }
};
export const getAllAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({})
      .populate("seller", "name email phone rating verified")
      .sort({ createdAt: -1 })
      .lean();
if (auctions.length > 0) {
}
    const bidAgg = await Bid.aggregate([
      {
        $match: {
          listingId: {
            $in: auctions.map((a) => a._id),
          },
        },
      },
      {
        $sort: {
          amount: -1,
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: "$listingId",
          highestBidAmount: { $first: "$amount" },
          highestBidderName: { $first: "$bidderName" },
          bidsCount: { $sum: 1 },
        },
      },
    ]);
    const bidMap = new Map(
      bidAgg.map((b) => [String(b._id), b]),
    );
    const transformedAuctions = auctions.map((auction) => {
      const bidStats = bidMap.get(String(auction._id));
      const highestBidAmount = Math.max(
        Number(auction.currentHighestBid || 0),
        Number(bidStats?.highestBidAmount || 0),
        Number(auction.startingPrice || 0),
      );
      return ({
      _id: auction._id.toString(),
      animalType: auction.animalType,
      breed: auction.breed || "Not specified",
      age: {
        years: auction.age?.years || 0,
        months: auction.age?.months || 0,
      },
      sex: auction.sex || "Not specified",
      weight: auction.weight || 0,
      healthStatus: auction.healthStatus || "Good",
      quantity: auction.quantity || 1,
      location: auction.location || "Not specified",
      vaccinated: auction.vaccinated || false,
      vaccinationLicense: auction.vaccinationLicense || "",
      description: auction.description || "No description provided",
      photos: auction.photos?.map((photo) => photo.url) || [],
      startingPrice: Number(auction.startingPrice) || 0,
      reservePrice: Number(auction.reservePrice) || 0,
      currentHighestBid: highestBidAmount,
      highestBidAmount,
      highestBidderName: bidStats?.highestBidderName || "",
      bidsCount: Number(bidStats?.bidsCount || 0),
      seller: {
        name: auction.seller?.name || "Unknown Seller",
        email: auction.seller?.email || "",
        phone: auction.seller?.phone || "",
        verified: auction.seller?.verified || false,
        rating: auction.seller?.rating || 0,
      },
      createdAt: auction.createdAt,
      endAt: auction.endAt || null,
      timezone: auction.timezone || "EAT",
    });
    });
console.log(
      "[Controller] Sample transformed:",
      JSON.stringify(transformedAuctions[0], null, 2),
    );
    const response = {
      success: true,
      count: transformedAuctions.length,
      data: transformedAuctions,
    };
return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch auctions",
      error: err.message,
    });
  }
};
export const getAuctionById = async (req, res) => {
  try {
const auction = await Auction.findById(req.params.id)
      .populate("seller", "name email phone rating verified")
      .lean();
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }
    const transformedAuction = {
      _id: auction._id.toString(),
      animalType: auction.animalType,
      breed: auction.breed || "Not specified",
      age: {
        years: auction.age?.years || 0,
        months: auction.age?.months || 0,
      },
      sex: auction.sex || "Not specified",
      weight: auction.weight || 0,
      healthStatus: auction.healthStatus || "Good",
      quantity: auction.quantity || 1,
      location: auction.location || "Not specified",
      vaccinated: auction.vaccinated || false,
      vaccinationLicense: auction.vaccinationLicense || "",
      description: auction.description || "No description provided",
      photos: auction.photos?.map((photo) => photo.url) || [],
      startingPrice: Number(auction.startingPrice) || 0,
      reservePrice: Number(auction.reservePrice) || 0,
      currentHighestBid: Number(auction.currentHighestBid || auction.startingPrice || 0),
      seller: {
        name: auction.seller?.name || "Unknown Seller",
        email: auction.seller?.email || "",
        phone: auction.seller?.phone || "",
        verified: auction.seller?.verified || false,
        rating: auction.seller?.rating || 0,
      },
      createdAt: auction.createdAt,
      endAt: auction.endAt || null,
      timezone: auction.timezone || "EAT",
    };
    return res.status(200).json({
      success: true,
      data: transformedAuction,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch auction",
      error: err.message,
    });
  }
};
export const getFilteredAuctions = async (req, res) => {
  try {
    const {
      animalType,
      healthStatus,
      sex,
      minWeight,
      maxWeight,
      minAge,
      maxAge,
      vaccinated,
      location,
      search,
      sortBy = "newest",
      page = 1,
      limit = 12,
    } = req.query;
    const filter = {};
    if (animalType) filter.animalType = animalType;
    if (healthStatus) filter.healthStatus = healthStatus;
    if (sex) filter.sex = sex;
    if (vaccinated !== undefined) filter.vaccinated = vaccinated === "true";
    if (location) filter.location = new RegExp(location, "i");
    if (minWeight || maxWeight) {
      filter.weight = {};
      if (minWeight) filter.weight.$gte = Number(minWeight);
      if (maxWeight) filter.weight.$lte = Number(maxWeight);
    }
    if (minAge || maxAge) {
      filter["age.years"] = {};
      if (minAge) filter["age.years"].$gte = Number(minAge);
      if (maxAge) filter["age.years"].$lte = Number(maxAge);
    }
    if (search) {
      filter.$or = [
        { breed: new RegExp(search, "i") },
        { location: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }
    let sort = { createdAt: -1 };
    switch (sortBy) {
      case "newest":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "weight-high":
        sort = { weight: -1 };
        break;
      case "weight-low":
        sort = { weight: 1 };
        break;
      case "quantity-high":
        sort = { quantity: -1 };
        break;
      case "quantity-low":
        sort = { quantity: 1 };
        break;
    }
    const skip = (Number(page) - 1) * Number(limit);
const [auctions, totalCount] = await Promise.all([
      Auction.find(filter)
        .populate("seller", "name email phone rating verified")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Auction.countDocuments(filter),
    ]);
const bidAgg = await Bid.aggregate([
      {
        $match: {
          listingId: {
            $in: auctions.map((a) => a._id),
          },
        },
      },
      {
        $sort: {
          amount: -1,
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: "$listingId",
          highestBidAmount: { $first: "$amount" },
          highestBidderName: { $first: "$bidderName" },
          bidsCount: { $sum: 1 },
        },
      },
    ]);
    const bidMap = new Map(
      bidAgg.map((b) => [String(b._id), b]),
    );
    const transformedAuctions = auctions.map((auction) => {
      const bidStats = bidMap.get(String(auction._id));
      const highestBidAmount = Math.max(
        Number(auction.currentHighestBid || 0),
        Number(bidStats?.highestBidAmount || 0),
        Number(auction.startingPrice || 0),
      );
      return ({
      _id: auction._id.toString(),
      animalType: auction.animalType,
      breed: auction.breed || "Not specified",
      age: {
        years: auction.age?.years || 0,
        months: auction.age?.months || 0,
      },
      sex: auction.sex || "Not specified",
      weight: auction.weight || 0,
      healthStatus: auction.healthStatus || "Good",
      quantity: auction.quantity || 1,
      location: auction.location || "Not specified",
      vaccinated: auction.vaccinated || false,
      vaccinationLicense: auction.vaccinationLicense || "",
      description: auction.description || "No description provided",
      photos: auction.photos?.map((photo) => photo.url) || [],
      startingPrice: Number(auction.startingPrice) || 0,
      reservePrice: Number(auction.reservePrice) || 0,
      currentHighestBid: highestBidAmount,
      highestBidAmount,
      highestBidderName: bidStats?.highestBidderName || "",
      bidsCount: Number(bidStats?.bidsCount || 0),
      seller: {
        name: auction.seller?.name || "Unknown Seller",
        email: auction.seller?.email || "",
        phone: auction.seller?.phone || "",
        verified: auction.seller?.verified || false,
        rating: auction.seller?.rating || 0,
      },
      createdAt: auction.createdAt,
      endAt: auction.endAt || null,
      timezone: auction.timezone || "EAT",
    });
    });
return res.status(200).json({
      success: true,
      count: transformedAuctions.length,
      totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
      currentPage: Number(page),
      data: transformedAuctions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch auctions",
      error: err.message,
    });
  }
};

