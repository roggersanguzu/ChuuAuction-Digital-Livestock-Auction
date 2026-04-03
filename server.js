import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/connectDB.js";
dotenv.config({ quiet: true });
const PORT = process.env.PORT || 3000;
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log("Your App is running");
  });
};
startServer();
