import { socket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";
import { useUserStore } from "@/store/userStore";
import * as mediasoup from "mediasoup-client";
import { useRef } from "react";

type ScreenQuality = "480p" | "720p30" | "720p60" | "1080p30" | "1080p60";

const SCREEN_PRESETS: Record<
  ScreenQuality,
  { width: number; height: number; frameRate: number }
> = {
  "480p": { width: 854, height: 480, frameRate: 30 },

  "720p30": { width: 1280, height: 720, frameRate: 30 },
  "720p60": { width: 1280, height: 720, frameRate: 60 },

  "1080p30": { width: 1920, height: 1080, frameRate: 30 },
  "1080p60": { width: 1920, height: 1080, frameRate: 60 },
};

export default function useMediasoup() {
  const roomId = useRoomStore((s) => s.roomId);
  const userId = useUserStore((s) => s.user?.userId);
  const addVideoStream = useRoomStore((s) => s.addVideoStream);
  const removeVideoStream = useRoomStore((s) => s.removeVideoStream);

  const clearVideoStreams = useRoomStore((s) => s.clearVideoStreams);

  const deviceRef = useRef<mediasoup.types.Device | null>(null);
  const sendTransportRef = useRef<mediasoup.types.Transport | null>(null);
  const recvTransportRef = useRef<mediasoup.types.Transport | null>(null);

  const audioProducerRef = useRef<mediasoup.types.Producer | null>(null);
  const cameraProducerRef = useRef<mediasoup.types.Producer | null>(null);
  const screenProducerRef = useRef<mediasoup.types.Producer | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const screenVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  const screenProducerIdRef = useRef<string | null>(null);

  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const consumersRef = useRef<Map<string, mediasoup.types.Consumer>>(new Map()); // key = producerId

  async function get_router_capabilities() {
    const data = await new Promise((res, rej) => {
      socket.emit("get-router-capabilities", roomId, (response: any) => {
        if (response?.error) {
          rej(response.error);
        } else {
          res(response);
        }
      });
    });

    const device = new mediasoup.Device();

    await device.load({
      routerRtpCapabilities: (data as any).routerRtpCapabilities,
    });

    deviceRef.current = device;

    await createTransports(device, data);
    await startAudio();
  }

  async function createTransports(device: mediasoup.types.Device, data: any) {
    const sendTransport = device.createSendTransport(data.sendTransportParams);
    const recvTransport = device.createRecvTransport(data.recvTransportParams);

    sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
      socket.emit(
        "connect-transport",
        roomId,
        sendTransport.id,
        dtlsParameters,
        (response: any) => {
          if (response?.error) errback(response.error);
          else callback();
        },
      );
    });

    recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
      socket.emit(
        "connect-transport",
        roomId,
        recvTransport.id,
        dtlsParameters,
        (response: any) => {
          if (response?.error) errback(response.error);
          else callback();
        },
      );
    });

    sendTransport.on(
      "produce",
      ({ kind, rtpParameters, appData }, callback, errback) => {
        socket.emit(
          "produce",
          {
            roomId,
            transportId: sendTransport.id,
            kind,
            rtpParameters,
            appData,
          },
          (response: any) => {
            if (response?.error) errback(response.error);
            else callback({ id: response.id });
          },
        );
      },
    );

    sendTransportRef.current = sendTransport;
    recvTransportRef.current = recvTransport;

    listenForProducers();
    await consumeExisting();
  }

  async function startAudio() {
    if (!sendTransportRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        noiseSuppression: true,
        echoCancellation: true,
      },
    });

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();

    gain.gain.value = 1;

    source.connect(gain);

    const destination = ctx.createMediaStreamDestination();
    gain.connect(destination);

    const processedTrack = destination.stream.getAudioTracks()[0];

    const producer = await sendTransportRef.current.produce({
      track: processedTrack,
      disableTrackOnPause: true,
      zeroRtpOnPause: true,
      appData: { type: "audio" },
    });

    audioContextRef.current = ctx;
    micGainNodeRef.current = gain;
    micSourceRef.current = source;

    audioProducerRef.current = producer;
  }

  function listenForProducers() {
    socket.on("new-producer", async ({ producerId, appData }) => {
      await consume(producerId, appData);
    });

    socket.on("producer-closed", ({ producerId }) => {
      consumersRef.current.forEach((consumer, consumerId) => {
        if (consumer.producerId === producerId) {
          consumer.close();
          consumersRef.current.delete(consumerId);

          const audio = audioElementsRef.current.get(consumerId);
          if (audio) {
            audio.pause();
            audio.srcObject = null;
          }
          audioElementsRef.current.delete(consumerId);

          removeVideoStream(producerId);
        }
      });
    });
  }

  async function consumeExisting() {
    const data: any = await new Promise((resolve) => {
      socket.emit("get-existing-producers", roomId, resolve);
    });

    for (const producer of data.producers) {
      await consume(producer.producerId, producer.appData);
    }
  }

  async function consume(producerId: string, appData?: any) {
    if (producerId === audioProducerRef.current?.id) return;
    if (!deviceRef.current || !recvTransportRef.current) return;

    const data: any = await new Promise((resolve, reject) => {
      socket.emit(
        "consume",
        {
          roomId,
          producerId,
          rtpCapabilities: deviceRef.current?.rtpCapabilities,
        },
        (response: any) => {
          if (response?.error) reject(response.error);
          else resolve(response);
        },
      );
    });

    const consumer = await recvTransportRef.current.consume({
      id: data.id,
      producerId: data.producerId,
      kind: data.kind,
      rtpParameters: data.rtpParameters,
    });
    consumersRef.current.set(data.producerId, consumer);

    const stream = new MediaStream([consumer.track]);

    await new Promise((resolve) => {
      socket.emit("resume-consumer", { consumerId: consumer.id }, () =>
        resolve(null),
      );
    });

    if (consumer.kind === "audio") {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audioElementsRef.current.set(consumer.id, audio);
      await audio.play().catch(() => {});
    }

    if (consumer.kind === "video") {
      addVideoStream({
        producerId: data.producerId,
        type: appData?.type || "screen",
        userId: appData?.userId,
        stream,
      });
    }
  }

  async function startScreenShare() {
    if (!sendTransportRef.current) return;

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: true,
    });

    const videoTrack = stream.getVideoTracks()[0];
    videoTrack.contentHint = "detail";
    const audioTrack = stream.getAudioTracks()[0];

    screenVideoTrackRef.current = videoTrack;

    videoTrack.onended = () => {
      stopScreenShare();
    };

    const producer = await sendTransportRef.current.produce({
      track: videoTrack,
      appData: { type: "screen", userId },

      encodings: [
        { rid: "r0", maxBitrate: 400000, scaleResolutionDownBy: 4 },
        { rid: "r1", maxBitrate: 1500000, scaleResolutionDownBy: 2 },
        { rid: "r2", maxBitrate: 6000000, scaleResolutionDownBy: 1 },
      ],
      codecOptions: { videoGoogleStartBitrate: 8000 },
    });

    screenProducerIdRef.current = producer.id;

    addVideoStream({
      producerId: producer.id,
      type: "screen",
      userId: userId!,
      stream: new MediaStream([videoTrack]),
    });

    if (audioTrack) {
      await sendTransportRef.current.produce({
        track: audioTrack,
        appData: { type: "system-audio" },
      });
    }

    screenProducerRef.current = producer;
  }

  function stopScreenShare() {
    const producer = screenProducerRef.current;
    if (!producer) return;

    // Stop the actual media track so the browser indicator disappears
    producer.track?.stop();

    socket.emit("close-producer", { roomId, producerId: producer.id });
    producer.close();

    // ── FIX 1b: remove our own local stream from the store ────────────────
    if (screenProducerIdRef.current) {
      removeVideoStream(screenProducerIdRef.current);
      screenProducerIdRef.current = null;
    }

    screenProducerRef.current = null;
  }

  async function setScreenMaxQuality(spatialLayer: 0 | 1 | 2) {
    const producer = screenProducerRef.current;
    const track = screenVideoTrackRef.current;
    if (!producer || !track) return;

    const qualityMap: Record<
      0 | 1 | 2,
      { width: number; height: number; frameRate: number }
    > = {
      0: { width: 480, height: 270, frameRate: 10 },
      1: { width: 960, height: 540, frameRate: 20 },
      2: { width: 1920, height: 1080, frameRate: 30 },
    };

    const q = qualityMap[spatialLayer];

    // Check encodings instead of producer.type
    const isSimulcast =
      producer.rtpParameters.encodings &&
      producer.rtpParameters.encodings.length > 1;

    if (isSimulcast) {
      await producer.setMaxSpatialLayer(spatialLayer);
    }

    await track.applyConstraints({
      width: { ideal: q.width },
      height: { ideal: q.height },
      frameRate: { ideal: q.frameRate },
    });

    socket.emit("screen:setQuality", {
      producerId: screenProducerIdRef.current,
      maxSpatialLayer: spatialLayer,
    });

    console.log(
      `Quality set to layer ${spatialLayer}, isSimulcast: ${isSimulcast}, encodings: ${producer.rtpParameters.encodings?.length}`,
    );
  }

  // Already in your useMediasoup.ts — no changes needed
  async function setViewerQuality(producerId: string, layer?: 0 | 1 | 2) {
    const consumer = consumersRef.current.get(producerId);

    if (!consumer) return;

    socket.emit("set-consumer-layers", {
      consumerId: consumer.id,
      spatialLayer: layer, // undefined = let mediasoup BWE auto-select
    });
  }

  function mute() {
    audioProducerRef.current?.pause();
  }

  function unmute() {
    audioProducerRef.current?.resume();
  }

  function deafen() {
    consumersRef.current.forEach((consumer) => {
      if (consumer.kind === "audio") consumer.pause();
    });
  }

  function undeafen() {
    consumersRef.current.forEach((consumer) => {
      if (consumer.kind === "audio") consumer.resume();
    });
  }

  function cleanup() {
    socket.off("new-producer");
    socket.off("consumer-paused");
    socket.off("consumer-resumed");
    socket.off("producer-closed");

    // Stop and close our own audio producer
    const producer = audioProducerRef.current;
    if (producer) {
      producer.track?.stop();
      producer.close();
      audioProducerRef.current = null;
    }

    // Stop and close screen share producer if still active
    const screenProducer = screenProducerRef.current;
    if (screenProducer) {
      screenProducer.track?.stop();
      screenProducer.close();
      screenProducerRef.current = null;
      screenProducerIdRef.current = null;
    }

    consumersRef.current.forEach((consumer) => consumer.close());
    consumersRef.current.clear();

    // Silence all remote audio elements
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();

    // Close transports
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    sendTransportRef.current = null;
    recvTransportRef.current = null;

    // ── FIX 2: wipe all video streams so rejoin starts with a clean slate ──
    clearVideoStreams();
  }

  function setMicVolume(percent: number) {
    const gain = micGainNodeRef.current;
    if (!gain) return;

    const value = Math.min(Math.max(percent, 0), 100) / 100;

    gain.gain.value = value;
  }

  function setSpeakerVolume(percent: number) {
    const volume = Math.min(Math.max(percent, 0), 100) / 100;

    audioElementsRef.current.forEach((audio) => {
      audio.volume = volume;
    });
  }

  async function toggleNoiseSuppression(enabled: boolean) {
    const producer = audioProducerRef.current;
    if (!producer) return;

    const track = producer.track;

    if (!track) return;

    try {
      await track.applyConstraints({
        noiseSuppression: enabled,
      });
    } catch (err) {
      console.warn("Noise suppression change failed", err);
    }
  }

  async function startCamera() {
    if (!sendTransportRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });

    const videoTrack = stream.getVideoTracks()[0];

    videoTrack.onended = () => {
      stopCamera();
    };

    const producer = await sendTransportRef.current.produce({
      track: videoTrack,
      appData: {
        type: "camera",
        userId,
      },

      encodings: [
        { rid: "r0", maxBitrate: 300000, scaleResolutionDownBy: 2 },
        { rid: "r1", maxBitrate: 1500000, scaleResolutionDownBy: 1 },
      ],

      codecOptions: {
        videoGoogleStartBitrate: 1000,
      },
    });

    cameraProducerRef.current = producer;

    addVideoStream({
      producerId: producer.id,
      type: "camera",
      userId: userId!,
      stream: new MediaStream([videoTrack]),
    });
  }

  function stopCamera() {
    const producer = cameraProducerRef.current;
    if (!producer) return;

    producer.track?.stop();

    socket.emit("close-producer", {
      roomId,
      producerId: producer.id,
    });

    producer.close();

    removeVideoStream(producer.id);

    cameraProducerRef.current = null;
  }

  return {
    get_router_capabilities,
    cleanup,
    mute,
    unmute,
    deafen,
    undeafen,
    startScreenShare,
    stopScreenShare,
    setScreenMaxQuality,
    setViewerQuality,
    setMicVolume,
    setSpeakerVolume,
    toggleNoiseSuppression,
    startCamera,
    stopCamera,
  };
}
