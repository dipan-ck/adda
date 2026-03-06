"use client";
import { generateUser } from "../lib/generate_user";
import { useUserStore } from "@/store/userStore";
import { useEffect, useState } from "react";
import RoomUI from "@/components/RoomUi";
import JoinRoomUI from "@/components/JoinRoomUI";
import { useRoomStore } from "@/store/roomStore";

export default function Home() {
    const { user, setUser } = useUserStore();
    const { isInRoom } = useRoomStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (!user) setUser(generateUser());
        const t = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(t);
    }, [user, setUser]);

    if (!user || !mounted) return null;
    return isInRoom ? <RoomUI /> : <JoinRoomUI />;
}
