import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = (await import("./models/User.js")).default;
    const Auction = (await import("./models/Auction.js")).default;
    const sellerPath = Auction.schema.path("seller");
    const refValue = sellerPath?.options?.ref;
    if (User.modelName === refValue) {
    } else {
    }
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      const sampleUser = await User.findOne();
    } else {
    }
    const auctionCount = await Auction.countDocuments();
    if (auctionCount > 0) {
      const rawAuction = await Auction.findOne().lean();
      if (!rawAuction.seller) {
      } else {
      }
    } else {
      await mongoose.disconnect();
      return;
    }
    const populatedAuction = await Auction.findOne()
      .populate("seller", "name email phone rating verified")
      .lean();
    if (populatedAuction) {
      if (
        populatedAuction.seller &&
        typeof populatedAuction.seller === "object"
      ) {
      } else {
}
    }
    const auctions = await Auction.find({})
      .populate("seller", "name email phone rating verified")
      .sort({ createdAt: -1 })
      .lean();
    if (auctions.length > 0) {
      const firstAuction = auctions[0];
      if (firstAuction.seller?.name) {
      } else {
      }
    }
    Object.keys(User.schema.paths).forEach((path) => {
      if (!path.startsWith("_")) {
      }
    });
    const rawAuction2 = await Auction.findOne().lean();
    if (rawAuction2?.seller) {
      const directUser = await User.findById(rawAuction2.seller);
      if (directUser) {
      } else {
}
    }
    const rawTest = await Auction.findOne().lean();
    const popTest = await Auction.findOne().populate("seller").lean();
    if (!rawTest?.seller) {
    } else if (
      popTest?.seller &&
      typeof popTest.seller === "object" &&
      popTest.seller.name
    ) {
    } else {
    }
    await mongoose.disconnect();
  } catch (error) {
    process.exit(1);
  }
}
diagnose();

