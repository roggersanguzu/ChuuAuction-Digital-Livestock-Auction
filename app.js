import express from "express";
import exphbs from "express-handlebars";
import path from "path";
import dotenv from "dotenv";
import session from "express-session";
import flash from "connect-flash";
import MongoStore from "connect-mongo";
import favicon from "serve-favicon";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import livestockRoutes from "./routes/livestockRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import bidRoutes from "./routes/bidRoutes.js";
import userRoutes from "./routes/userRoutes.js";
dotenv.config({ quiet: true });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.engine("hbs", exphbs.engine({ extname: ".hbs", defaultLayout: false }));
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
});
app.use(
  session({
    secret: process.env.SESSION_SECRET || "superSecretKey",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
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
  next();
});
app.get("/", (req, res) => res.render("index", { title: "Home" }));
app.use("/api/bids", bidRoutes);
app.use("/api/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/livestock", livestockRoutes);
app.use("/auctions", auctionRoutes);
app.use("/verification", verificationRoutes);
app.get("/login", (req, res) => res.redirect("/auth/login"));
app.get("/register", (req, res) => res.redirect("/auth/register"));
app.get("/terms", (req, res) => res.redirect("/auth/terms"));
app.get("/privacy", (req, res) => res.redirect("/auth/privacy"));
app.get("/admin", (req, res) => res.redirect("/dashboard/admin"));
app.get("/buyer", (req, res) => res.redirect("/dashboard/buyer"));
app.get("/farmer", (req, res) => res.redirect("/dashboard/farmer"));
app.get("/my-bids", (req, res) => res.redirect("/dashboard/my-bids"));
app.get("/auction-bids", (req, res) => res.redirect("/dashboard/auction-bids"));
app.get("/animalList", (req, res) => res.redirect("/auctions/animalList"));
app.get("/create-auction", (req, res) => res.redirect("/auctions/create"));
app.get("/priceCalculator", (req, res) => res.redirect("/livestock/priceCalculator"));
app.get("/verification-status", (req, res) => res.redirect("/verification/status"));
app.get("/verification-submit", (req, res) => res.redirect("/verification/submit"));
app.get("/dashboard/admin/:tab", (req, res) => {
  const tab = String(req.params.tab || "").trim();
  if (!tab) return res.redirect("/dashboard/admin");
  return res.redirect(`/dashboard/admin#${encodeURIComponent(tab)}`);
});
app.get("/admin/:tab", (req, res) => {
  const tab = String(req.params.tab || "").trim();
  if (!tab) return res.redirect("/dashboard/admin");
  return res.redirect(`/dashboard/admin#${encodeURIComponent(tab)}`);
});
app.get("/dashboard/buyer/:tab", (req, res) => {
  const tab = String(req.params.tab || "").trim();
  if (!tab) return res.redirect("/dashboard/buyer");
  return res.redirect(`/dashboard/buyer#${encodeURIComponent(tab)}`);
});
app.get("/buyer/:tab", (req, res) => {
  const tab = String(req.params.tab || "").trim();
  if (!tab) return res.redirect("/dashboard/buyer");
  return res.redirect(`/dashboard/buyer#${encodeURIComponent(tab)}`);
});
app.get("/dashboard/farmer/:tab", (req, res) => {
  const tab = String(req.params.tab || "").trim();
  if (!tab) return res.redirect("/dashboard/farmer");
  return res.redirect(`/dashboard/farmer#${encodeURIComponent(tab)}`);
});
app.get("/farmer/:tab", (req, res) => {
  const tab = String(req.params.tab || "").trim();
  if (!tab) return res.redirect("/dashboard/farmer");
  return res.redirect(`/dashboard/farmer#${encodeURIComponent(tab)}`);
});
app.get("/dashboard/my-bids/:tab", (req, res) => {
  const tab = String(req.params.tab || "").trim();
  if (!tab) return res.redirect("/dashboard/my-bids");
  return res.redirect(`/dashboard/my-bids#${encodeURIComponent(tab)}`);
});
app.get("/my-bids/:tab", (req, res) => {
  const tab = String(req.params.tab || "").trim();
  if (!tab) return res.redirect("/dashboard/my-bids");
  return res.redirect(`/dashboard/my-bids#${encodeURIComponent(tab)}`);
});
app.use((req, res) => {
  const acceptsHtml = req.method === "GET" && req.accepts("html");
  const isApiRoute = req.path.startsWith("/api/");
  const isStaticAsset = /\.[a-zA-Z0-9]+$/.test(req.path);
  if (acceptsHtml && !isApiRoute && !isStaticAsset) {
    const role = String(req.session?.user?.role || "").trim().toLowerCase();
    if (role === "administrator" || role === "admin") return res.redirect("/dashboard/admin");
    if (role === "buyer") return res.redirect("/dashboard/buyer");
    if (role === "seller" || role === "farmer") return res.redirect("/dashboard/farmer");
    return res.redirect("/auth/login");
  }
  res.status(404).render("error", { title: "Page Not Found" });
});
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong",
  });
});
export default app;



