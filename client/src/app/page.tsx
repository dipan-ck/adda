"use client";
import { generateUser } from "../lib/generate_user";
import { useUserStore } from "@/store/userStore";
import { useEffect, useState } from "react";
import RoomUI from "@/components/RoomUi";
import JoinRoomUI from "@/components/JoinRoomUI";
import { useRoomStore } from "@/store/roomStore";
import { socket } from "@/lib/socket";
import { toast } from "sonner";

export default function Home() {
  const { user, setUser } = useUserStore();
  const { isInRoom, setRoom } = useRoomStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) setUser(generateUser());
    setMounted(true);
  }, [user, setUser]);

  useEffect(() => {
    if (!user || !mounted) return;
    if (isInRoom) return;

    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get("roomId");
    if (!roomIdParam) return;

    window.history.replaceState({}, "", "/");

    socket.connect();
    socket.emit(
      "join-room",
      { roomId: roomIdParam.trim(), user },
      (response: any) => {
        if (response?.error) {
          socket.disconnect();
          toast.error("Room not found", {
            description: "That room ID is invalid or has expired.",
          });
          return;
        }
        toast.success("Joined via invite link!", {
          description: `Welcome, ${user.username}!`,
        });
        setRoom(roomIdParam.trim(), response.peers);
      },
    );
  }, [user, mounted]);

  if (!user || !mounted) return null;

  return isInRoom ? <RoomUI /> : <JoinRoomUI />;
}
