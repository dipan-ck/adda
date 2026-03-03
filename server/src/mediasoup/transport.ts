import * as mediasoup from "mediasoup";

export async function createMediasoupWebRtcTransport(
  router: mediasoup.types.Router,
) {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: "127.0.0.1", //need to change in production
        announcedIp: undefined,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  return transport;
}
