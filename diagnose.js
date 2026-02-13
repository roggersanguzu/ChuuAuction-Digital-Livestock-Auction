// diagnose.js - Find out why seller isn't populating
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function diagnose() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("=".repeat(60));
    console.log("DIAGNOSTIC REPORT");
    console.log("=".repeat(60));

    // Import models
    const User = (await import("./models/User.js")).default;
    const Auction = (await import("./models/Auction.js")).default;

    // TEST 1: Check model names
    console.log("\n📋 TEST 1: Model Names");
    console.log("---");
    console.log(`User model name: "${User.modelName}"`);
    console.log(`Auction model name: "${Auction.modelName}"`);

    const sellerPath = Auction.schema.path("seller");
    const refValue = sellerPath?.options?.ref;
    console.log(`Auction seller ref: "${refValue}"`);

    if (User.modelName === refValue) {
      console.log("✅ Model names MATCH - this is correct!");
    } else {
      console.log(`❌ Model names DON'T MATCH!`);
      console.log(`   Expected: "${User.modelName}"`);
      console.log(`   Got: "${refValue}"`);
    }

    // TEST 2: Check if users exist
    console.log("\n👥 TEST 2: User Collection");
    console.log("---");
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);

    if (userCount > 0) {
      const sampleUser = await User.findOne();
      console.log("\nSample user:");
      console.log(`  _id: ${sampleUser._id}`);
      console.log(`  name: ${sampleUser.name}`);
      console.log(`  email: ${sampleUser.email}`);
      console.log(`  phone: ${sampleUser.phone || "NOT SET"}`);
      console.log(`  role: ${sampleUser.role}`);
      console.log(`  verified: ${sampleUser.verified || false}`);
      console.log(`  rating: ${sampleUser.rating || 0}`);
    } else {
      console.log("❌ NO USERS FOUND!");
    }

    // TEST 3: Check if auctions exist
    console.log("\n🐄 TEST 3: Auction Collection");
    console.log("---");
    const auctionCount = await Auction.countDocuments();
    console.log(`Total auctions in database: ${auctionCount}`);

    if (auctionCount > 0) {
      const rawAuction = await Auction.findOne().lean();
      console.log("\nSample auction (RAW - no populate):");
      console.log(`  _id: ${rawAuction._id}`);
      console.log(`  breed: ${rawAuction.breed}`);
      console.log(`  seller: ${rawAuction.seller}`);
      console.log(`  seller type: ${typeof rawAuction.seller}`);

      if (!rawAuction.seller) {
        console.log("❌ PROBLEM: Seller field is NULL or missing!");
      } else {
        console.log("✅ Seller ID exists in auction");
      }
    } else {
      console.log("❌ NO AUCTIONS FOUND!");
      await mongoose.disconnect();
      return;
    }

    // TEST 4: Test populate manually
    console.log("\n🧪 TEST 4: Manual Populate Test");
    console.log("---");
    const populatedAuction = await Auction.findOne()
      .populate("seller", "name email phone rating verified")
      .lean();

    if (populatedAuction) {
      console.log("Auction after populate:");
      console.log(`  breed: ${populatedAuction.breed}`);
      console.log(`  seller type: ${typeof populatedAuction.seller}`);

      if (
        populatedAuction.seller &&
        typeof populatedAuction.seller === "object"
      ) {
        console.log("\n✅ POPULATE WORKED! Seller details:");
        console.log(`  _id: ${populatedAuction.seller._id}`);
        console.log(`  name: ${populatedAuction.seller.name || "NOT SET"}`);
        console.log(`  email: ${populatedAuction.seller.email || "NOT SET"}`);
        console.log(`  phone: ${populatedAuction.seller.phone || "NOT SET"}`);
        console.log(`  verified: ${populatedAuction.seller.verified || false}`);
        console.log(`  rating: ${populatedAuction.seller.rating || 0}`);
      } else {
        console.log("❌ POPULATE FAILED!");
        console.log(
          `   Seller value: ${JSON.stringify(populatedAuction.seller)}`,
        );
      }
    }

    // TEST 5: Test controller query
    console.log("\n🎯 TEST 5: Controller Query Simulation");
    console.log("---");
    console.log("Testing the exact query from auctionController.js...");

    const auctions = await Auction.find({})
      .populate("seller", "name email phone rating verified")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${auctions.length} auction(s)`);

    if (auctions.length > 0) {
      const firstAuction = auctions[0];
      console.log("\nFirst auction from controller query:");
      console.log(`  breed: ${firstAuction.breed}`);
      console.log(`  seller: ${JSON.stringify(firstAuction.seller, null, 2)}`);

      if (firstAuction.seller?.name) {
        console.log("✅ Controller query would work!");
      } else {
        console.log("❌ Controller query would fail!");
      }
    }

    // TEST 6: Check User model fields
    console.log("\n📝 TEST 6: User Model Schema");
    console.log("---");
    console.log("User model has these fields:");
    Object.keys(User.schema.paths).forEach((path) => {
      if (!path.startsWith("_")) {
        console.log(`  - ${path}`);
      }
    });

    // TEST 7: Direct user lookup
    console.log("\n🔍 TEST 7: Direct User Lookup");
    console.log("---");
    const rawAuction2 = await Auction.findOne().lean();
    if (rawAuction2?.seller) {
      console.log(`Looking up user with ID: ${rawAuction2.seller}`);
      const directUser = await User.findById(rawAuction2.seller);

      if (directUser) {
        console.log("✅ User found directly:");
        console.log(`  name: ${directUser.name}`);
        console.log(`  email: ${directUser.email}`);
        console.log("  ➡️ This means populate SHOULD work!");
      } else {
        console.log("❌ User NOT found!");
        console.log(
          "  ➡️ The seller ID in auction points to a non-existent user!",
        );
      }
    }

    // FINAL DIAGNOSIS
    console.log("\n" + "=".repeat(60));
    console.log("DIAGNOSIS SUMMARY");
    console.log("=".repeat(60));

    const rawTest = await Auction.findOne().lean();
    const popTest = await Auction.findOne().populate("seller").lean();

    if (!rawTest?.seller) {
      console.log("\n❌ PROBLEM: Auctions have no seller IDs");
      console.log("   FIX: Run quickFixSellers.js to add seller references");
    } else if (
      popTest?.seller &&
      typeof popTest.seller === "object" &&
      popTest.seller.name
    ) {
      console.log("\n✅ POPULATE WORKS IN DATABASE!");
      console.log("   The issue must be in your controller or frontend.");
      console.log("\n🔧 NEXT STEPS:");
      console.log("   1. Make sure you replaced auctionController.js");
      console.log("   2. Restart your server");
      console.log("   3. Clear browser cache (Ctrl+Shift+R)");
      console.log("   4. Check server console output when loading page");
    } else {
      console.log("\n❌ POPULATE FAILS IN DATABASE");
      console.log("   Possible causes:");
      console.log("   - User model not properly registered");
      console.log("   - Seller IDs point to non-existent users");
      console.log("   - Model import issue");
    }

    console.log("\n");
    await mongoose.disconnect();
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

diagnose();
