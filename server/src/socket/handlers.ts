import { Server } from "socket.io";
import {
  createRoom,
  getRoom,
  addParticipant,
  removeParticipant,
} from "../rooms/roomManager";
import { Participant } from "../rooms/roomManager";
import { createMediasoupWebRtcTransport } from "../mediasoup/transport";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("create-room", async (user, callback) => {
      const roomId = crypto.randomUUID().slice(0, 8);

      const participant: Participant = {
        socketId: socket.id,
        ...user,
      };

      const room = await createRoom(roomId, participant);

      socket.join(roomId);

      callback({ roomId });

      io.to(roomId).emit(
        "room-participants",
        Array.from(room.participants.values()),
      );
    });

    socket.on("join-room", ({ roomId, user }, callback) => {
      const room = getRoom(roomId);
      if (!room) return callback({ error: "Room not found" });

      const participant: Participant = {
        socketId: socket.id,
        ...user,
      };

      addParticipant(roomId, participant);

      socket.join(roomId);

      callback({ success: true });

      io.to(roomId).emit(
        "room-participants",
        Array.from(room.participants.values()),
      );
    });

    socket.on("disconnect", () => {
      const room = removeParticipant(socket.id);

      if (room) {
        io.to(room.id).emit(
          "room-participants",
          Array.from(room.participants.values()),
        );
      }
    });

    socket.on("getRouterRtpCapabilities", ({ roomId }, callback) => {
      const room = getRoom(roomId);
      if (!room) return callback({ error: "Room not found" });

      callback(room.mediasoupRouter.rtpCapabilities); //sending the router capabilities
    });

    socket.on(
      "createWebRtcTransport",
      async ({ roomId, direction }, callback) => {
        const room = getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const transport = await createMediasoupWebRtcTransport(
          room.mediasoupRouter,
        );

        let peer = room.peers.get(socket.id);

        if (!peer) {
          peer = {
            socketId: socket.id,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
          };
          room.peers.set(socket.id, peer);
        }
        (transport as any)._direction = direction;
        peer.transports.set(transport.id, transport);

        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      },
    );

    socket.on(
      "connectTransport",
      async ({ roomId, transportId, dtlsParameters }, callback) => {
        const room = getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const peer = room.peers.get(socket.id);
        if (!peer) return callback({ error: "Peer not found" });

        const transport = peer.transports.get(transportId);
        if (!transport) return callback({ error: "Transport not found" });

        await transport.connect({ dtlsParameters });

        callback({ connected: true });
      },
    );

    socket.on("getProducers", ({ roomId }, callback) => {
      const room = getRoom(roomId);
      if (!room) return callback([]);

      const producers: { producerId: string }[] = [];
      for (const [peerId, peer] of room.peers.entries()) {
        if (peerId === socket.id) continue; // skip self
        for (const producerId of peer.producers.keys()) {
          producers.push({ producerId });
        }
      }
      callback(producers);
    });

    socket.on(
      "produce",
      async (
        { roomId, transportId, kind, rtpParameters, appData },
        callback,
      ) => {
        const room = getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const peer = room.peers.get(socket.id);
        if (!peer) return callback({ error: "Peer not found" });

        const transport = peer.transports.get(transportId);
        if (!transport) return callback({ error: "Transport not found" });

        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData,
        });
        peer.producers.set(producer.id, producer);
        socket.to(roomId).emit("newProducer", {
          producerId: producer.id,
          socketId: socket.id,
        });
        callback({ id: producer.id });
      },
    );

    socket.on(
      "consume",
      async ({ roomId, producerId, rtpCapabilities }, callback) => {
        const room = getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const peer = room.peers.get(socket.id);
        if (!peer) return callback({ error: "Peer not found" });

        const transport = Array.from(peer.transports.values()).find(
          (t) => (t as any)._direction === "recv",
        );
        if (!transport) return callback({ error: "No recv transport" });

        if (!room.mediasoupRouter.canConsume({ producerId, rtpCapabilities })) {
          return callback({ error: "Cannot consume this producer" });
        }

        const consumer = await transport.consume({
          producerId,
          rtpCapabilities,
          paused: false,
        });

        peer.consumers.set(consumer.id, consumer);
        consumer.on("transportclose", () => consumer.close());
        consumer.on("producerclose", () => consumer.close());

        // Find who owns this producer
        let producerSocketId = "";
        for (const [peerId, p] of room.peers.entries()) {
          if (p.producers.has(producerId)) {
            producerSocketId = peerId;
            break;
          }
        }

        callback({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          socketId: producerSocketId, // ← was missing
          appData: consumer.appData,
        });
      },
    );

    socket.on("resumeConsumer", async ({ roomId, consumerId }, callback) => {
      const room = getRoom(roomId);
      if (!room) return callback({ error: "Room not found" });

      const peer = room.peers.get(socket.id);
      if (!peer) return callback({ error: "Peer not found" });

      const consumer = peer.consumers.get(consumerId);
      if (!consumer) return callback({ error: "Consumer not found" });

      await consumer.resume();

      callback({ resumed: true });
    });
  });
}
