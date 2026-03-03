"use client";

import { useEffect, useRef } from "react";
import { Device } from "mediasoup-client";
import type {
    Device as MediasoupDevice,
    Transport,
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

type PeerTransportData = {
    routerRtpCapabilities: RtpCapabilities;
    sendTransportParams: TransportParams;
    recvTransportParams: TransportParams;
};

export function useMediasoup() {
    const { roomId, isInRoom } = useRoomStore();

    const deviceRef = useRef<MediasoupDevice | null>(null);
    const sendTransportRef = useRef<Transport | null>(null);
    const recvTransportRef = useRef<Transport | null>(null);

    useEffect(() => {
        if (!roomId || !isInRoom) return;

        async function init() {
            const transportData: PeerTransportData = await new Promise(
                (resolve, reject) => {
                    socket.emit(
                        "get-peer-transport-data",
                        roomId,
                        (response: PeerTransportData | { error: string }) => {
                            if ("error" in response) {
                                reject(response.error);
                            } else {
                                resolve(response);
                            }
                        },
                    );
                },
            );

            const device = new Device();
            await device.load({
                routerRtpCapabilities: transportData.routerRtpCapabilities,
            });

            deviceRef.current = device;

            const sendTransport = device.createSendTransport(
                transportData.sendTransportParams,
            );

            sendTransport.on(
                "connect",
                ({ dtlsParameters }, callback, errback) => {
                    socket.emit(
                        "connect-transport",
                        {
                            roomId,
                            transportId: sendTransport.id,
                            dtlsParameters,
                        },
                        (response: { error?: string }) => {
                            if (response?.error) {
                                errback(new Error(response.error));
                            } else {
                                callback();
                            }
                        },
                    );
                },
            );

            sendTransport.on(
                "produce",
                ({ kind, rtpParameters }, callback, errback) => {
                    socket.emit(
                        "produce",
                        {
                            roomId,
                            transportId: sendTransport.id,
                            kind,
                            rtpParameters,
                        },
                        (response: { id?: string; error?: string }) => {
                            if (response?.error) {
                                errback(new Error(response.error));
                            } else {
                                callback({ id: response.id! });
                            }
                        },
                    );
                },
            );

            sendTransportRef.current = sendTransport;

            const recvTransport = device.createRecvTransport(
                transportData.recvTransportParams,
            );

            recvTransport.on(
                "connect",
                ({ dtlsParameters }, callback, errback) => {
                    socket.emit(
                        "connect-transport",
                        {
                            roomId,
                            transportId: recvTransport.id,
                            dtlsParameters,
                        },
                        (response: { error?: string }) => {
                            if (response?.error) {
                                errback(new Error(response.error));
                            } else {
                                callback();
                            }
                        },
                    );
                },
            );

            recvTransportRef.current = recvTransport;
        }

        init();
    }, [roomId, isInRoom]);

    return {
        device: deviceRef,
        sendTransport: sendTransportRef,
        recvTransport: recvTransportRef,
    };
}
