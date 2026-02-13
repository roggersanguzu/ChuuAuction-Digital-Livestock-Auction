// app.js
import express from "express";
import exphbs from "express-handlebars";
import path from "path";
import dotenv from "dotenv";
import session from "express-session";
import flash from "connect-flash";
import MongoStore from "connect-mongo";
import favicon from "serve-favicon";
import { fileURLToPath } from "url";

import connectDB from "./config/connectDB.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import livestockRoutes from "./routes/livestockRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
// ============================================
// NEW IMPORTS - Bid and User Routes
// ============================================
import bidRoutes from "./routes/bidRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

const app = express();

app.engine("hbs", exphbs.engine({ extname: ".hbs", defaultLayout: "main" }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(favicon(path.join(__dirname, "public", "img", "favicon.png")));

app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: "sessions",
});

sessionStore.on("error", (error) => {
  console.error("MongoStore ERROR:", error);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "superSecretKey",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 5 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  }),
);

app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

app.use((req, res, next) => {
  console.log(`REQUEST: ${req.method} ${req.url}`);
  console.log("Cookies:", req.headers.cookie || "no cookies");
  console.log("Session ID:", req.sessionID);
  console.log("Session user:", req.session?.user || "MISSING");
  next();
});

// ============================================
// ROUTES REGISTRATION
// ============================================

// Home route
app.get("/", (req, res) => res.render("index", { title: "Home" }));

// ============================================
// API ROUTES - Must come BEFORE page routes
// ============================================
console.log("[App] Registering API routes");
app.use("/api/bids", bidRoutes);
app.use("/api/user", userRoutes);

// ============================================
// PAGE ROUTES - Come AFTER API routes
// ============================================
console.log("[App] Registering page routes");
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/livestock", livestockRoutes);
app.use("/auctions", auctionRoutes);
app.use("/verification", verificationRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
  console.log("404 - Not Found:", req.url);
  res.status(404).render("error", { title: "Page Not Found" });
});

// 500 Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong",
  });
});

console.log("[App] All the routes registered successfully");

export default app;
