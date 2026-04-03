import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const connectDB = async () => {
  const uri =
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/digital-livestock-auction";

  if (!process.env.MONGO_URI) {
    console.warn(
      "Warning: MONGO_URI is not set. Falling back to local MongoDB at mongodb://localhost:27017/digital-livestock-auction",
    );
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error(err);
    process.exit(1);
  }
};

export default connectDB;
