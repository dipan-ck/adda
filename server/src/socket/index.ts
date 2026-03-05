import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import { register_socket_handlers } from "./handlers";

export function initSocket(server: HTTPServer) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
        : [];

    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                // Allow requests with no origin (server-to-server, curl)
                if (!origin) return callback(null, true);
                // Dynamically allow devtunnels, localhost, and any explicitly listed origins
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
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    register_socket_handlers(io);
}
