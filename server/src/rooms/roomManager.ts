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
};

export type Room = {
    id: string;
    peers: Map<string, Peer>;
    mediasoupRouter: mediasoup.types.Router;
};

let rooms = new Map<string, Room>();

export async function createRoom(roomId: string, peer: Peer, sockerId: string) {
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
    };

    room.peers.set(sockerId, peer);

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
    };

    room.peers.set(socketId, peer);
    return room;
}

export function removeParticipant(socketId: string) {
    for (const [roomId, room] of rooms.entries()) {
        const peer = room.peers.get(socketId);

        if (peer) {
            peer.mediasoupSendTransport?.close();
            peer.mediasoupRecvTransport?.close();

            room.peers.delete(socketId);

            if (room.peers.size === 0) {
                room.mediasoupRouter.close();
                rooms.delete(roomId);
            }

            return room;
        }
    }
    return null;
}
