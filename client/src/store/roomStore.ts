"use client";
import { create } from "zustand";

export type Participant = {
    userId: string;
    username: string;
    avatarUrl: string;
};

export type VideoStream = {
    stream: MediaStream;
    producerId: string;
    kind: "screen" | "camera";
    userId?: string;
};

type RoomState = {
    roomId: string | null;
    isInRoom: boolean;
    participants: Participant[];
    selfUserId: string | null;
    videoStreams: Map<string, VideoStream>;
    cameraStreamsByUserId: Map<string, MediaStream>;
    setRoom: (roomId: string, selfUserId: string) => void;
    setParticipants: (participants: Participant[]) => void;
    addVideoStream: (entry: VideoStream) => void;
    removeVideoStream: (producerId: string) => void;
    removeCameraByUserId: (userId: string) => void;
    leaveRoom: () => void;
};

export const useRoomStore = create<RoomState>((set, get) => ({
    roomId: null,
    isInRoom: false,
    participants: [],
    selfUserId: null,
    videoStreams: new Map(),
    cameraStreamsByUserId: new Map(),

    setRoom: (roomId, selfUserId) =>
        set({ roomId, isInRoom: true, selfUserId }),

    setParticipants: (participants) => set({ participants }),

    addVideoStream: (entry) => {
        const nextStreams = new Map(get().videoStreams);
        nextStreams.set(entry.producerId, entry);
        const nextCameras = new Map(get().cameraStreamsByUserId);
        if (entry.kind === "camera" && entry.userId) {
            nextCameras.set(entry.userId, entry.stream);
        }
        set({ videoStreams: nextStreams, cameraStreamsByUserId: nextCameras });
    },

    removeVideoStream: (producerId) => {
        const existing = get().videoStreams.get(producerId);
        if (!existing) return;
        const nextStreams = new Map(get().videoStreams);
        nextStreams.delete(producerId);
        const nextCameras = new Map(get().cameraStreamsByUserId);
        if (existing.kind === "camera" && existing.userId) {
            nextCameras.delete(existing.userId);
        }
        set({ videoStreams: nextStreams, cameraStreamsByUserId: nextCameras });
    },

    // ✅ NEW: remove a camera stream by userId (used when stopping own camera)
    removeCameraByUserId: (userId) => {
        const nextCameras = new Map(get().cameraStreamsByUserId);
        nextCameras.delete(userId);
        // Also remove from videoStreams
        const nextStreams = new Map(get().videoStreams);
        nextStreams.forEach((vs, key) => {
            if (vs.kind === "camera" && vs.userId === userId) {
                nextStreams.delete(key);
            }
        });
        set({ videoStreams: nextStreams, cameraStreamsByUserId: nextCameras });
    },

    leaveRoom: () =>
        set({
            roomId: null,
            isInRoom: false,
            participants: [],
            selfUserId: null,
            videoStreams: new Map(),
            cameraStreamsByUserId: new Map(),
        }),
}));
