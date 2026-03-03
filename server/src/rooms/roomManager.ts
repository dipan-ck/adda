import * as mediasoup from "mediasoup";
import { createMediasoupRouter } from "../mediasoup/router";

export type Peer = {
  socketId: string;
  transports: Map<string, mediasoup.types.WebRtcTransport>;
  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
};

export type Participant = {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string;
};

export type Room = {
  id: string;
  participants: Map<string, Participant>;
  mediasoupRouter: mediasoup.types.Router;
  peers: Map<string, Peer>;
};

let rooms = new Map<string, Room>();

export async function createRoom(roomId: string, participant: Participant) {
  const room: Room = {
    id: roomId,
    participants: new Map([[participant.socketId, participant]]),
    mediasoupRouter: await createMediasoupRouter(), //creating one router for  each room
    peers: new Map(),
  };

  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string) {
  return rooms.get(roomId);
}

export function addParticipant(roomId: string, participant: Participant) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.participants.set(participant.socketId, participant);
  return room;
}

export function removeParticipant(socketId: string) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.participants.has(socketId)) {
      room.participants.delete(socketId); // mutates first

      if (room.participants.size === 0) {
        rooms.delete(roomId);
        return room; // returns deleted room — io.to(room.id) has no members!
      }

      return room; // ✅ only correct path
    }
  }
  return null;
}
