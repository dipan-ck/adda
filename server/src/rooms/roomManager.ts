import { Socket } from "socket.io";
import * as mediasoup from "mediasoup";
import { create_mediasoup_router } from "../mediasoup/router";
import { create_mediasoup_WebRtcTransport } from "../mediasoup/transport";

import { log } from "console";

export type User = {
  userId: string;
  username: string;
  avatarUrl: string;
};

export type Peer = {
  userId: string;
  username: string;
  avatarUrl: string;

  mediasoupSendTransport: mediasoup.types.WebRtcTransport;
  mediasoupRecvTransport: mediasoup.types.WebRtcTransport;

  mediasoupSendTransportParams: any;
  mediasoupRecvTransportParams: any;

  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
};

type Room = {
  id: string;
  peers: Map<string, Peer>;
  mediasoupRouter: mediasoup.types.Router;
};

let Rooms = new Map<string, Room>();

export function get_room(roomId: string): Room | null {
  if (Rooms.has(roomId)) {
    return Rooms.get(roomId)!;
  }

  return null;
}

export function get_room_peers(roomId: string): User[] {
  let peers: User[] = [];

  let room = Rooms.get(roomId);
  if (room) {
    for (let peer of room.peers.values()) {
      peers.push({
        userId: peer.userId,
        username: peer.username,
        avatarUrl: peer.avatarUrl,
      });
    }
  }

  return peers;
}

export function get_peer(room: Room, socket: Socket): Peer | null {
  if (room) {
    return room.peers.get(socket.id) ?? null;
  }

  return null;
}

export async function create_room(socket: Socket, user: User) {
  let room: Room = {
    id: crypto.randomUUID().toString().slice(0, 8),
    peers: new Map(),
    mediasoupRouter: await create_mediasoup_router(),
  };

  let { transport: sendTransport, params: sendParams } =
    await create_mediasoup_WebRtcTransport(room.mediasoupRouter);

  let { transport: recvTransport, params: recvParams } =
    await create_mediasoup_WebRtcTransport(room.mediasoupRouter);

  let peer = {
    ...user,
    mediasoupSendTransport: sendTransport,
    mediasoupRecvTransport: recvTransport,
    mediasoupSendTransportParams: sendParams,
    mediasoupRecvTransportParams: recvParams,

    producers: new Map(),
    consumers: new Map(),
  };

  room.peers.set(socket.id, peer);
  Rooms.set(room.id, room);

  log("Room created ID: ", room.id);

  return room;
}

export async function add_peer_to_room(
  roomId: string,
  user: User,
  socket: Socket,
) {
  const room = Rooms.get(roomId.trim());

  if (!room) {
    return null;
  }

  let { transport: sendTransport, params: sendParams } =
    await create_mediasoup_WebRtcTransport(room.mediasoupRouter);

  let { transport: recvTransport, params: recvParams } =
    await create_mediasoup_WebRtcTransport(room.mediasoupRouter);

  let peer = {
    ...user,
    mediasoupSendTransport: sendTransport,
    mediasoupRecvTransport: recvTransport,
    mediasoupSendTransportParams: sendParams,
    mediasoupRecvTransportParams: recvParams,

    producers: new Map(),
    consumers: new Map(),
  };

  room.peers.set(socket.id, peer);
  return room;
}

export function remove_peer_from_room(socket: Socket): Room | null {
  for (const [, room] of Rooms) {
    if (room.peers.has(socket.id)) {
      room.peers.delete(socket.id);

      if (room.peers.size === 0) {
        Rooms.delete(room.id);
        log("Room deleted ID: ", room.id);
      }

      return room;
    }
  }

  return null;
}

export function get_router_capabilities(
  room: Room,
  peer: Peer,
  socket: Socket,
) {
  return {
    routerRtpCapabilities: room.mediasoupRouter.rtpCapabilities,
    sendTransportParams: peer?.mediasoupSendTransportParams,
    recvTransportParams: peer?.mediasoupRecvTransportParams,
  };
}

export async function connect_trasport(
  peer: Peer,
  dtlsParameters: any,
  transportId: string,
) {
  let transport;

  if (transportId == peer.mediasoupSendTransport.id) {
    transport = peer.mediasoupSendTransport;
  } else {
    transport = peer.mediasoupRecvTransport;
  }

  await transport.connect({ dtlsParameters });
}

export async function create_producer(
  roomId: string,
  socket: Socket,
  peer: Peer,
  kind: any,
  rtpParameters: any,
  appData: any,
) {
  const producer = await peer.mediasoupSendTransport.produce({
    kind,
    rtpParameters,
    appData: appData ?? {},
  });

  peer.producers.set(producer.id, producer);

  socket.to(roomId).emit("new-producer", {
    producerId: producer.id,
    appData: producer.appData,
  });

  const onClose = () => {
    peer.producers.delete(producer.id);

    socket.to(roomId).emit("producer-closed", {
      producerId: producer.id,
    });
  };

  producer.on("transportclose", onClose);
  producer.on("@close", onClose);

  return producer;
}

export function get_existing_producers_list(roomId: string, socketId: string) {
  const room = get_room(roomId);
  if (!room) return [];

  const producers = [];

  for (const [peerSocketId, peer] of room.peers) {
    if (peerSocketId === socketId) continue; // skip own producers

    for (const producer of peer.producers.values()) {
      producers.push(producer);
    }
  }

  return producers;
}

export function can_consume(
  room: Room,
  producerId: string,
  rtpCapabilities: any,
): boolean {
  const router = room.mediasoupRouter;

  if (!router.canConsume({ producerId, rtpCapabilities })) {
    return false;
  }

  return true;
}

export async function create_consumer(
  peer: Peer,
  producerId: string,
  rtpCapabilities: any,
  socket: Socket,
) {
  const consumer = await peer.mediasoupRecvTransport.consume({
    producerId,
    rtpCapabilities,
    paused: true,
  });

  peer.consumers.set(consumer.id, consumer);

  consumer.on("transportclose", () => {
    peer.consumers.delete(consumer.id);
  });

  consumer.on("@close", () => {
    peer.consumers.delete(consumer.id);
  });

  return consumer;
}

export function find_peer_consumer(consumerId: string, socket: Socket) {
  for (const [_, room] of Rooms) {
    const peer = room.peers.get(socket.id);

    if (peer && peer.consumers.has(consumerId)) {
      return peer.consumers.get(consumerId);
    }
  }
}

export function get_producer(peer: Peer, producerId: string) {
  return peer.producers.get(producerId);
}
