// models/Verification.js
import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
  {
    // Reference to the auction/listing – optional
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: false,
      default: null,
    },

    // Reference to the farmer/seller – NOW OPTIONAL
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // ← changed from true to false
      default: null, // explicit default
    },

    // Verification Type
    verificationType: {
      type: String,
      enum: ["ownership", "health", "both"],
      required: true,
    },

    // Ownership Verification Documents
    ownershipDocuments: [
      {
        type: {
          type: String,
          enum: [
            "purchase_receipt",
            "ownership_certificate",
            "breeding_certificate",
            "transfer_deed",
            "government_id",
            "other",
          ],
        },
        url: String,
        publicId: String,
        fileName: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Health Records Documents
    healthDocuments: [
      {
        type: {
          type: String,
          enum: [
            "vaccination_card",
            "health_certificate",
            "veterinary_report",
            "medical_history",
            "lab_results",
            "deworming_record",
            "other",
          ],
        },
        url: String,
        publicId: String,
        fileName: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Animal Photos for Verification
    animalPhotos: [
      {
        url: String,
        publicId: String,
        description: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Additional Details
    additionalDetails: {
      ownershipDetails: String,
      healthNotes: String,
      veterinarianName: String,
      veterinarianContact: String,
      lastVaccinationDate: Date,
      acquisitionDate: Date,
      previousOwner: String,
    },

    // AI Verification Results
    aiVerification: {
      ownershipVerified: { type: Boolean, default: false },
      ownershipConfidence: { type: Number, min: 0, max: 100 },
      ownershipAnalysis: String,
      ownershipFlags: [String],

      healthVerified: { type: Boolean, default: false },
      healthConfidence: { type: Number, min: 0, max: 100 },
      healthAnalysis: String,
      healthAssessment: {
        type: String,
        enum: ["excellent", "good", "fair", "poor", "needs_review"],
      },
      healthFlags: [String],

      photoVerified: { type: Boolean, default: false },
      photoAnalysis: String,
      detectedBreed: String,
      breedMatches: Boolean,
      photoQuality: { type: String, enum: ["high", "medium", "low"] },
      photoFlags: [String],

      verificationDate: Date,
      aiModel: { type: String, default: "gemini-2.5-flash" },
      processingTime: Number,
    },

    // Manual Review
    manualReview: {
      required: { type: Boolean, default: false },
      completed: { type: Boolean, default: false },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewDate: Date,
      reviewNotes: String,
      approved: Boolean,
      rejectionReason: String,
    },

    // Overall Status
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "verified",
        "rejected",
        "needs_review",
        "incomplete",
      ],
      default: "pending",
    },

    overallApproved: { type: Boolean, default: false },
    verificationScore: { type: Number, min: 0, max: 100 },

    expiresAt: Date,

    notes: String,
  },
  { timestamps: true },
);

// Indexes (auction index kept but optional field is fine)
verificationSchema.index({ auction: 1 });
verificationSchema.index({ farmer: 1 });
verificationSchema.index({ status: 1 });
verificationSchema.index({ createdAt: -1 });

// Virtual & method unchanged
verificationSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

verificationSchema.methods.calculateVerificationScore = function () {
  let totalScore = 0;
  let components = 0;

  if (this.aiVerification.ownershipConfidence) {
    totalScore += this.aiVerification.ownershipConfidence;
    components++;
  }

  if (this.aiVerification.healthConfidence) {
    totalScore += this.aiVerification.healthConfidence;
    components++;
  }

  if (this.aiVerification.photoVerified) {
    totalScore += 90;
    components++;
  }

  this.verificationScore = components > 0 ? totalScore / components : 0;
  return this.verificationScore;
};

const Verification = mongoose.model("Verification", verificationSchema);

export default Verification;
