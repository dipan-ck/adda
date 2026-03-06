import { create } from "zustand";
import { socket } from "@/lib/socket";

export type Peer = {
  userId: string;
  username: string;
  avatarUrl: string;
};

export type VideoStream = {
  producerId: string;
  type: "screen" | "camera";
  stream: MediaStream;
  userId: string;
};

type RoomState = {
  roomId: string | null;
  peers: Peer[];
  videoStreams: VideoStream[];
  isInRoom: boolean;
  setRoom: (roomId: string, peers: Peer[]) => void;
  leaveRoom: () => void;
  setPeers: (peers: Peer[]) => void;
  addVideoStream: (data: VideoStream) => void;
  removeVideoStream: (producerId: string) => void;

  clearVideoStreams: () => void;
};

export const useRoomStore = create<RoomState>((set) => {
  socket.on("room-peers-list", (peers: Peer[]) => {
    set({ peers });
  });

  return {
    roomId: null,
    videoStreams: [],
    peers: [],
    isInRoom: false,

    setRoom: (roomId, peers) => set({ roomId, peers, isInRoom: true }),

    leaveRoom: () => {
      socket.disconnect();
      set({ roomId: null, peers: [], isInRoom: false, videoStreams: [] });
    },

    setPeers: (peers) => set({ peers }),

    addVideoStream: (data: VideoStream) =>
      set((state) => ({
        videoStreams: [...state.videoStreams, data],
      })),

    removeVideoStream: (producerId: string) =>
      set((state) => ({
        videoStreams: state.videoStreams.filter(
          (s) => s.producerId !== producerId,
        ),
      })),

    // ── NEW ────────────────────────────────────────────────────────────────
    clearVideoStreams: () => set({ videoStreams: [] }),
  };
});
