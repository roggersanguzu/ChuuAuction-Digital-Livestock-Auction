import mongoose from "mongoose";
import Verification from "../models/Verification.js";
import Auction from "../models/Auction.js";
import { uploadFromBuffer } from "../utils/cloudinaryUpload.js";
import { comprehensiveVerification } from "../services/geminiService.js";
const ACTIVE_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ADMIN_ROLES = new Set(["admin", "administrator"]);
const ALLOWED_VERIFICATION_STATUSES = new Set([
  "pending",
  "processing",
  "verified",
  "rejected",
  "needs_review",
  "incomplete",
]);
const ALLOWED_VERIFICATION_TYPES = new Set(["ownership", "health", "both"]);
function getSessionRole(req) {
  return String(req.session?.user?.role || "")
    .trim()
    .toLowerCase();
}
function isAdminRequest(req) {
  return ADMIN_ROLES.has(getSessionRole(req));
}
function parsePositiveInt(value, fallback, { min = 1, max = 200 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
function normalizeMimeType(mimeType, url) {
  if (mimeType && typeof mimeType === "string") return mimeType;
  const lowercaseUrl = String(url || "").toLowerCase();
  if (lowercaseUrl.endsWith(".pdf")) return "application/pdf";
  if (lowercaseUrl.endsWith(".png")) return "image/png";
  if (lowercaseUrl.endsWith(".webp")) return "image/webp";
  if (lowercaseUrl.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}
async function urlToInlinePart(url, fallbackMimeType) {
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Unable to fetch document (${response.status})`);
    }
    const contentType = response.headers.get("content-type");
    const mimeType = normalizeMimeType(contentType || fallbackMimeType, url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength > 8 * 1024 * 1024) {
      throw new Error("File too large for AI inline analysis");
    }
    return {
      base64Data: buffer.toString("base64"),
      mimeType,
    };
  } finally {
    clearTimeout(timeout);
  }
}
async function buildAIInputFromVerification(verification) {
  const ownerName =
    verification.farmer?.name ||
    verification.additionalDetails?.previousOwner ||
    "Unknown Owner";
  const auction = verification.auction;
  const animalDetails = auction
    ? {
        animalType: auction.animalType || "Unknown",
        breed: auction.breed || "Unknown",
        age: auction.age
          ? `${auction.age.years || 0} years ${auction.age.months || 0} months`
          : "Unknown",
        weight: auction.weight || "Unknown",
        sex: auction.sex || "Unknown",
        healthStatus: auction.healthStatus || "Unknown",
        ownerName,
      }
    : {
        animalType: "Unknown",
        breed: "Unknown",
        age: "Unknown",
        weight: "Unknown",
        sex: "Unknown",
        healthStatus: "Unknown",
        ownerName,
      };
  const ownershipDocuments = (
    await Promise.allSettled(
      (verification.ownershipDocuments || []).map(async (doc) => {
        const content = await urlToInlinePart(doc.url);
        if (!content) return null;
        return {
          type: doc.type || "other",
          ...content,
        };
      }),
    )
  )
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);
  const healthDocuments = (
    await Promise.allSettled(
      (verification.healthDocuments || []).map(async (doc) => {
        const content = await urlToInlinePart(doc.url);
        if (!content) return null;
        return {
          type: doc.type || "other",
          ...content,
        };
      }),
    )
  )
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);
  const animalPhotos = (
    await Promise.allSettled(
      (verification.animalPhotos || []).map(async (photo) => {
        const content = await urlToInlinePart(photo.url, "image/jpeg");
        if (!content) return null;
        return content;
      }),
    )
  )
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);
  return {
    animalDetails,
    ownershipDocuments,
    healthDocuments,
    animalPhotos,
  };
}
async function runAIAnalysisForVerification(verification) {
  verification.status = "processing";
  await verification.save();
  const verificationData = await buildAIInputFromVerification(verification);
  const hasAnyInput =
    verificationData.ownershipDocuments.length > 0 ||
    verificationData.healthDocuments.length > 0 ||
    verificationData.animalPhotos.length > 0;
  if (!hasAnyInput) {
    throw new Error("No readable documents/photos found for AI analysis");
  }
  const aiResults = await comprehensiveVerification(verificationData);
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
    aiModel: ACTIVE_GEMINI_MODEL,
    processingTime: aiResults.overall?.processingTime || 0,
  };
  verification.calculateVerificationScore();
  verification.status = aiResults.overall?.status || "needs_review";
  verification.overallApproved = aiResults.overall?.approved || false;
  verification.expiresAt = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000);
  if (
    verification.status === "needs_review" ||
    Number(verification.verificationScore || 0) < 75
  ) {
    verification.manualReview.required = true;
  }
  await verification.save();
  return verification;
}
function makeVerificationSummary(record) {
  const ownershipFlags = Array.isArray(record.aiVerification?.ownershipFlags)
    ? record.aiVerification.ownershipFlags
    : [];
  const healthFlags = Array.isArray(record.aiVerification?.healthFlags)
    ? record.aiVerification.healthFlags
    : [];
  const photoFlags = Array.isArray(record.aiVerification?.photoFlags)
    ? record.aiVerification.photoFlags
    : [];
  const totalFlags =
    ownershipFlags.length + healthFlags.length + photoFlags.length;
  return {
    _id: record._id,
    verificationType: record.verificationType,
    status: record.status,
    verificationScore: record.verificationScore || 0,
    overallApproved: !!record.overallApproved,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    aiVerification: {
      ownershipConfidence: record.aiVerification?.ownershipConfidence || 0,
      healthConfidence: record.aiVerification?.healthConfidence || 0,
      verificationDate: record.aiVerification?.verificationDate || null,
      aiModel: record.aiVerification?.aiModel || null,
      ownershipFlags,
      healthFlags,
      photoFlags,
      totalFlags,
      hasFlags: totalFlags > 0,
    },
    documentCounts: {
      ownership: record.ownershipDocuments?.length || 0,
      health: record.healthDocuments?.length || 0,
      photos: record.animalPhotos?.length || 0,
    },
    farmer: record.farmer
      ? {
          _id: record.farmer._id,
          name: record.farmer.name,
          email: record.farmer.email,
          phone: record.farmer.phone || "",
        }
      : null,
    auction: record.auction
      ? {
          _id: record.auction._id,
          animalType: record.auction.animalType || "",
          breed: record.auction.breed || "",
          location: record.auction.location || "",
          expectedPrice: record.auction.expectedPrice || 0,
        }
      : null,
  };
}
export const submitVerification = async (req, res) => {
  try {
    const {
      auctionId,
      verificationType,
      ownershipDetails,
      healthNotes,
      veterinarianName,
      veterinarianContact,
      lastVaccinationDate,
      acquisitionDate,
      previousOwner,
    } = req.body;
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
    const farmerId = req.session?.user?.id || null;
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
    const ownershipDocs = [];
    const healthDocs = [];
    const animalPhotos = [];
    const maxFiles = { ownership: 5, health: 5, photos: 10 };
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
          type: "other",
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          fileName: file.originalname,
        });
      }
    }
    if (req.files?.healthDocuments) {
      if (req.files.healthDocuments.length > maxFiles.health) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxFiles.health} health documents allowed`,
        });
      }
      for (const file of req.files.healthDocuments) {
        const uploaded = await uploadFromBuffer(file.buffer, "verification/health");
        healthDocs.push({
          type: "other",
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          fileName: file.originalname,
        });
      }
    }
    if (req.files?.animalPhotos) {
      if (req.files.animalPhotos.length > maxFiles.photos) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxFiles.photos} photos allowed`,
        });
      }
      for (const file of req.files.animalPhotos) {
        const uploaded = await uploadFromBuffer(file.buffer, "verification/animals");
        animalPhotos.push({
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          description: "Verification photo",
        });
      }
    }
    const verificationData = {
      ...(farmerId && { farmer: farmerId }),
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
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : undefined,
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
    return res.status(500).json({
      success: false,
      message: "Failed to submit verification",
      error: error.message,
    });
  }
};
export const processAIVerification = async (req, res) => {
  try {
    const { verificationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(verificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Verification ID format",
      });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message:
          "GEMINI_API_KEY is not configured. Add it to your environment file.",
      });
    }
    const verification = await Verification.findById(verificationId)
      .populate("auction")
      .populate("farmer", "name email phone");
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }
    const updatedVerification = await runAIAnalysisForVerification(verification);
    return res.status(200).json({
      success: true,
      message: "AI verification completed",
      data: updatedVerification,
    });
  } catch (error) {
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
      message: `AI verification failed: ${error.message}`,
      error: error.message,
    });
  }
};
export const getAdminAIVerificationSubmissions = async (req, res) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access is required",
      });
    }
    const page = parsePositiveInt(req.query.page, 1, { min: 1, max: 10000 });
    const limit = parsePositiveInt(req.query.limit, 12, { min: 1, max: 100 });
    const status = String(req.query.status || "all").trim().toLowerCase();
    const type = String(req.query.type || "all").trim().toLowerCase();
    const aiState = String(req.query.aiState || "all").trim().toLowerCase();
    const q = String(req.query.q || "").trim().toLowerCase();
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;
    const mongoQuery = {};
    if (ALLOWED_VERIFICATION_STATUSES.has(status)) {
      mongoQuery.status = status;
    }
    if (ALLOWED_VERIFICATION_TYPES.has(type)) {
      mongoQuery.verificationType = type;
    }
    if (dateFrom || dateTo) {
      mongoQuery.createdAt = {};
      if (dateFrom && !Number.isNaN(dateFrom.getTime())) {
        mongoQuery.createdAt.$gte = dateFrom;
      }
      if (dateTo && !Number.isNaN(dateTo.getTime())) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        mongoQuery.createdAt.$lte = endDate;
      }
      if (Object.keys(mongoQuery.createdAt).length === 0) {
        delete mongoQuery.createdAt;
      }
    }
    const records = await Verification.find(mongoQuery)
      .populate("farmer", "name email phone")
      .populate("auction", "animalType breed location expectedPrice")
      .sort({ createdAt: -1 });
    let summaries = records.map(makeVerificationSummary);
    if (aiState === "analyzed") {
      summaries = summaries.filter(
        (item) =>
          !!item.aiVerification.verificationDate ||
          item.aiVerification.ownershipConfidence > 0 ||
          item.aiVerification.healthConfidence > 0,
      );
    } else if (aiState === "pending_ai") {
      summaries = summaries.filter(
        (item) =>
          !item.aiVerification.verificationDate &&
          item.aiVerification.ownershipConfidence === 0 &&
          item.aiVerification.healthConfidence === 0,
      );
    }
    if (q) {
      summaries = summaries.filter((item) => {
        const haystack = [
          item._id,
          item.status,
          item.verificationType,
          item.farmer?.name,
          item.farmer?.email,
          item.farmer?.phone,
          item.auction?._id,
          item.auction?.animalType,
          item.auction?.breed,
          item.auction?.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    const stats = {
      total: summaries.length,
      pending: summaries.filter((item) => item.status === "pending").length,
      processing: summaries.filter((item) => item.status === "processing")
        .length,
      verified: summaries.filter((item) => item.status === "verified").length,
      rejected: summaries.filter((item) => item.status === "rejected").length,
      needsReview: summaries.filter((item) => item.status === "needs_review")
        .length,
      analyzed: summaries.filter((item) => !!item.aiVerification.verificationDate)
        .length,
    };
    const totalPages = Math.max(1, Math.ceil(summaries.length / limit));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * limit;
    const pagedData = summaries.slice(startIndex, startIndex + limit);
    return res.status(200).json({
      success: true,
      data: pagedData,
      stats,
      pagination: {
        page: safePage,
        limit,
        totalItems: summaries.length,
        totalPages,
        hasPrev: safePage > 1,
        hasNext: safePage < totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AI verification submissions",
      error: error.message,
    });
  }
};
export const getAdminAIVerificationSubmission = async (req, res) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access is required",
      });
    }
    const { verificationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(verificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Verification ID format",
      });
    }
    const verification = await Verification.findById(verificationId)
      .populate("farmer", "name email phone")
      .populate(
        "auction",
        "animalType breed age weight sex healthStatus location expectedPrice",
      );
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
    return res.status(500).json({
      success: false,
      message: "Failed to fetch verification details",
      error: error.message,
    });
  }
};
export const analyzeVerificationForAdmin = async (req, res) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(403).json({
        success: false,
        message: "Admin access is required",
      });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message:
          "GEMINI_API_KEY is not configured. Add it to your environment file.",
      });
    }
    const { verificationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(verificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Verification ID format",
      });
    }
    const verification = await Verification.findById(verificationId)
      .populate("auction")
      .populate("farmer", "name email phone");
    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }
    const analyzedRecord = await runAIAnalysisForVerification(verification);
    return res.status(200).json({
      success: true,
      message: "AI analysis completed successfully",
      data: analyzedRecord,
    });
  } catch (error) {
    if (
      req.params.verificationId &&
      mongoose.Types.ObjectId.isValid(req.params.verificationId)
    ) {
      await Verification.findByIdAndUpdate(
        req.params.verificationId,
        {
          status: "needs_review",
          notes: `AI analysis failed: ${error.message}`,
        },
        { runValidators: true },
      );
    }
    return res.status(500).json({
      success: false,
      message: `AI analysis failed: ${error.message}`,
      error: error.message,
    });
  }
};
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
    return res.status(500).json({
      success: false,
      message: "Failed to get verification status",
      error: error.message,
    });
  }
};
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
    return res.status(500).json({
      success: false,
      message: "Failed to get verifications",
      error: error.message,
    });
  }
};
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
    return res.status(500).json({
      success: false,
      message: "Failed to get verification",
      error: error.message,
    });
  }
};
export const getAllVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find()
      .populate("auction", "breed animalType location photos")
      .populate("farmer", "name email phone")
      .sort({ createdAt: -1 });
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
      stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get verifications",
      error: error.message,
    });
  }
};
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
      stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get verifications",
      error: error.message,
    });
  }
};
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
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};
export const getCurrentUser = async (req, res) => {
  try {
    const user = req.session?.user;
    if (!user) {
      return res.status(200).json({
        success: true,
        user: null,
      });
    }
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
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
  getAdminAIVerificationSubmissions,
  getAdminAIVerificationSubmission,
  analyzeVerificationForAdmin,
  getVerificationStatus,
  getFarmerVerifications,
  getVerificationByAuction,
  getAllVerifications,
  getMyVerifications,
  updateVerificationStatus,
  getCurrentUser,
};

