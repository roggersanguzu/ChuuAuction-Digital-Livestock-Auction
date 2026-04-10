import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

let connectionPromise;

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
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    if (!connectionPromise) {
      connectionPromise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });
    }

    await connectionPromise;
    console.log("MongoDB connected successfully");
    return mongoose.connection;
  } catch (err) {
    connectionPromise = null;
    console.error("MongoDB connection failed:", err.message);
    console.error(err);
    throw err;
  }
};

export default connectDB;
