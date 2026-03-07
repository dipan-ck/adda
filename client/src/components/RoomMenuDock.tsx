"use client";

import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Share2,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import { socket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";
import { useState } from "react";

export default function RoomMenuDock({
  mute,
  unmute,
  deafen,
  undeafen,
  cleanup,
  startScreenShare,
  stopScreenShare,
  setScreenMaxQuality,
  onShareRoom,
}: {
  mute: () => void;
  unmute: () => void;
  deafen: () => void;
  undeafen: () => void;
  cleanup: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  setScreenMaxQuality: (layer: 0 | 1 | 2) => void;
  onShareRoom: () => void;
}) {
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [streamQuality, setStreamQuality] = useState<string>("2");

  const iconBtn = "rounded-xl h-9 w-9 transition-all duration-150";

  const toggleMute = () => {
    if (isMuted) {
      unmute();
      setIsMuted(false);
    } else {
      mute();
      setIsMuted(true);
    }
  };

  const toggleDeafen = () => {
    if (isDeafened) {
      undeafen();
      setIsDeafened(false);
    } else {
      deafen();
      setIsDeafened(true);
    }
  };

  const toggleScreen = async () => {
    if (isSharingScreen) {
      stopScreenShare();
      setIsSharingScreen(false);
    } else {
      try {
        await startScreenShare();
        setIsSharingScreen(true);
      } catch {
        // user cancelled or permission denied — don't flip state
      }
    }
  };

  const leave = () => {
    socket.disconnect();
    cleanup();
    leaveRoom();
  };

  const qualityLabel: Record<string, string> = {
    "2": "HD",
    "1": "720p",
    "0": "360p",
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-0.5 px-1.5 py-1.5 bg-popover/95 backdrop-blur border border-border rounded-2xl shadow-xl shadow-black/10">
          {/* ── MIC ── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMuted ? "secondary" : "ghost"}
                size="icon"
                onClick={toggleMute}
                className={iconBtn}
              >
                {isMuted ? (
                  <MicOff size={16} className="text-destructive" />
                ) : (
                  <Mic size={16} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>

          {/* ── SPEAKER ── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isDeafened ? "secondary" : "ghost"}
                size="icon"
                onClick={toggleDeafen}
                className={iconBtn}
              >
                {isDeafened ? (
                  <VolumeX size={16} className="text-destructive" />
                ) : (
                  <Volume2 size={16} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isDeafened ? "Undeafen" : "Deafen"}
            </TooltipContent>
          </Tooltip>

          {/* ── DIVIDER ── */}
          <div className="w-px h-5 bg-border mx-0.5" />

          {/* ── SCREEN SHARE + QUALITY (grouped) ── */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isSharingScreen ? "secondary" : "ghost"}
                  size="icon"
                  onClick={toggleScreen}
                  className={`${iconBtn} ${isSharingScreen ? "text-primary" : ""}`}
                >
                  {isSharingScreen ? (
                    <MonitorOff size={16} />
                  ) : (
                    <MonitorUp size={16} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isSharingScreen ? "Stop sharing" : "Share screen"}
              </TooltipContent>
            </Tooltip>

            {/* Stream quality — only visible when you are the streamer */}
            {isSharingScreen && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-0.5 h-9 px-1.5 rounded-xl hover:bg-accent transition-colors">
                        <Badge
                          variant="outline"
                          className="text-[10px] pointer-events-none"
                        >
                          {qualityLabel[streamQuality]}
                        </Badge>
                        <ChevronUp
                          size={10}
                          className="text-muted-foreground"
                        />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Stream quality</TooltipContent>
                </Tooltip>

                <DropdownMenuContent side="top" align="end" className="w-44">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Your stream quality
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={streamQuality}
                    onValueChange={(v) => {
                      setStreamQuality(v);
                      setScreenMaxQuality(Number(v) as 0 | 1 | 2);
                    }}
                  >
                    <DropdownMenuRadioItem value="2">
                      High (1080p)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="1">
                      Medium (720p)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="0">
                      Low (360p)
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* ── DIVIDER ── */}
          <div className="w-px h-5 bg-border mx-0.5" />

          {/* ── SHARE ROOM ── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onShareRoom}
                className={iconBtn}
              >
                <Share2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Invite people</TooltipContent>
          </Tooltip>

          {/* ── DIVIDER ── */}
          <div className="w-px h-5 bg-border mx-0.5" />

          {/* ── LEAVE ── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="destructive"
                onClick={leave}
                className="rounded-xl h-9 w-9"
              >
                <PhoneOff size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave room</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
