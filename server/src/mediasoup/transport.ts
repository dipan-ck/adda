import * as mediasoup from "mediasoup";

const announcedIp = process.env.ANNOUNCED_IP || "127.0.0.1";

export async function create_mediasoup_WebRtcTransport(
  router: mediasoup.types.Router,
) {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: "0.0.0.0",
        announcedIp,
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
