import { Server } from "socket.io";
import {
    createRoom,
    getRoom,
    addParticipant,
    removeParticipant,
} from "../rooms/roomManager";

export function registerSocketHandlers(io: Server) {
    io.on("connection", (socket) => {
        socket.on("create-room", async (user, callback) => {
            const roomId = crypto.randomUUID().slice(0, 8);

            const room = await createRoom(roomId, user, socket.id);

            socket.join(roomId);

            callback({ roomId });

            io.to(roomId).emit(
                "room-participants",
                Array.from(room.peers.values()),
            );
        });

        socket.on("join-room", ({ roomId, user }, callback) => {
            const room = getRoom(roomId);
            if (!room) return callback({ error: "Room not found" });

            addParticipant(roomId, user, socket.id);

            socket.join(roomId);

            callback({ success: true });

            io.to(roomId).emit(
                "room-participants",
                Array.from(room.peers.values()),
            );
        });

        socket.on("disconnect", () => {
            const room = removeParticipant(socket.id);

            if (room) {
                io.to(room.id).emit(
                    "room-participants",
                    Array.from(room.peers.values()),
                );
            }
        });

        socket.on("get-peer-transport-data", (roomId, callback) => {
            const room = getRoom(roomId);
            if (!room) return callback({ error: "Room not found" });

            const peer = room.peers.get(socket.id);
            if (!peer) return callback({ error: "Peer not found" });

            callback({
                routerRtpCapabilities: room.mediasoupRouter.rtpCapabilities,
                sendTransportParams: peer.mediasoupSendTransportParams,
                recvTransportParams: peer.mediasoupRecvTransportParams,
            });
        });

        socket.on(
            "connect-transport",
            async ({ roomId, transportId, dtlsParameters }, callback) => {
                const room = getRoom(roomId);
                if (!room) return callback({ error: "Room not found" });

                const peer = room.peers.get(socket.id);
                if (!peer) return callback({ error: "Peer not found" });

                let transport;

                //getting the transports of the user and connecting the dtls paramerets
                if (peer.mediasoupSendTransport.id === transportId) {
                    transport = peer.mediasoupSendTransport;
                } else if (peer.mediasoupRecvTransport.id === transportId) {
                    transport = peer.mediasoupRecvTransport;
                }

                if (!transport) {
                    return callback({ error: "Transport not found" });
                }

                await transport.connect({ dtlsParameters });

                callback({});
            },
        );

        socket.on(
            "produce",
            async ({ roomId, transportId, kind, rtpParameters }, callback) => {
                const room = getRoom(roomId);
                if (!room) return callback({ error: "Room not found" });

                const peer = room.peers.get(socket.id);
                if (!peer) return callback({ error: "Peer not found" });

                let transport;

                if (peer.mediasoupSendTransport.id === transportId) {
                    transport = peer.mediasoupSendTransport;
                }

                if (!transport) {
                    return callback({ error: "Transport not found" });
                }

                const producer = await transport.produce({
                    kind,
                    rtpParameters,
                });

                peer.producers.set(producer.id, producer);

                producer.on("transportclose", () => {
                    peer.producers.delete(producer.id);
                });

                producer.on("@close", () => {
                    peer.producers.delete(producer.id);
                });

                callback({ id: producer.id });
            },
        );
    });
}
