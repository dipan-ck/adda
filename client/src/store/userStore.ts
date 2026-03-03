"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
    username: string;
    userId: string;
    avatarUrl: string;
};

type UserState = {
    user: User | null;
    setUser: (user: User) => void;
};

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            user: null,
            setUser: (user) => set({ user }),
        }),
        {
            name: "user-storage",
        },
    ),
);
