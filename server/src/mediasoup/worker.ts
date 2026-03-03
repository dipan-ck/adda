import * as mediasoup from "mediasoup";

let worker: mediasoup.types.Worker;

export async function createMediaSoupWorker() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 2000,
    rtcMaxPort: 2020,
  });

  console.log("Mediasoup worker created");

  return worker;
}

export function getMediasoupWorker() {
  if (!worker) {
    throw new Error("Worker not initialized");
  }
  return worker;
}
