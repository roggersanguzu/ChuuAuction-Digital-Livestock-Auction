// services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY)");
  }
  return new GoogleGenerativeAI(apiKey);
}

function getModel() {
  const client = getGeminiClient();
  return client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = String(text || "").match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }
    return JSON.parse(jsonMatch[0]);
  }
}

/**
 * Verify ownership documents using Gemini AI
 */
export async function verifyOwnershipDocuments(documents, animalDetails) {
  try {
    const model = getModel();

    // Prepare image parts from documents
    const imageParts = documents.map((doc) => ({
      inlineData: {
        data: doc.base64Data,
        mimeType: doc.mimeType,
      },
    }));

    const prompt = `
You are an expert livestock ownership verification system. Analyze the provided documents to verify ownership.

Animal Details:
- Type: ${animalDetails.animalType}
- Breed: ${animalDetails.breed}
- Claimed Owner: ${animalDetails.ownerName}

Documents Provided: ${documents.map((d) => d.type).join(", ")}

Analyze these documents and provide verification in this EXACT JSON format:
{
  "verified": true/false,
  "confidence": 0-100,
  "analysis": "Detailed explanation of your verification decision",
  "documentQuality": "excellent/good/fair/poor",
  "flags": ["List any red flags or concerns"],
  "recommendations": ["What additional documents would strengthen verification"],
  "ownershipEvidence": {
    "ownerNameMatches": true/false,
    "documentAuthenticity": "genuine/suspicious/unclear",
    "dateValidity": true/false,
    "documentCompleteness": true/false
  },
  "riskLevel": "low/medium/high",
  "approvalRecommendation": "approve/review/reject"
}

Be thorough and professional. Flag any inconsistencies, missing information, or suspicious elements.
`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    return parseJsonResponse(text);
  } catch (error) {
    console.error("Gemini ownership verification error:", error);
    throw new Error(`Ownership verification failed: ${error.message}`);
  }
}

/**
 * Verify health records using Gemini AI
 */
export async function verifyHealthRecords(documents, animalDetails) {
  try {
    const model = getModel();

    const imageParts = documents.map((doc) => ({
      inlineData: {
        data: doc.base64Data,
        mimeType: doc.mimeType,
      },
    }));

    const prompt = `
You are a veterinary document verification expert. Analyze the provided health records.

Animal Details:
- Type: ${animalDetails.animalType}
- Breed: ${animalDetails.breed}
- Age: ${animalDetails.age}
- Weight: ${animalDetails.weight} kg

Health Documents Provided: ${documents.map((d) => d.type).join(", ")}

Analyze these health records and provide verification in this EXACT JSON format:
{
  "verified": true/false,
  "confidence": 0-100,
  "analysis": "Detailed health assessment based on documents",
  "healthAssessment": "excellent/good/fair/poor/needs_review",
  "flags": ["List any health concerns or red flags"],
  "vaccinationStatus": {
    "upToDate": true/false,
    "lastVaccination": "date or 'unknown'",
    "missingVaccinations": ["list any missing vaccines"]
  },
  "medicalHistory": {
    "chronicConditions": ["list any conditions found"],
    "recentTreatments": ["list recent treatments"],
    "concerns": ["any medical concerns"]
  },
  "documentAuthenticity": "genuine/suspicious/unclear",
  "veterinarySignature": "present/absent/unclear",
  "recommendations": ["What additional health records are needed"],
  "riskLevel": "low/medium/high",
  "approvalRecommendation": "approve/review/reject",
  "fitnessForSale": true/false
}

Be thorough in assessing health status. Flag any concerns about animal welfare or health.
`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    return parseJsonResponse(text);
  } catch (error) {
    console.error("Gemini health verification error:", error);
    throw new Error(`Health verification failed: ${error.message}`);
  }
}

/**
 * Verify animal photos and match with description
 */
