import dotenv from "dotenv";
import mongoose from "mongoose";
import Auction from "../models/Auction.js";

// Usage:
// node scripts/fixLegacyAuctionSeller.js <targetSellerId>

dotenv.config();

const LEGACY_SELLER_ID = "64ab1234abcd5678ef901234";
const targetSellerId = process.argv[2];

if (!targetSellerId) {
  console.error("Usage: node scripts/fixLegacyAuctionSeller.js <targetSellerId>");
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const beforeLegacy = await Auction.countDocuments({ seller: LEGACY_SELLER_ID });
    const beforeTarget = await Auction.countDocuments({ seller: targetSellerId });

    const result = await Auction.updateMany(
      { seller: LEGACY_SELLER_ID },
      { $set: { seller: targetSellerId } },
    );

    const afterLegacy = await Auction.countDocuments({ seller: LEGACY_SELLER_ID });
    const afterTarget = await Auction.countDocuments({ seller: targetSellerId });

    console.log(
      JSON.stringify(
        {
          targetSellerId,
          beforeLegacy,
          beforeTarget,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          afterLegacy,
          afterTarget,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("Failed to migrate legacy seller auctions:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
