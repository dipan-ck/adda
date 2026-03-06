import * as mediasoup from "mediasoup";
import os from "os";

let workers: mediasoup.types.Worker[] = [];

let nextWorkerIndex: number = 0;

export async function createMediasoupWorkerPool() {
  const numCores = os.cpus().length;

  for (let i = 0; i < numCores; i++) {
    const worker = await mediasoup.createWorker({
      rtcMinPort: 42000,
      rtcMaxPort: 42100,
    });

    worker.on("died", () => {
      console.error("Mediasoup worker died, exiting...");
      process.exit(1);
    });

    workers.push(worker);
  }

  console.log("Mediasoup workers created: ", workers.length);
}

export function getMediasoupWorkerFromPool() {
  let worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}
