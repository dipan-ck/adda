import * as mediasoup from "mediasoup";

export async function createMediasoupWebRtcTransport(
    router: mediasoup.types.Router,
) {
    const transport = await router.createWebRtcTransport({
        listenIps: [
            {
                ip: "0.0.0.0",
                // announcedIp: "YOUR_PUBLIC_IP", // change in production
            },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });

    return {
        transport,
        params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        },
    };
}
