// controllers/verificationController.js
import mongoose from "mongoose";
import Verification from "../models/Verification.js";
import Auction from "../models/Auction.js";
import { uploadFromBuffer } from "../utils/cloudinaryUpload.js";
import { comprehensiveVerification } from "../services/geminiService.js";

/**
 * Submit verification documents
 * → auctionId and authentication are OPTIONAL
 * → Anyone can submit (guest/anonymous allowed)
 */
export const submitVerification = async (req, res) => {
  try {
    const {
      auctionId, // optional
      verificationType,
      ownershipDetails,
      healthNotes,
      veterinarianName,
      veterinarianContact,
      lastVaccinationDate,
      acquisitionDate,
      previousOwner,
    } = req.body;

    // Required field validation
    if (
      !verificationType ||
      !["ownership", "health", "both"].includes(verificationType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid verificationType is required (ownership, health, or both)",
      });
    }

    // Farmer is optional (null for guests)
    // Use req.session.user.id from session (not req.user)
    const farmerId = req.session?.user?.id || null;

    // Optional auction handling
    let auction = null;
    if (auctionId) {
      if (!mongoose.Types.ObjectId.isValid(auctionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Auction ID format",
        });
      }

      auction = await Auction.findById(auctionId);
      if (!auction) {
        return res.status(404).json({
          success: false,
          message: "Auction not found",
        });
      }
    }

    // Process uploaded files
    const ownershipDocs = [];
    const healthDocs = [];
    const animalPhotos = [];

    const maxFiles = { ownership: 5, health: 5, photos: 10 };

    // Ownership documents
    if (req.files?.ownershipDocuments) {
      if (req.files.ownershipDocuments.length > maxFiles.ownership) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxFiles.ownership} ownership documents allowed`,
        });
      }
      for (const file of req.files.ownershipDocuments) {
        const uploaded = await uploadFromBuffer(
          file.buffer,
          "verification/ownership",
        );
        ownershipDocs.push({
          type: "other", // can be improved later with frontend type selection
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          fileName: file.originalname,
        });
      }
    }

    // Health documents
    if (req.files?.healthDocuments) {
      if (req.files.healthDocuments.length > maxFiles.health) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxFiles.health} health documents allowed`,
        });
      }
      for (const file of req.files.healthDocuments) {
        const uploaded = await uploadFromBuffer(
          file.buffer,
          "verification/health",
        );
        healthDocs.push({
          type: "other",
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          fileName: file.originalname,
        });
      }
    }

    // Animal photos
    if (req.files?.animalPhotos) {
      if (req.files.animalPhotos.length > maxFiles.photos) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxFiles.photos} photos allowed`,
        });
      }
      for (const file of req.files.animalPhotos) {
        const uploaded = await uploadFromBuffer(
          file.buffer,
          "verification/animals",
        );
        animalPhotos.push({
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          description: "Verification photo",
        });
      }
    }

    // Create verification record
    const verificationData = {
      ...(farmerId && { farmer: farmerId }), // only set if user is logged in
      verificationType,
      ownershipDocuments: ownershipDocs,
      healthDocuments: healthDocs,
      animalPhotos,
      additionalDetails: {
        ownershipDetails: ownershipDetails?.trim() || undefined,
        healthNotes: healthNotes?.trim() || undefined,
        veterinarianName: veterinarianName?.trim() || undefined,
        veterinarianContact: veterinarianContact?.trim() || undefined,
        lastVaccinationDate: lastVaccinationDate
          ? new Date(lastVaccinationDate)
          : undefined,
        acquisitionDate: acquisitionDate
          ? new Date(acquisitionDate)
          : undefined,
        previousOwner: previousOwner?.trim() || undefined,
      },
      status: "pending",
    };

    if (auction) {
      verificationData.auction = auction._id;
    }

    const verification = await Verification.create(verificationData);

    return res.status(201).json({
      success: true,
      message: "Verification documents submitted successfully",
      verificationId: verification._id,
      data: verification,
    });
  } catch (error) {
    console.error("Submit verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit verification",
      error: error.message,
    });
  }
};

/**
 * Process AI verification
 * → Safely handles missing auction and farmer
 */
export const processAIVerification = async (req, res) => {
  try {
    const { verificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(verificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Verification ID format",
      });
    }

    const verification =
      await Verification.findById(verificationId).populate("auction");
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    verification.status = "processing";
    await verification.save();

    // Prepare data – handle missing auction
    const verificationData = {
      animalDetails: verification.auction
        ? {
            animalType: verification.auction.animalType || "Unknown",
            breed: verification.auction.breed || "Unknown",
            age: verification.auction.age
              ? `${verification.auction.age.years || 0} years`
              : "Unknown",
            weight: verification.auction.weight || "Unknown",
            sex: verification.auction.sex || "Unknown",
            healthStatus: verification.auction.healthStatus || "Unknown",
            ownerName: verification.farmer
              ? "Registered Farmer"
              : "Guest Submitter",
          }
        : {
            animalType: "Unknown",
            breed: "Unknown",
            age: "Unknown",
            weight: "Unknown",
            sex: "Unknown",
            healthStatus: "Unknown",
            ownerName: verification.farmer
              ? "Registered Farmer"
              : "Guest Submitter",
          },
      ownershipDocuments: [],
      healthDocuments: [],
      animalPhotos: [],
    };

    // Populate document placeholders
    if (verification.ownershipDocuments?.length) {
      verificationData.ownershipDocuments = verification.ownershipDocuments.map(
        (doc) => ({
          type: doc.type,
          base64Data: "placeholder",
          mimeType: "image/jpeg",
        }),
      );
    }

    if (verification.healthDocuments?.length) {
      verificationData.healthDocuments = verification.healthDocuments.map(
        (doc) => ({
          type: doc.type,
          base64Data: "placeholder",
          mimeType: "image/jpeg",
        }),
      );
    }

    if (verification.animalPhotos?.length) {
      verificationData.animalPhotos = verification.animalPhotos.map(
        (photo) => ({
          base64Data: "placeholder",
          mimeType: "image/jpeg",
        }),
      );
    }

    // Run AI verification
    const aiResults = await comprehensiveVerification(verificationData);

    // Update results
    verification.aiVerification = {
      ownershipVerified: aiResults.ownership?.verified || false,
      ownershipConfidence: aiResults.ownership?.confidence || 0,
      ownershipAnalysis: aiResults.ownership?.analysis || "",
      ownershipFlags: aiResults.ownership?.flags || [],

      healthVerified: aiResults.health?.verified || false,
      healthConfidence: aiResults.health?.confidence || 0,
      healthAnalysis: aiResults.health?.analysis || "",
      healthAssessment: aiResults.health?.healthAssessment || "needs_review",
      healthFlags: aiResults.health?.flags || [],

      photoVerified: aiResults.photos?.verified || false,
      photoAnalysis: aiResults.photos?.analysis || "",
      detectedBreed: aiResults.photos?.detectedBreed || "",
      breedMatches: aiResults.photos?.breedMatches || false,
      photoQuality: aiResults.photos?.photoQuality?.overall || "medium",
      photoFlags: aiResults.photos?.flags || [],

      verificationDate: new Date(),
      aiModel: "gemini-1.5-flash",
      processingTime: aiResults.overall?.processingTime || 0,
    };

    verification.calculateVerificationScore();

    verification.status = aiResults.overall?.status || "needs_review";
    verification.overallApproved = aiResults.overall?.approved || false;

    verification.expiresAt = new Date(
      Date.now() + 6 * 30 * 24 * 60 * 60 * 1000,
    );

    if (
      verification.status === "needs_review" ||
      verification.verificationScore < 75
    ) {
      verification.manualReview.required = true;
    }

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "AI verification completed",
      data: verification,
    });
  } catch (error) {
    console.error("AI verification error:", error);

    if (
      req.params.verificationId &&
      mongoose.Types.ObjectId.isValid(req.params.verificationId)
    ) {
      await Verification.findByIdAndUpdate(
        req.params.verificationId,
        {
          status: "needs_review",
          notes: `AI verification failed: ${error.message}`,
        },
        { runValidators: true },
      );
    }

    return res.status(500).json({
      success: false,
      message: "AI verification failed",
      error: error.message,
    });
  }
};

/**
 * Get verification status
 */
export const getVerificationStatus = async (req, res) => {
  try {
    const { verificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(verificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Verification ID format",
      });
    }

    const verification = await Verification.findById(verificationId)
      .populate("auction", "breed animalType location")
      .populate("farmer", "name email");

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: verification,
    });
  } catch (error) {
    console.error("Get verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get verification status",
      error: error.message,
    });
  }
};

/**
 * Get all verifications for a farmer
 * → Still requires farmerId (can be from user or param)
 */
export const getFarmerVerifications = async (req, res) => {
  try {
    const farmerId = req.user?._id || req.params.farmerId;

    if (!farmerId || !mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Farmer ID is required for this endpoint",
      });
    }

    const verifications = await Verification.find({ farmer: farmerId })
      .populate("auction", "breed animalType location photos")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: verifications.length,
      data: verifications,
    });
  } catch (error) {
    console.error("Get farmer verifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get verifications",
      error: error.message,
    });
  }
};

/**
 * Get verification by auction ID
 */
export const getVerificationByAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    if (!auctionId || !mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Auction ID is required for this endpoint",
      });
    }

    const verification = await Verification.findOne({ auction: auctionId })
      .populate("farmer", "name email")
      .sort({ createdAt: -1 });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "No verification found for this auction",
      });
    }

    return res.status(200).json({
      success: true,
      data: verification,
    });
  } catch (error) {
    console.error("Get verification by auction error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get verification",
      error: error.message,
    });
  }
};

/**
 * Get ALL verifications (Admin only)
 */
export const getAllVerifications = async (req, res) => {
  console.log("[Controller] getAllVerifications called");
  console.log("[Controller] User session:", req.session?.user);

  try {
    const verifications = await Verification.find()
      .populate("auction", "breed animalType location photos")
      .populate("farmer", "name email phone")
      .sort({ createdAt: -1 });

    console.log("[Controller] Found", verifications.length, "verifications");

    // Build stats
    const stats = {
      total: verifications.length,
      pending: verifications.filter((v) => v.status === "pending").length,
      processing: verifications.filter((v) => v.status === "processing").length,
      verified: verifications.filter((v) => v.status === "verified").length,
      rejected: verifications.filter((v) => v.status === "rejected").length,
      needs_review: verifications.filter((v) => v.status === "needs_review")
        .length,
      incomplete: verifications.filter((v) => v.status === "incomplete").length,
    };

    return res.status(200).json({
      success: true,
      data: verifications,
      stats: stats,
    });
  } catch (error) {
    console.error("Get all verifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get verifications",
      error: error.message,
    });
  }
};

/**
 * Get current user's verifications (Farmer/Seller/Buyer)
 */
export const getMyVerifications = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const verifications = await Verification.find({ farmer: userId })
      .populate("auction", "breed animalType location photos")
      .populate("farmer", "name email phone")
      .sort({ createdAt: -1 });

    // Build stats
    const stats = {
      total: verifications.length,
      pending: verifications.filter((v) => v.status === "pending").length,
      processing: verifications.filter((v) => v.status === "processing").length,
      verified: verifications.filter((v) => v.status === "verified").length,
      rejected: verifications.filter((v) => v.status === "rejected").length,
      needs_review: verifications.filter((v) => v.status === "needs_review")
        .length,
      incomplete: verifications.filter((v) => v.status === "incomplete").length,
    };

    return res.status(200).json({
      success: true,
      data: verifications,
      stats: stats,
    });
  } catch (error) {
    console.error("Get my verifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get verifications",
      error: error.message,
    });
  }
};

/**
 * Update verification status (Admin only)
 */
export const updateVerificationStatus = async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(verificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Verification ID format",
      });
    }

    const validStatuses = [
      "pending",
      "processing",
      "verified",
      "rejected",
      "needs_review",
      "incomplete",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const verification = await Verification.findById(verificationId);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    verification.status = status;
    if (notes) {
      verification.notes = notes;
    }

    // Update manual review if needed
    if (status === "verified" || status === "rejected") {
      verification.manualReview.completed = true;
      verification.manualReview.reviewDate = new Date();
      verification.manualReview.approved = status === "verified";
    }

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: verification,
    });
  } catch (error) {
    console.error("Update verification status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

/**
 * Get current user info for frontend
 */
export const getCurrentUser = async (req, res) => {
  console.log("[Controller] getCurrentUser called");
  console.log("[Controller] Session:", req.session);
  console.log("[Controller] Session user:", req.session?.user);

  try {
    const user = req.session?.user;

    if (!user) {
      console.log("[Controller] No user in session, returning null");
      return res.status(200).json({
        success: true,
        user: null,
      });
    }

    console.log("[Controller] Returning user:", user.name, user.role);
    return res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("[Controller] Get current user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get user info",
      error: error.message,
    });
  }
};

export default {
  submitVerification,
  processAIVerification,
  getVerificationStatus,
  getFarmerVerifications,
  getVerificationByAuction,
  getAllVerifications,
  getMyVerifications,
  updateVerificationStatus,
  getCurrentUser,
};
