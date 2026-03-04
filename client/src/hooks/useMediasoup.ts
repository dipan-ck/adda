"use client";

import { useEffect, useRef } from "react";
import { Device } from "mediasoup-client";
import type {
    Device as MediasoupDevice,
    Transport,
    Producer,
    Consumer,
    RtpCapabilities,
} from "mediasoup-client/types";

import { socket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";

type TransportParams = {
    id: string;
    iceParameters: any;
    iceCandidates: any[];
    dtlsParameters: any;
};

type ExistingProducer = {
    producerId: string;
    appData: { type?: "screen" | "camera" | "audio"; userId?: string };
};

type PeerTransportData = {
    routerRtpCapabilities: RtpCapabilities;
    sendTransportParams: TransportParams;
    recvTransportParams: TransportParams;
    existingProducers: ExistingProducer[];
};

export type StreamQuality = "low" | "medium" | "high" | "ultra";

const QUALITY_PRESETS: Record<
    StreamQuality,
    { width: number; height: number; frameRate: number; maxBitrate: number }
> = {
    low: { width: 854, height: 480, frameRate: 15, maxBitrate: 800000 },
    medium: { width: 1280, height: 720, frameRate: 30, maxBitrate: 2500000 },
    high: { width: 1920, height: 1080, frameRate: 30, maxBitrate: 5000000 },
    ultra: { width: 1920, height: 1080, frameRate: 60, maxBitrate: 8000000 },
};

function buildScreenEncodings(quality: StreamQuality) {
    const { maxBitrate } = QUALITY_PRESETS[quality];
    return [
        {
            maxBitrate,
            maxFramerate: QUALITY_PRESETS[quality].frameRate,
            scaleResolutionDownBy: 1,
        },
    ];
}

function buildCameraEncodings() {
    return [
        {
            rid: "r0",
            maxBitrate: 300000,
            scaleResolutionDownBy: 4,
            scalabilityMode: "L1T3",
        },
        {
            rid: "r1",
            maxBitrate: 1200000,
            scaleResolutionDownBy: 2,
            scalabilityMode: "L1T3",
        },
        {
            rid: "r2",
            maxBitrate: 5000000,
            scaleResolutionDownBy: 1,
            scalabilityMode: "L1T3",
        },
    ];
}

export function useMediasoup() {
    const { roomId, isInRoom } = useRoomStore();
    const addVideoStream = useRoomStore((s) => s.addVideoStream);
    const removeVideoStream = useRoomStore((s) => s.removeVideoStream);

    const deviceRef = useRef<MediasoupDevice | null>(null);
    const sendTransportRef = useRef<Transport | null>(null);
    const recvTransportRef = useRef<Transport | null>(null);

    const producerRef = useRef<Producer | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const micGainNodeRef = useRef<GainNode | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);

    const consumersRef = useRef<Map<string, Consumer>>(new Map());
    const audioElemsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    const startedRef = useRef(false);

    const screenProducerRef = useRef<Producer | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const cameraProducerRef = useRef<Producer | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);

    async function buildMicPipeline(
        noiseCancel: boolean,
    ): Promise<MediaStreamTrack> {
        if (audioCtxRef.current) {
            await audioCtxRef.current.close();
            audioCtxRef.current = null;
        }

        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((t) => t.stop());
            micStreamRef.current = null;
        }

        const rawStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                noiseSuppression: noiseCancel,
                echoCancellation: noiseCancel,
                autoGainControl: noiseCancel,
            },
        });

        micStreamRef.current = rawStream;

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(rawStream);
        const gainNode = ctx.createGain();
        gainNode.gain.value = micGainNodeRef.current?.gain.value ?? 1;
        micGainNodeRef.current = gainNode;

        const dest = ctx.createMediaStreamDestination();

        source.connect(gainNode);
        gainNode.connect(dest);

        return dest.stream.getAudioTracks()[0];
    }

    async function startAudio() {
        if (!sendTransportRef.current || producerRef.current) return;

        const track = await buildMicPipeline(true);

        const producer = await sendTransportRef.current.produce({
            track,
            appData: { type: "audio" },
            disableTrackOnPause: true,
            zeroRtpOnPause: true,
        });

        producerRef.current = producer;
    }

    function resumeConsumerOnServer(consumerId: string): Promise<void> {
        return new Promise((resolve) => {
            socket.emit("resume-consumer", { consumerId }, () => resolve());
        });
    }

    async function consume(
        producerId: string,
        appData: { type?: string; userId?: string } = {},
    ) {
        const device = deviceRef.current;
        const recv = recvTransportRef.current;

        if (!device || !recv) return;

        const data = await new Promise<any>((resolve, reject) => {
            socket.emit(
                "consume",
                {
                    roomId,
                    producerId,
                    rtpCapabilities: device.recvRtpCapabilities,
                },
                (res: any) =>
                    res.error ? reject(new Error(res.error)) : resolve(res),
            );
        });

        const resolvedAppData = data.appData ?? appData;

        const consumer = await recv.consume({
            id: data.id,
            producerId,
            kind: data.kind,
            rtpParameters: data.rtpParameters,
            appData: resolvedAppData,
        });

        consumersRef.current.set(consumer.id, consumer);

        const stream = new MediaStream([consumer.track]);

        if (consumer.kind === "video") {
            try {
                await consumer.setPreferredLayers({
                    spatialLayer: 2,
                    temporalLayer: 2,
                });
            } catch {}
        }

        if (consumer.kind === "audio") {
            const audio = new Audio();
            audio.srcObject = stream;
            audio.autoplay = true;
            audio.volume = 1;

            audioElemsRef.current.set(consumer.id, audio);

            await resumeConsumerOnServer(consumer.id);
            await audio.play().catch(() => {});
        }

        if (consumer.kind === "video") {
            const isCamera = resolvedAppData.type === "camera";

            addVideoStream({
                stream,
                producerId,
                kind: isCamera ? "camera" : "screen",
                userId: isCamera ? resolvedAppData.userId : undefined,
            });

            await resumeConsumerOnServer(consumer.id);
        }

        consumer.on("transportclose", () => {
            consumersRef.current.delete(consumer.id);
            removeVideoStream(producerId);
        });

        consumer.on("producerclose", () => {
            consumer.close();
            consumersRef.current.delete(consumer.id);
            removeVideoStream(producerId);
        });
    }

    useEffect(() => {
        if (!roomId || !isInRoom || startedRef.current) return;
        startedRef.current = true;

        async function init() {
            const transportData: PeerTransportData = await new Promise(
                (resolve, reject) =>
                    socket.emit(
                        "get-peer-transport-data",
                        roomId,
                        (res: PeerTransportData | { error: string }) =>
                            "error" in res ? reject(res.error) : resolve(res),
                    ),
            );

            const device = new Device();

            await device.load({
                routerRtpCapabilities: transportData.routerRtpCapabilities,
            });

            deviceRef.current = device;

            const send = device.createSendTransport(
                transportData.sendTransportParams,
            );

            send.on("connect", ({ dtlsParameters }, cb, eb) => {
                socket.emit(
                    "connect-transport",
                    { roomId, transportId: send.id, dtlsParameters },
                    (r: any) => (r?.error ? eb(new Error(r.error)) : cb()),
                );
            });

            send.on("produce", ({ kind, rtpParameters, appData }, cb, eb) => {
                socket.emit(
                    "produce",
                    {
                        roomId,
                        transportId: send.id,
                        kind,
                        rtpParameters,
                        appData,
                    },
                    (r: any) =>
                        r?.error ? eb(new Error(r.error)) : cb({ id: r.id }),
                );
            });

            sendTransportRef.current = send;

            const recv = device.createRecvTransport(
                transportData.recvTransportParams,
            );

            recv.on("connect", ({ dtlsParameters }, cb, eb) => {
                socket.emit(
                    "connect-transport",
                    { roomId, transportId: recv.id, dtlsParameters },
                    (r: any) => (r?.error ? eb(new Error(r.error)) : cb()),
                );
            });

            recvTransportRef.current = recv;

            for (const {
                producerId,
                appData,
            } of transportData.existingProducers) {
                await consume(producerId, appData);
            }

            socket.on("new-producer", async ({ producerId, appData }) => {
                await consume(producerId, appData ?? {});
            });

            socket.on("producer-closed", ({ producerId }) => {
                removeVideoStream(producerId);
            });

            await startAudio();
        }

        init().catch(console.error);

        return () => {
            socket.off("new-producer");
            socket.off("producer-closed");
        };
    }, [roomId, isInRoom]);

    function mute() {
        producerRef.current?.pause();
    }

    function unmute() {
        producerRef.current?.resume();
    }

    function deafen() {
        consumersRef.current.forEach((c) => c.pause());
    }

    function undeafen() {
        consumersRef.current.forEach((c) => c.resume());
    }

    function setMicVolume(volume: number) {
        if (micGainNodeRef.current && audioCtxRef.current) {
            micGainNodeRef.current.gain.setValueAtTime(
                volume,
                audioCtxRef.current.currentTime,
            );
        }
    }

    function setSpeakerVolume(volume: number) {
        audioElemsRef.current.forEach((el) => {
            el.volume = volume;
        });
    }

    async function setNoiseCancellation(enabled: boolean) {
        const producer = producerRef.current;
        if (!producer) return;

        const newTrack = await buildMicPipeline(enabled);
        await producer.replaceTrack({ track: newTrack });
    }

    function stopScreenShare() {
        const producer = screenProducerRef.current;
        if (!producer) return;

        socket.emit("close-producer", { roomId, producerId: producer.id });

        producer.close();
        screenProducerRef.current = null;

        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;

        removeVideoStream(producer.id);
    }

    async function startScreenShare(quality: StreamQuality = "high") {
        if (!sendTransportRef.current || screenProducerRef.current) return;

        const preset = QUALITY_PRESETS[quality];

        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: { ideal: preset.width },
                height: { ideal: preset.height },
                frameRate: { ideal: preset.frameRate },
            },
            audio: false,
        });

        screenStreamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];

        const producer = await sendTransportRef.current.produce({
            track: videoTrack,
            encodings: buildScreenEncodings(quality),
            appData: { type: "screen" },
        });

        screenProducerRef.current = producer;

        addVideoStream({
            stream: new MediaStream([videoTrack]),
            producerId: producer.id,
            kind: "screen",
        });

        videoTrack.onended = () => stopScreenShare();
    }

    async function changeStreamQuality(quality: StreamQuality) {
        const track = screenStreamRef.current?.getVideoTracks()[0];
        if (!track) return;

        const preset = QUALITY_PRESETS[quality];

        await track.applyConstraints({
            width: { ideal: preset.width },
            height: { ideal: preset.height },
            frameRate: { ideal: preset.frameRate },
        });
    }

    function stopCameraShare() {
        const producer = cameraProducerRef.current;
        if (!producer) return;

        socket.emit("close-producer", { roomId, producerId: producer.id });

        producer.close();
        cameraProducerRef.current = null;

        cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;

        const selfUserId = useRoomStore.getState().selfUserId;

        if (selfUserId) {
            useRoomStore.getState().removeCameraByUserId(selfUserId);
        }

        removeVideoStream(producer.id);
    }

    async function startCameraShare() {
        if (!sendTransportRef.current || cameraProducerRef.current) return;

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                facingMode: "user",
            },
        });

        cameraStreamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];

        const selfUserId = useRoomStore.getState().selfUserId;

        const producer = await sendTransportRef.current.produce({
            track: videoTrack,
            encodings: buildCameraEncodings(),
            appData: { type: "camera", userId: selfUserId },
        });

        cameraProducerRef.current = producer;

        addVideoStream({
            stream: new MediaStream([videoTrack]),
            producerId: producer.id,
            kind: "camera",
            userId: selfUserId ?? undefined,
        });

        videoTrack.onended = () => stopCameraShare();
    }

    return {
        startAudio,
        startScreenShare,
        stopScreenShare,
        changeStreamQuality,
        startCameraShare,
        stopCameraShare,
        setMicVolume,
        setSpeakerVolume,
        setNoiseCancellation,
        mute,
        unmute,
        deafen,
        undeafen,
        isScreenSharing: () => !!screenProducerRef.current,
        isCameraSharing: () => !!cameraProducerRef.current,
    };
}
