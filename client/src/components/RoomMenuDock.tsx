"use client";

import { Mic, MonitorUp, Volume2, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { socket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";

export default function RoomMenuDock() {
    const { leaveRoom } = useRoomStore();

    const handleLeave = () => {
        socket.disconnect();
        leaveRoom();
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <TooltipProvider delayDuration={200}>
                <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-background/90 backdrop-blur-xl border border-border shadow-2xl">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-10 w-10"
                            >
                                <Mic className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Mute</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-10 w-10"
                            >
                                <Volume2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Deafen</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-10 w-10"
                            >
                                <MonitorUp className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Share screen</TooltipContent>
                    </Tooltip>

                    <div className="w-px h-5 bg-border mx-1" />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                className="rounded-xl h-10 w-10 bg-destructive hover:bg-destructive/85 text-destructive-foreground"
                                onClick={handleLeave}
                            >
                                <PhoneOff className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Leave room</TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
        </div>
    );
}
