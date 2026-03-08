import express from "express";
import cors from "cors";
import { assignSignedUrl } from "./controllers/watchParty.controller";

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowed =
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("devtunnels.ms") ||
        origin.startsWith("chrome-extension://") ||
        allowedOrigins.includes(origin);

      if (allowed) return callback(null, true);

      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/get-signed-url", assignSignedUrl);

export default app;
