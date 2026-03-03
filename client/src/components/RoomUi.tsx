"use client";

import { useRoomStore } from "@/store/roomStore";
import Image from "next/image";
import { socket } from "@/lib/socket";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import RoomMenuDock from "./RoomMenuDock";

export default function RoomUI() {
    const { roomId, participants, setParticipants } = useRoomStore();

    useEffect(() => {
        socket.on("room-participants", setParticipants);
        return () => {
            socket.off("room-participants", setParticipants);
        };
    }, [setParticipants]);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        Room
                    </span>
                    <Badge
                        variant="secondary"
                        className="font-mono text-xs tracking-widest"
                    >
                        {roomId}
                    </Badge>
                </div>
                <Badge variant="outline" className="text-xs">
                    {participants.length} participant
                    {participants.length !== 1 ? "s" : ""}
                </Badge>
            </div>

            {/* Participants grid */}
            <div className="flex-1 p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {participants.map((p) => (
                        <div
                            key={p.userId}
                            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                            <Image
                                src={p.avatarUrl}
                                alt={p.username}
                                width={60}
                                height={60}
                                className="rounded-full ring-2 ring-border"
                            />
                            <span className="text-sm font-medium text-center truncate w-full">
                                {p.username}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <RoomMenuDock />
        </div>
    );
}
