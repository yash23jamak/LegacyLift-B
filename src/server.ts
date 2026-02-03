
import express, { Application, Request, Response } from "express";
import dotenv from "dotenv";
import cors, { CorsOptionsDelegate } from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import analysisRoute from "./routes/analysis.js";

dotenv.config();

const app: Application = express();

/* ---------- Core middleware ---------- */
app.use(cookieParser());
// Keep one json/urlencoded pair with larger limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ---------- Allowed origins (env) ---------- */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Add common local variants if not already present
const localExtras = [
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://localhost:8080",
];
for (const o of localExtras) {
    if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
}

/* ---------- CORS options ---------- */
/**
 * Using CorsOptionsDelegate: req is CorsRequest, not Express.Request.
 * Read the origin from req.headers.origin (string | string[] | undefined).
 */
const corsOptions: CorsOptionsDelegate = (req, cb) => {
    const headerOrigin = req.headers?.origin; // string | string[] | undefined
    const origin = Array.isArray(headerOrigin) ? headerOrigin[0] : headerOrigin;

    // Allow non-browser clients (no Origin header)
    if (!origin) {
        return cb(null, { origin: true, credentials: true });
    }

    // Exact match against allowed list
    if (allowedOrigins.includes(origin)) {
        return cb(null, { origin: true, credentials: true });
    }

    // Block with readable error
    return cb(new Error(`Not allowed by CORS: ${origin}`), { origin: false });
};

// Apply CORS globally (handles preflight internally)
app.use(cors(corsOptions));

/* ---------- Database ---------- */
const mongoUri: string = process.env.MONGO_URI || "";
mongoose
    .connect(mongoUri)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error(err));

/* ---------- Health ---------- */
app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        message: "Server is healthy",
        timestamp: new Date().toISOString(),
    });
});

/* ---------- Routes ---------- */
app.use("/api/v1", analysisRoute);

/* ---------- Start ---------- */
const PORT: number = parseInt(process.env.PORT || "3007", 10);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Allowed origins:", allowedOrigins);
});