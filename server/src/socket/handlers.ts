import { Server } from "socket.io";
import {
    add_peer_to_room,
    can_consume,
    connect_trasport,
    create_consumer,
    create_producer,
    create_room,
    find_peer_consumer,
    get_existing_producers_list,
    get_peer,
    get_room,
    get_router_capabilities,
    remove_peer_from_room,
    User,
} from "../rooms/roomManager";

export async function register_socket_handlers(io: Server) {
    io.on("connection", (socket) => {
        socket.on("create-room", async (user: User, callback) => {
            const room = await create_room(socket, user);

            socket.join(room.id);

            callback({ roomId: room.id });
        });

        socket.on(
            "join-room",
            async (
                { roomId, user }: { roomId: string; user: User },
                callback,
            ) => {
                const room = await add_peer_to_room(roomId, user, socket);

                if (!room) {
                    return callback({ error: "Room not found" });
                }

                socket.join(room.id);
                callback({ roomId: room.id });
            },
        );

        socket.on("get-router-capabilities", (roomId, callback) => {
            let room = get_room(roomId);

            if (!room) {
                return callback({ error: "Room not found" });
            }

            let peer = get_peer(room, socket);

            if (!peer) {
                return callback({ error: "Peer not found" });
            }

            const params = get_router_capabilities(room, peer, socket);
            callback(params);
        });

        socket.on(
            "connect-transport",
            async (roomId, transportId, dtlsParameters, callback) => {
                let room = get_room(roomId);

                if (!room) {
                    return callback({ error: "Room not found" });
                }

                let peer = get_peer(room, socket);

                if (!peer) {
                    return callback({ error: "Peer not found" });
                }

                await connect_trasport(peer, dtlsParameters, transportId);

                callback({});
            },
        );

        socket.on(
            "produce",
            async (
                { roomId, transportId, kind, rtpParameters, appData },
                callback,
            ) => {
                let room = get_room(roomId);

                if (!room) {
                    return callback({ error: "Room not found" });
                }

                let peer = get_peer(room, socket);

                if (!peer) {
                    return callback({ error: "Peer not found" });
                }

                if (peer.mediasoupSendTransport.id !== transportId) {
                    return callback({ error: "Transport not found" });
                }

                let producer = await create_producer(
                    roomId,
                    socket,
                    peer,
                    kind,
                    rtpParameters,
                    appData,
                );

                callback({ id: producer.id });
            },
        );

        socket.on("get-existing-producers", (roomId, callback) => {
            const room = get_room(roomId);
            if (!room) return;

            const existingProducers = get_existing_producers_list(roomId);
            callback({ producers: existingProducers.map((p) => p.id) });
        });

        socket.on(
            "close-producer",
            (
                {
                    roomId,
                    producerId,
                }: {
                    roomId: string;
                    producerId: string;
                },
                callback,
            ) => {
                const room = get_room(roomId);
                if (!room) return;

                let peer = get_peer(room, socket);

                if (!peer) {
                    return callback({ error: "Peer not found" });
                }

                const producer = peer.producers.get(producerId);
                if (!producer) return;

                producer.close();
            },
        );

        socket.on(
            "consume",
            async ({ roomId, producerId, rtpCapabilities }, callback) => {
                let room = get_room(roomId);

                if (!room) {
                    return callback({ error: "Room not found" });
                }

                let peer = get_peer(room, socket);

                if (!peer) {
                    return callback({ error: "Peer not found" });
                }

                if (!can_consume(room, producerId, rtpCapabilities)) {
                    return callback({ error: "Cannot consume" });
                }

                const consumer = await create_consumer(
                    peer,
                    producerId,
                    rtpCapabilities,
                );
                callback({
                    id: consumer.id,
                    producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                });
            },
        );

        socket.on(
            "resume-consumer",
            async (
                { consumerId }: { consumerId: string },
                callback: (res: any) => void,
            ) => {
                const consumer = find_peer_consumer(consumerId, socket);

                if (!consumer) {
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

        socket.on("disconnect", () => {
            remove_peer_from_room(socket);
        });
    });
}
