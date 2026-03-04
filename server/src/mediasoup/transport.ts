import * as mediasoup from "mediasoup";

export async function createMediasoupWebRtcTransport(
    router: mediasoup.types.Router,
) {
    const transport = await router.createWebRtcTransport({
        listenIps: [
            {
                ip: "127.0.0.1", //for dev tunnes: 0.0.0.0 and for localhost 127.0.0.1
                //announcedIp: "sffxkn5q-8000.inc1.devtunnels.ms", // change in production //for dev tunnels:    announcedIp: "sffxkn5q-8000.inc1.devtunnels.ms",
            },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 10_000_000,
        maxSctpMessageSize: 262144,
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
