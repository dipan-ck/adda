import express from "express";
import cors from "cors";

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (curl, Postman, server-to-server)
            if (!origin) return callback(null, true);
            // In development, allow all devtunnel / localhost origins dynamically
            if (
                origin.includes("devtunnels.ms") ||
                origin.includes("localhost") ||
                origin.includes("127.0.0.1") ||
                allowedOrigins.includes(origin)
            ) {
                return callback(null, true);
            }
            callback(new Error(`CORS: origin ${origin} not allowed`));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

export default app;
