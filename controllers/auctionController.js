// controllers/auctionController.js
import Auction from "../models/Auction.js";
import { uploadFromBuffer } from "../utils/cloudinaryUpload.js";

export const createAuction = async (req, res) => {
  console.log("[Controller] createAuction called");
  console.log("[Controller] Request body keys:", Object.keys(req.body));
  console.log("[Controller] Files received:", req.files ? req.files.length : 0);

  try {
    if (!req.files || req.files.length < 2) {
      console.warn(
        "[Controller] Validation failed: fewer than 2 photos uploaded",
      );
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
    } = req.body;

    console.log(
      "[Controller] Starting Cloudinary upload for",
      req.files.length,
      "photos",
    );

    const uploadedImages = await Promise.all(
      req.files.map(async (file, index) => {
        console.log(
          `[Controller] Uploading photo ${index + 1}/${req.files.length} (${file.originalname})`,
        );
        try {
          const result = await uploadFromBuffer(file.buffer, "animal-auctions");
          console.log(
            `[Controller] Photo ${index + 1} uploaded successfully: ${result.secure_url}`,
          );
          return result;
        } catch (uploadErr) {
          console.error(
            `[Controller] Failed to upload photo ${index + 1}:`,
            uploadErr,
          );
          throw uploadErr;
        }
      }),
    );

    console.log("[Controller] All photos uploaded successfully");

    const photos = uploadedImages.map((img) => ({
      url: img.secure_url,
      publicId: img.public_id,
    }));

    const sellerId = req.user?._id || "64ab1234abcd5678ef901234";
    console.log("[Controller] Using seller ID:", sellerId);

    console.log("[Controller] Creating auction document in database");
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
      photos,
      seller: sellerId,
    });

    console.log("[Controller] Auction created successfully. ID:", auction._id);

    return res.render("auctions/create", {
      successMessage: "Auction created successfully",
      auctionId: auction._id.toString(),
    });
  } catch (err) {
    console.error("[Controller] Error in createAuction:", err);
    console.error("[Controller] Error stack:", err.stack);
    return res.status(500).render("auctions/create", {
      errorMessage: "Failed to create auction. Check server logs for details.",
    });
  }
};

// Enhanced getAllAuctions with debugging
export const getAllAuctions = async (req, res) => {
  console.log("=".repeat(60));
  console.log("[Controller] getAllAuctions CALLED");
  console.log("[Controller] Request URL:", req.originalUrl);
  console.log("[Controller] Request method:", req.method);
  console.log("[Controller] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[Controller] Session:", req.session);
  console.log("=".repeat(60));

  try {
    console.log("[Controller] Querying database for all auctions");

    const auctions = await Auction.find({})
      .populate("seller", "name email rating verified")
      .sort({ createdAt: -1 })
      .lean();

    console.log(
      `[Controller] ✅ Retrieved ${auctions.length} auctions from database`,
    );

    // Log first auction as sample
    if (auctions.length > 0) {
      console.log(
        "[Controller] Sample auction (first):",
        JSON.stringify(auctions[0], null, 2),
      );
    }

    const transformedAuctions = auctions.map((auction) => ({
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
      seller: {
        name: auction.seller?.name || "Anonymous Seller",
        verified: auction.seller?.verified || false,
        rating: auction.seller?.rating || 4.5,
      },
      createdAt: auction.createdAt,
    }));

    console.log(
      "[Controller] ✅ Transformed auctions:",
      transformedAuctions.length,
    );
    console.log(
      "[Controller] Sample transformed:",
      JSON.stringify(transformedAuctions[0], null, 2),
    );

    const response = {
      success: true,
      count: transformedAuctions.length,
      data: transformedAuctions,
    };

    console.log("[Controller] 📤 Sending response with status 200");
    console.log("[Controller] Response structure:", {
      success: response.success,
      count: response.count,
      dataLength: response.data.length,
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error("[Controller] ❌ ERROR in getAllAuctions:", err);
    console.error("[Controller] Error stack:", err.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch auctions",
      error: err.message,
    });
  }
};
export const getAuctionById = async (req, res) => {
  console.log("[Controller] getAuctionById called with ID:", req.params.id);

  try {
    console.log(
      "[Controller] Querying database for auction ID:",
      req.params.id,
    );
    const auction = await Auction.findById(req.params.id)
      .populate("seller", "name email rating verified")
      .lean();

    if (!auction) {
      console.warn("[Controller] Auction not found for ID:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    console.log("[Controller] Auction found, transforming data");

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
      seller: {
        name: auction.seller?.name || "Anonymous Seller",
        verified: auction.seller?.verified || false,
        rating: auction.seller?.rating || 4.5,
      },
      createdAt: auction.createdAt,
    };

    console.log("[Controller] Sending single auction response");

    return res.status(200).json({
      success: true,
      data: transformedAuction,
    });
  } catch (err) {
    console.error("[Controller] Error in getAuctionById:", err);
    console.error("[Controller] Error stack:", err.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch auction",
      error: err.message,
    });
  }
};

export const getFilteredAuctions = async (req, res) => {
  console.log("[Controller] getFilteredAuctions called");
  console.log("[Controller] Query parameters:", req.query);

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

    console.log("[Controller] Built filter:", JSON.stringify(filter));

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

    console.log(
      "[Controller] Executing query - skip:",
      skip,
      "limit:",
      limit,
      "sort:",
      sort,
    );

    const [auctions, totalCount] = await Promise.all([
      Auction.find(filter)
        .populate("seller", "name email rating verified")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Auction.countDocuments(filter),
    ]);

    console.log(
      `[Controller] Query returned ${auctions.length} auctions (total: ${totalCount})`,
    );

    const transformedAuctions = auctions.map((auction) => ({
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
      seller: {
        name: auction.seller?.name || "Anonymous Seller",
        verified: auction.seller?.verified || false,
        rating: auction.seller?.rating || 4.5,
      },
      createdAt: auction.createdAt,
    }));

    console.log(
      "[Controller] Sending filtered response with",
      transformedAuctions.length,
      "auctions",
    );

    return res.status(200).json({
      success: true,
      count: transformedAuctions.length,
      totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
      currentPage: Number(page),
      data: transformedAuctions,
    });
  } catch (err) {
    console.error("[Controller] Error in getFilteredAuctions:", err);
    console.error("[Controller] Error stack:", err.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch auctions",
      error: err.message,
    });
  }
};
