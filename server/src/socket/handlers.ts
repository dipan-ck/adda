import { Server } from "socket.io";
import {
    createRoom,
    getRoom,
    addParticipant,
    removeParticipant,
    getRoomParticipants,
    findPeerConsumer,
} from "../rooms/roomManager";

export function registerSocketHandlers(io: Server) {
    io.on("connection", (socket) => {
        /* ──────────────────────────────── ROOM ──────────────────────────────── */

        socket.on("create-room", async (user, callback) => {
            const roomId = crypto.randomUUID().slice(0, 8);
            const room = await createRoom(roomId, user, socket.id);
            socket.join(roomId);
            callback({ roomId });
            io.to(roomId).emit("room-participants", getRoomParticipants(room));
        });

        socket.on("join-room", async ({ roomId, user }, callback) => {
            const room = getRoom(roomId);
            if (!room) return callback({ error: "Room not found" });

            await addParticipant(roomId, user, socket.id);
            socket.join(roomId);
            callback({ success: true });

            const updatedRoom = getRoom(roomId)!;
            io.to(roomId).emit(
                "room-participants",
                getRoomParticipants(updatedRoom),
            );
        });

        socket.on("disconnect", () => {
            const room = removeParticipant(socket.id);
            if (room) {
                io.to(room.id).emit(
                    "room-participants",
                    getRoomParticipants(room),
                );
            }
        });

        /* ─────────────────────────── TRANSPORT ──────────────────────────────── */

        socket.on("get-peer-transport-data", (roomId, callback) => {
            const room = getRoom(roomId);
            if (!room) return callback({ error: "Room not found" });

            const peer = room.peers.get(socket.id);
            if (!peer) return callback({ error: "Peer not found" });

            const existingProducers: { producerId: string; appData: any }[] =
                [];
            room.peers.forEach((otherPeer, otherSocketId) => {
                if (otherSocketId !== socket.id) {
                    otherPeer.producers.forEach((producer) => {
                        existingProducers.push({
                            producerId: producer.id,
                            appData: producer.appData ?? {},
                        });
                    });
                }
            });

            callback({
                routerRtpCapabilities: room.mediasoupRouter.rtpCapabilities,
                sendTransportParams: peer.mediasoupSendTransportParams,
                recvTransportParams: peer.mediasoupRecvTransportParams,
                existingProducers,
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
                if (peer.mediasoupSendTransport.id === transportId) {
                    transport = peer.mediasoupSendTransport;
                } else if (peer.mediasoupRecvTransport.id === transportId) {
                    transport = peer.mediasoupRecvTransport;
                }

                if (!transport)
                    return callback({ error: "Transport not found" });

                await transport.connect({ dtlsParameters });
                callback({});
            },
        );

        /* ──────────────────────────── PRODUCE ───────────────────────────────── */

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

                if (peer.mediasoupSendTransport.id !== transportId) {
                    return callback({ error: "Transport not found" });
                }

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
                    socket
                        .to(roomId)
                        .emit("producer-closed", { producerId: producer.id });
                };

                producer.on("transportclose", onClose);
                producer.on("@close", onClose);

                producer.observer.on("pause", () => {
                    socket
                        .to(roomId)
                        .emit("producer-paused", { producerId: producer.id });
                });
                producer.observer.on("resume", () => {
                    socket
                        .to(roomId)
                        .emit("producer-resumed", { producerId: producer.id });
                });

                callback({ id: producer.id });
            },
        );

        /* ────────────────────────── CLOSE PRODUCER ──────────────────────────── */

        socket.on(
            "close-producer",
            ({
                roomId,
                producerId,
            }: {
                roomId: string;
                producerId: string;
            }) => {
                const room = getRoom(roomId);
                if (!room) return;

                const peer = room.peers.get(socket.id);
                if (!peer) return;

                const producer = peer.producers.get(producerId);
                if (!producer) return;

                // Triggers '@close' listener → deletes + emits producer-closed
                producer.close();
            },
        );

        /* ──────────────────────────── CONSUME ───────────────────────────────── */

        socket.on(
            "consume",
            async ({ roomId, producerId, rtpCapabilities }, callback) => {
                const room = getRoom(roomId);
                if (!room) return callback({ error: "Room not found" });

                const peer = room.peers.get(socket.id);
                if (!peer) return callback({ error: "Peer not found" });

                const router = room.mediasoupRouter;

                if (!router.canConsume({ producerId, rtpCapabilities })) {
                    return callback({ error: "Cannot consume" });
                }

                // Create PAUSED. The client will call "resume-consumer" only after
                // it has attached the track to a <video> element. This is the
                // correct fix for the black-screen / keyframe race condition.
                const consumer = await peer.mediasoupRecvTransport.consume({
                    producerId,
                    rtpCapabilities,
                    paused: true,
                });

                // Store consumer on the peer so resume-consumer can find it
                peer.consumers.set(consumer.id, consumer);

                consumer.on("transportclose", () =>
                    peer.consumers.delete(consumer.id),
                );
                consumer.on("@close", () => peer.consumers.delete(consumer.id));

                // Forward producer's appData (screen vs camera, userId, etc.)
                let producerAppData: any = {};
                room.peers.forEach((otherPeer) => {
                    const prod = otherPeer.producers.get(producerId);
                    if (prod) producerAppData = prod.appData ?? {};
                });

                callback({
                    id: consumer.id,
                    producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                    appData: producerAppData,
                });
            },
        );

        /* ────────────────────────── RESUME CONSUMER ─────────────────────────── */

        // Called by the client AFTER it has attached stream.srcObject to a video
        // element and the element has begun rendering. Only then do we resume the
        // server-side consumer and request a keyframe from the producer.
        socket.on(
            "resume-consumer",
            async (
                { consumerId }: { consumerId: string },
                callback: (res: any) => void,
            ) => {
                const consumer = findPeerConsumer(socket.id, consumerId);

                if (!consumer) {
                    // Consumer may have already been closed — not a fatal error
                    return callback({ error: "Consumer not found" });
                }

                try {
                    await consumer.resume();
                    callback({});
                } catch (err) {
                    console.error("resume-consumer error:", err);
                    callback({ error: "Failed to resume consumer" });
                }
            },
        );
    });
}
