import { Server } from "socket.io";
import { Server as HTTPServer } from "http";
import { registerSocketHandlers } from "./handlers";

export function initSocket(server: HTTPServer) {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  registerSocketHandlers(io);
}
