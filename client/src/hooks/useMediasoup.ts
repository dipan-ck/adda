"use client";

import { useEffect, useRef, useCallback } from "react";
import * as mediasoupClient from "mediasoup-client";
import { socket } from "@/lib/socket";

export type ScreenShareQuality = {
  width: number;
  height: number;
  frameRate: number;
  label: string;
};

export const SCREEN_QUALITY_PRESETS: ScreenShareQuality[] = [
  { width: 1920, height: 1080, frameRate: 30, label: "1080p · 30fps" },
  { width: 1920, height: 1080, frameRate: 60, label: "1080p · 60fps" },
  { width: 1280, height: 720, frameRate: 30, label: "720p · 30fps" },
  { width: 1280, height: 720, frameRate: 60, label: "720p · 60fps" },
  { width: 854, height: 480, frameRate: 30, label: "480p · 30fps" },
];

export function useMediasoup(roomId: string | null) {
  const deviceRef = useRef<mediasoupClient.types.Device | null>(null);
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const audioProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
  const screenProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
  const screenAudioProducerRef = useRef<mediasoupClient.types.Producer | null>(
    null,
  );
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const initialisedRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const consume = async (
      producerId: string,
      device: mediasoupClient.types.Device,
      recvTransport: mediasoupClient.types.Transport,
    ) => {
      const data: any = await new Promise((resolve) => {
        socket.emit(
          "consume",
          { roomId, producerId, rtpCapabilities: device.rtpCapabilities },
          resolve,
        );
      });

      if (!data || data.error || cancelled) return;

      const consumer = await recvTransport.consume({
        id: data.id,
        producerId: data.producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      });

      socket.emit(
        "resumeConsumer",
        { roomId, consumerId: consumer.id },
        () => {},
      );

      if (data.kind === "video") {
        const stream = new MediaStream([consumer.track]);
        window.dispatchEvent(
          new CustomEvent("screenshare-stream", {
            detail: { producerId, stream, socketId: data.socketId },
          }),
        );
        consumer.track.onended = () => {
          window.dispatchEvent(
            new CustomEvent("screenshare-ended", { detail: { producerId } }),
          );
        };
        consumer.on("transportclose", () => {
          window.dispatchEvent(
            new CustomEvent("screenshare-ended", { detail: { producerId } }),
          );
        });
      } else {
        // Audio — tag it so RoomUI can route it correctly
        const stream = new MediaStream([consumer.track]);
        window.dispatchEvent(
          new CustomEvent("audio-stream", {
            detail: {
              producerId,
              stream,
              socketId: data.socketId,
              appData: data.appData,
            },
          }),
        );
      }
    };

    const init = async () => {
      if (initialisedRef.current) return;
      initialisedRef.current = true;
      try {
        const routerRtpCapabilities =
          await new Promise<mediasoupClient.types.RtpCapabilities>(
            (resolve, reject) => {
              socket.emit(
                "getRouterRtpCapabilities",
                { roomId },
                (data: any) => {
                  if (data?.error) return reject(new Error(data.error));
                  resolve(data);
                },
              );
            },
          );
        if (cancelled) return;

        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities });
        deviceRef.current = device;

        const sendOptions = await new Promise<any>((resolve, reject) => {
          socket.emit(
            "createWebRtcTransport",
            { roomId, direction: "send" },
            (data: any) => {
              if (data?.error) return reject(new Error(data.error));
              resolve(data);
            },
          );
        });
        if (cancelled) return;

        const sendTransport = device.createSendTransport(sendOptions);
        sendTransportRef.current = sendTransport;

        sendTransport.on("connect", ({ dtlsParameters }, callback) => {
          socket.emit(
            "connectTransport",
            { roomId, transportId: sendTransport.id, dtlsParameters },
            () => callback(),
          );
        });
        sendTransport.on(
          "produce",
          ({ kind, rtpParameters, appData }, callback) => {
            socket.emit(
              "produce",
              {
                roomId,
                transportId: sendTransport.id,
                kind,
                rtpParameters,
                appData,
              },
              ({ id }: { id: string }) => callback({ id }),
            );
          },
        );

        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        localStreamRef.current = micStream;
        if (cancelled) {
          micStream.getTracks().forEach((t) => t.stop());
          return;
        }

        const audioProducer = await sendTransport.produce({
          track: micStream.getAudioTracks()[0],
          appData: { type: "mic" },
        });
        audioProducerRef.current = audioProducer;

        const recvOptions = await new Promise<any>((resolve, reject) => {
          socket.emit(
            "createWebRtcTransport",
            { roomId, direction: "recv" },
            (data: any) => {
              if (data?.error) return reject(new Error(data.error));
              resolve(data);
            },
          );
        });
        if (cancelled) return;

        const recvTransport = device.createRecvTransport(recvOptions);
        recvTransportRef.current = recvTransport;
        recvTransport.on("connect", ({ dtlsParameters }, callback) => {
          socket.emit(
            "connectTransport",
            { roomId, transportId: recvTransport.id, dtlsParameters },
            () => callback(),
          );
        });

        const existingProducers = await new Promise<{ producerId: string }[]>(
          (resolve) => {
            socket.emit("getProducers", { roomId }, (data: any) =>
              resolve(data ?? []),
            );
          },
        );

        for (const { producerId } of existingProducers) {
          if (cancelled) return;
          await consume(producerId, device, recvTransport);
        }

        socket.on("newProducer", async ({ producerId }) => {
          if (cancelled) return;
          await consume(producerId, device, recvTransport);
        });
      } catch (err) {
        console.error("[mediasoup] init error:", err);
        initialisedRef.current = false;
      }
    };

    init();

    return () => {
      cancelled = true;
      initialisedRef.current = false;
      socket.off("newProducer");
      screenAudioProducerRef.current?.close();
      screenAudioProducerRef.current = null;
      screenProducerRef.current?.close();
      screenProducerRef.current = null;
      audioProducerRef.current?.close();
      audioProducerRef.current = null;
      sendTransportRef.current?.close();
      sendTransportRef.current = null;
      recvTransportRef.current?.close();
      recvTransportRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      deviceRef.current = null;
    };
  }, [roomId]);

  const mute = useCallback(() => {
    audioProducerRef.current?.pause();
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = false));
  }, []);

  const unmute = useCallback(() => {
    audioProducerRef.current?.resume();
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
  }, []);

  const stopScreenShare = useCallback(() => {
    screenAudioProducerRef.current?.close();
    screenAudioProducerRef.current = null;
    screenProducerRef.current?.close();
    screenProducerRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
  }, []);

  const startScreenShare = useCallback(
    async (quality: ScreenShareQuality, onStopped?: () => void) => {
      const sendTransport = sendTransportRef.current;
      const device = deviceRef.current;
      if (!sendTransport || !device || !roomId) return null;
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: quality.width },
            height: { ideal: quality.height },
            frameRate: { ideal: quality.frameRate },
          },
          audio: true, // Request system/tab audio too
        });

        screenStreamRef.current = screenStream;
        const videoTrack = screenStream.getVideoTracks()[0];

        const screenProducer = await sendTransport.produce({
          track: videoTrack,
          appData: { type: "screen" },
        });
        screenProducerRef.current = screenProducer;

        // Produce system audio separately if user allowed it
        const audioTracks = screenStream.getAudioTracks();
        if (audioTracks.length > 0) {
          const screenAudioProducer = await sendTransport.produce({
            track: audioTracks[0],
            appData: { type: "screen-audio" },
          });
          screenAudioProducerRef.current = screenAudioProducer;
        }

        // Dispatch self-preview stream so sharer sees their own screen
        window.dispatchEvent(
          new CustomEvent("screenshare-stream", {
            detail: {
              producerId: screenProducer.id,
              stream: new MediaStream([videoTrack]),
              socketId: socket.id,
              isSelf: true,
            },
          }),
        );

        videoTrack.onended = () => {
          stopScreenShare();
          onStopped?.();
        };

        return screenProducer;
      } catch (err: any) {
        if (err.name !== "NotAllowedError")
          console.error("[mediasoup] screen share error:", err);
        return null;
      }
    },
    [roomId, stopScreenShare],
  );

  return {
    mute,
    unmute,
    startScreenShare,
    stopScreenShare,
    audioProducerRef,
    screenProducerRef,
  };
}
