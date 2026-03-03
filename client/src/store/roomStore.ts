"use client";

import { create } from "zustand";

export type Participant = {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string;
};

type RoomState = {
  roomId: string | null;
  isInRoom: boolean;
  participants: Participant[];

  setRoom: (roomId: string) => void;
  setParticipants: (participants: Participant[]) => void;
  leaveRoom: () => void;
};

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  isInRoom: false,
  participants: [],

  setRoom: (roomId) =>
    set({
      roomId,
      isInRoom: true,
    }),

  setParticipants: (participants) => set({ participants }),

  leaveRoom: () =>
    set({
      roomId: null,
      isInRoom: false,
      participants: [],
    }),
}));
