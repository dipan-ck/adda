import { getMediasoupWorkerFromPool } from "./worker";
import * as mediasoup from "mediasoup";

// VP8 MUST be listed before H264.
// Chrome with H264 may use hardware encoding which does NOT support simulcast,
// meaning setPreferredLayers will have nothing to switch between.
// Listing VP8 first ensures Chrome negotiates VP8 and uses software simulcast.
const mediaCodecs: mediasoup.types.RouterRtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 5000,
    },
  },
  // H264 kept as fallback for devices that don't support VP8
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "level-asymmetry-allowed": 1,
    },
  },
];

export async function create_mediasoup_router() {
  let worker = getMediasoupWorkerFromPool();
  let router = worker.createRouter({ mediaCodecs });
  return router;
}
