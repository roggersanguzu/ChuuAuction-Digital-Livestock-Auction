import app from "../app.js";
import connectDB from "../config/connectDB.js";

let appReadyPromise;

const ensureAppReady = async () => {
  if (!appReadyPromise) {
    appReadyPromise = connectDB().catch((error) => {
      appReadyPromise = null;
      throw error;
    });
  }

  await appReadyPromise;
};

export default async function handler(req, res) {
  await ensureAppReady();
  return app(req, res);
}
