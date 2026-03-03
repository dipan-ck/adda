import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import { createMediaSoupWorker } from "./mediasoup/worker";

dotenv.config();

const PORT = process.env.PORT || 8000;

async function start() {
  const httpServer = http.createServer(app);

  await createMediaSoupWorker();

  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