export async function verifyAnimalPhotos(photos, claimedDetails) {
  try {
    const model = getModel();

    const imageParts = photos.map((photo) => ({
      inlineData: {
        data: photo.base64Data,
        mimeType: photo.mimeType,
      },
    }));

    const prompt = `
You are a livestock identification and verification expert. Analyze the provided animal photos.

Claimed Details:
- Animal Type: ${claimedDetails.animalType}
- Breed: ${claimedDetails.breed}
- Sex: ${claimedDetails.sex}
- Age: ${claimedDetails.age}
- Weight: ${claimedDetails.weight} kg
- Health Status: ${claimedDetails.healthStatus}

Analyze ALL photos and provide verification in this EXACT JSON format:
{
  "verified": true/false,
  "confidence": 0-100,
  "analysis": "Detailed analysis of the animal in photos",
  "detectedAnimal": "What animal you see",
  "detectedBreed": "What breed you identify",
  "breedMatches": true/false,
  "breedConfidence": 0-100,
  "visualHealthAssessment": "excellent/good/fair/poor",
  "physicalCondition": {
    "bodyCondition": "excellent/good/fair/poor/emaciated",
    "coatQuality": "healthy/acceptable/poor",
    "visibleInjuries": true/false,
    "signsOfDisease": ["list any visible signs"]
  },
  "photoQuality": {
    "overall": "high/medium/low",
    "clarity": "clear/acceptable/blurry",
    "lighting": "good/acceptable/poor",
    "angles": "comprehensive/partial/limited"
  },
  "consistencyCheck": {
    "allPhotosSameAnimal": true/false,
    "ageMatches": true/false,
    "sizeMatches": true/false,
    "sexMatches": true/false
  },
  "flags": ["List any concerns or red flags"],
  "genuinePhoto": true/false,
  "stockPhotoDetected": true/false,
  "editingDetected": true/false,
  "recommendations": ["What additional photos would help"],
  "approvalRecommendation": "approve/review/reject"
}

Be very thorough. Detect if photos are stock images, heavily edited, or show different animals.
`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    return parseJsonResponse(text);
  } catch (error) {
    console.error("Gemini photo verification error:", error);
    throw new Error(`Photo verification failed: ${error.message}`);
  }
}

/**
 * Comprehensive verification (all documents + photos)
 */
export async function comprehensiveVerification(data) {
  try {
    const startTime = Date.now();
    const results = {
      ownership: null,
      health: null,
      photos: null,
      overall: {},
    };

    // Verify ownership documents
    if (data.ownershipDocuments && data.ownershipDocuments.length > 0) {
      results.ownership = await verifyOwnershipDocuments(
        data.ownershipDocuments,
        data.animalDetails,
      );
    }

    // Verify health records
    if (data.healthDocuments && data.healthDocuments.length > 0) {
      results.health = await verifyHealthRecords(
        data.healthDocuments,
        data.animalDetails,
      );
    }

    // Verify animal photos
    if (data.animalPhotos && data.animalPhotos.length > 0) {
      results.photos = await verifyAnimalPhotos(
        data.animalPhotos,
        data.animalDetails,
      );
    }

    // Calculate overall verification
    const processingTime = Date.now() - startTime;
    results.overall = calculateOverallVerification(results, processingTime);

    return results;
  } catch (error) {
    console.error("Comprehensive verification error:", error);
    throw error;
  }
}

/**
 * Calculate overall verification status
 */
function calculateOverallVerification(results, processingTime) {
  const scores = [];
  const flags = [];
  let recommendations = [];

  // Collect scores and flags
  if (results.ownership) {
    scores.push(results.ownership.confidence);
    flags.push(...(results.ownership.flags || []));
    recommendations.push(...(results.ownership.recommendations || []));
  }

  if (results.health) {
    scores.push(results.health.confidence);
    flags.push(...(results.health.flags || []));
    recommendations.push(...(results.health.recommendations || []));
  }

  if (results.photos) {
    scores.push(results.photos.confidence);
    flags.push(...(results.photos.flags || []));
    recommendations.push(...(results.photos.recommendations || []));
  }

  // Calculate average confidence
  const averageConfidence =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Determine overall status
  let status = "verified";
  let approved = true;

  if (averageConfidence < 50) {
    status = "rejected";
    approved = false;
  } else if (averageConfidence < 75 || flags.length > 2) {
    status = "needs_review";
    approved = false;
  }

  // Check individual rejections
  if (
    results.ownership?.approvalRecommendation === "reject" ||
    results.health?.approvalRecommendation === "reject" ||
    results.photos?.approvalRecommendation === "reject"
  ) {
    status = "rejected";
    approved = false;
  }

  return {
    status,
    approved,
    confidence: Math.round(averageConfidence),
    flags: [...new Set(flags)], // Remove duplicates
    recommendations: [...new Set(recommendations)],
    processingTime,
    verificationDate: new Date(),
  };
}

export default {
  verifyOwnershipDocuments,
  verifyHealthRecords,
  verifyAnimalPhotos,
  comprehensiveVerification,
};
