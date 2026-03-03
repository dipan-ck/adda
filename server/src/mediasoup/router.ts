import * as mediasoup from "mediasoup";
import { getMediasoupWorker } from "./worker";

export async function createMediasoupRouter() {
  const worker = getMediasoupWorker();

  const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
      // no preferredPayloadType — let mediasoup assign automatically
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
      // no preferredPayloadType — let mediasoup assign automatically
    },
  ];

  const router = await worker.createRouter({ mediaCodecs });
  return router;
}
