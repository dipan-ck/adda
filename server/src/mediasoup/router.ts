import { getMediasoupWorkerFromPool } from "./worker";
import * as mediasoup from "mediasoup";

const mediaCodecs: mediasoup.types.RouterRtpCodecCapability[] = [
    {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: {
            "packetization-mode": 1,
            "level-asymmetry-allowed": 1,
        },
    },
    {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {
            "x-google-start-bitrate": 3000,
        },
    },
];

export async function createMediasoupRouter() {
    let worker = getMediasoupWorkerFromPool();
    let router = worker.createRouter({ mediaCodecs });

    return router;
}
