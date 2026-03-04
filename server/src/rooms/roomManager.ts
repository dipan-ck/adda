import * as mediasoup from "mediasoup";
import { createMediasoupRouter } from "../mediasoup/router";
import { createMediasoupWebRtcTransport } from "../mediasoup/transport";

export type Peer = {
    userId: string;
    username: string;
    avatarUrl: string;
    mediasoupSendTransport: mediasoup.types.WebRtcTransport;
    mediasoupRecvTransport: mediasoup.types.WebRtcTransport;
    mediasoupSendTransportParams: any;
    mediasoupRecvTransportParams: any;
    producers: Map<string, mediasoup.types.Producer>;
    // consumers keyed by consumerId — needed for server-side resume
    consumers: Map<string, mediasoup.types.Consumer>;
};

export type Room = {
    id: string;
    peers: Map<string, Peer>;
    mediasoupRouter: mediasoup.types.Router;
};

let rooms = new Map<string, Room>();

export async function createRoom(roomId: string, peer: Peer, socketId: string) {
    const room: Room = {
        id: roomId,
        peers: new Map(),
        mediasoupRouter: await createMediasoupRouter(),
    };

    const send = await createMediasoupWebRtcTransport(room.mediasoupRouter);
    const recv = await createMediasoupWebRtcTransport(room.mediasoupRouter);

    peer = {
        ...peer,
        mediasoupSendTransport: send.transport,
        mediasoupRecvTransport: recv.transport,
        mediasoupSendTransportParams: send.params,
        mediasoupRecvTransportParams: recv.params,
        producers: new Map(),
        consumers: new Map(),
    };

    room.peers.set(socketId, peer);
    rooms.set(roomId, room);
    return room;
}

export function getRoom(roomId: string) {
    return rooms.get(roomId);
}

export async function addParticipant(
    roomId: string,
    peer: Peer,
    socketId: string,
) {
    const room = rooms.get(roomId);
    if (!room) return null;

    const send = await createMediasoupWebRtcTransport(room.mediasoupRouter);
    const recv = await createMediasoupWebRtcTransport(room.mediasoupRouter);

    peer = {
        ...peer,
        mediasoupSendTransport: send.transport,
        mediasoupRecvTransport: recv.transport,
        mediasoupSendTransportParams: send.params,
        mediasoupRecvTransportParams: recv.params,
        producers: new Map(),
        consumers: new Map(),
    };

    room.peers.set(socketId, peer);
    return room;
}

export function removeParticipant(socketId: string) {
    for (const [, room] of rooms.entries()) {
        const peer = room.peers.get(socketId);
        if (peer) {
            peer.mediasoupSendTransport?.close();
            peer.mediasoupRecvTransport?.close();
            room.peers.delete(socketId);
            if (room.peers.size === 0) {
                room.mediasoupRouter.close();
                rooms.delete(room.id);
            }
            return room;
        }
    }
    return null;
}

export function getRoomParticipants(room: Room) {
    return Array.from(room.peers.values()).map((peer) => ({
        userId: peer.userId,
        username: peer.username,
        avatarUrl: peer.avatarUrl,
    }));
}

export function findPeerConsumer(
    socketId: string,
    consumerId: string,
): mediasoup.types.Consumer | null {
    for (const room of rooms.values()) {
        const peer = room.peers.get(socketId);
        if (peer) {
            const consumer = peer.consumers.get(consumerId);
            if (consumer) return consumer;
        }
    }
    return null;
}
