// controllers/auctionController.js
import Auction from "../models/Auction.js";
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
    } = req.body;

    const uploadedImages = await Promise.all(
      req.files.map((file) => uploadFromBuffer(file.buffer, "animal-auctions")),
    );

    const photos = uploadedImages.map((img) => ({
      url: img.secure_url,
      publicId: img.public_id,
    }));

    // TEMP: hardcoded seller ID for testing
    const sellerId = req.user?._id || "64ab1234abcd5678ef901234";

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

    return res.render("auctions/create", {
      successMessage: "Auction created successfully",
      auctionId: auction._id.toString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).render("auctions/create", {
      errorMessage: "Failed to create auction. Please try again.",
    });
  }
};
