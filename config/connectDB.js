import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ quiet: true });
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected Scuccessfully");
  } catch (err) {
    process.exit(1);
  }
};
export default connectDB;
