// app.js
import express from "express";
import exphbs from "express-handlebars";
import path from "path";
import dotenv from "dotenv";
import session from "express-session";
import flash from "connect-flash";
import MongoStore from "connect-mongo";

import connectDB from "./config/connectDB.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import livestockRoutes from "./routes/livestockRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// --- View Engine ---
app.engine("hbs", exphbs.engine({ extname: ".hbs", defaultLayout: "main" }));
app.set("view engine", "hbs");
app.set("views", path.join(path.resolve(), "views"));

// --- Static Files ---
app.use(express.static(path.join(path.resolve(), "public")));

// --- Body Parsing ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Session Store ---
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: "sessions",
});

sessionStore.on("error", (error) => {
  console.error("MongoStore ERROR:", error);
});

// --- Session Middleware ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "superSecretKey",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 5 * 60 * 1000, // 5 minutes
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  }),
);

// --- Flash Messages ---
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

// --- Debug Logging ---
app.use((req, res, next) => {
  console.log(`REQUEST: ${req.method} ${req.url}`);
  console.log("Cookies:", req.headers.cookie || "no cookies");
  console.log("Session ID:", req.sessionID);
  console.log("Session user:", req.session?.user || "MISSING");
  next();
});

// --- Routes ---
app.get("/", (req, res) => res.render("index", { title: "Home" }));
app.use(express.urlencoded({ extended: true }));
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/livestock", livestockRoutes);
app.use("/auctions", auctionRoutes); // standardized

// --- 404 Handler ---
app.use((req, res) => {
  console.log("404 - Not Found:", req.url);
  res.status(404).render("error", { title: "Page Not Found" });
});

// --- Error Handler ---
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong",
  });
});

export default app;
