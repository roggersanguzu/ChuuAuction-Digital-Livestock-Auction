import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema(
  {
    animalType: {
      type: String,
      ref: "Category",
      required: true,
    },
    breed: String,
    age: { years: Number, months: Number },
    sex: { type: String, enum: ["Male", "Female"] },
    weight: Number,
    healthStatus: { type: String, enum: ["Excellent", "Good", "Fair"] },
    quantity: { type: Number, default: 1 },
    location: String,
    vaccinated: { type: Boolean, default: false },
    vaccinationLicense: String,
    description: String,
    photos: [{ url: String, publicId: String }],
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const Auction = mongoose.model("Auction", auctionSchema);

console.log("[Model] Auction model registered");

export default Auction;
