"use client";
import Image from "next/image";
import { generateUser } from "../lib/generate_user";
import { useUserStore } from "@/store/userStore";
import { useEffect, useState } from "react";
import { useRoomStore } from "@/store/roomStore";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import RoomUI from "@/components/RoomUi";

export default function Home() {
    const { user, setUser } = useUserStore();
    const { isInRoom, setRoom } = useRoomStore();
    const [roomIdInput, setRoomIdInput] = useState("");

    useEffect(() => {
        if (!user) {
            setUser(generateUser());
        }
    }, [user, setUser]);

    if (!user) return null;
    if (isInRoom) return <RoomUI />;

    const handleCreateRoom = () => {
        socket.connect();
        socket.emit("create-room", user, (response: any) => {
            if (!response?.roomId) return;
            // ✅ FIX: pass selfUserId so camera streams get correctly keyed
            setRoom(response.roomId, user.userId);
        });
    };

    const handleJoinRoom = () => {
        if (!roomIdInput.trim()) return;
        socket.connect();
        socket.emit(
            "join-room",
            { roomId: roomIdInput.trim(), user },
            (response: any) => {
                if (response?.error) {
                    alert(response.error);
                    return;
                }
                // ✅ FIX: pass selfUserId
                setRoom(roomIdInput.trim(), user.userId);
            },
        );
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full border-none bg-transparent max-w-md">
                <CardContent className="flex flex-col items-center gap-6">
                    <Image
                        src={user.avatarUrl}
                        alt="avatar"
                        width={90}
                        height={90}
                        className="rounded-full"
                    />
                    <div className="text-lg font-medium">{user.username}</div>
                    <div className="w-full flex flex-col gap-4">
                        <Input
                            className="border-0 border-b-2 text-2xl! text-center rounded-none bg-background shadow-none focus-visible:ring-0 focus-visible:border-primary"
                            placeholder="Enter Room ID"
                            value={roomIdInput}
                            onChange={(e) => setRoomIdInput(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && handleJoinRoom()
                            }
                        />
                        <Button onClick={handleJoinRoom}>Join Room</Button>
                        <Button variant="secondary" onClick={handleCreateRoom}>
                            Create Room
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
