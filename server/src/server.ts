import "dotenv/config";
import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import { createMediasoupWorkerPool } from "./mediasoup/worker";

const PORT = process.env.PORT || 8000;

async function start() {
  const httpServer = http.createServer(app);

  await createMediasoupWorkerPool();

  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
