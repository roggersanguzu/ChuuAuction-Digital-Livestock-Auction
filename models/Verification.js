import mongoose from "mongoose";
const verificationSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: false,
      default: null,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // â† changed from true to false
      default: null, // explicit default
    },
    verificationType: {
      type: String,
      enum: ["ownership", "health", "both"],
      required: true,
    },
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
    animalPhotos: [
      {
        url: String,
        publicId: String,
        description: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    additionalDetails: {
      ownershipDetails: String,
      healthNotes: String,
      veterinarianName: String,
      veterinarianContact: String,
      lastVaccinationDate: Date,
      acquisitionDate: Date,
      previousOwner: String,
    },
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
    manualReview: {
      required: { type: Boolean, default: false },
      completed: { type: Boolean, default: false },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewDate: Date,
      reviewNotes: String,
      approved: Boolean,
      rejectionReason: String,
    },
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
verificationSchema.index({ auction: 1 });
verificationSchema.index({ farmer: 1 });
verificationSchema.index({ status: 1 });
verificationSchema.index({ createdAt: -1 });
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
