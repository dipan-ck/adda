"use client";

import { useRoomStore } from "@/store/roomStore";
import Image from "next/image";
import { socket } from "@/lib/socket";
import { useEffect, useRef, useState, useCallback } from "react";
import { useMediasoup, type ScreenShareQuality } from "@/hooks/useMediasoup";
import RoomMenuDock from "./RoomMenuDock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonitorUp, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ScreenShareEntry = {
  producerId: string;
  stream: MediaStream;
  socketId: string;
  isSelf?: boolean;
};

type AudioEntry = {
  producerId: string;
  stream: MediaStream;
  socketId: string;
  type: "mic" | "screen-audio";
};

export default function RoomUI() {
  const { roomId, participants, setParticipants } = useRoomStore();
  const { mute, unmute, startScreenShare, stopScreenShare } =
    useMediasoup(roomId);

  const [screenShares, setScreenShares] = useState<ScreenShareEntry[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on("room-participants", setParticipants);
    return () => {
      socket.off("room-participants", setParticipants);
    };
  }, [setParticipants]);

  // Screen share stream events
  useEffect(() => {
    const handleStream = (e: Event) => {
      const { producerId, stream, socketId, isSelf } = (e as CustomEvent)
        .detail;
      setScreenShares((prev) => {
        if (prev.find((s) => s.producerId === producerId)) return prev;
        return [...prev, { producerId, stream, socketId, isSelf }];
      });
    };
    const handleEnded = (e: Event) => {
      const { producerId } = (e as CustomEvent).detail;
      setScreenShares((prev) =>
        prev.filter((s) => s.producerId !== producerId),
      );
      setFullscreenId((cur) => (cur === producerId ? null : cur));
    };
    window.addEventListener("screenshare-stream", handleStream);
    window.addEventListener("screenshare-ended", handleEnded);
    return () => {
      window.removeEventListener("screenshare-stream", handleStream);
      window.removeEventListener("screenshare-ended", handleEnded);
    };
  }, []);

  // Audio stream events — play mic audio normally, screen-audio gets routed to audio element
  useEffect(() => {
    const handleAudio = (e: Event) => {
      const { producerId, stream, appData } = (e as CustomEvent).detail;
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      // Store ref so we can control volume separately in future
      audioRefs.current.set(producerId, audio);
      audio.play().catch(console.error);
    };
    window.addEventListener("audio-stream", handleAudio);
    return () => {
      window.removeEventListener("audio-stream", handleAudio);
    };
  }, []);

  // Attach video streams to elements
  useEffect(() => {
    for (const share of screenShares) {
      const el = videoRefs.current.get(share.producerId);
      if (el && el.srcObject !== share.stream) {
        el.srcObject = share.stream;
      }
    }
  }, [screenShares]);

  // Native fullscreen API sync
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenId(null);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleStartScreenShare = async (quality: ScreenShareQuality) => {
    const producer = await startScreenShare(quality, () => {
      setIsScreenSharing(false);
      setFullscreenId(null);
    });
    if (producer) setIsScreenSharing(true);
  };

  const handleStopScreenShare = () => {
    stopScreenShare();
    setIsScreenSharing(false);
    setFullscreenId(null);
  };

  const handleFullscreen = useCallback(
    async (producerId: string) => {
      if (fullscreenId === producerId) {
        // Exit fullscreen
        await document.exitFullscreen().catch(() => {});
        setFullscreenId(null);
      } else {
        // Enter fullscreen on the container div
        const container = document.getElementById(`screenshare-${producerId}`);
        if (container) {
          await container.requestFullscreen().catch(() => {});
          setFullscreenId(producerId);
        }
      }
    },
    [fullscreenId],
  );

  const getParticipantName = (socketId: string) =>
    participants.find((p) => p.socketId === socketId)?.username ?? "Someone";

  const isFullscreen = fullscreenId !== null;
  const activeShare = screenShares.find((s) => s.producerId === fullscreenId);

  return (
    <div className="min-h-screen flex flex-col pb-24 bg-background">
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

      <div className="flex-1 flex flex-col gap-5 p-5">
        {/* Screen share area */}
        {screenShares.map((share) => (
          <div
            key={share.producerId}
            id={`screenshare-${share.producerId}`}
            className="relative rounded-xl overflow-hidden border border-border bg-black shadow-2xl group"
          >
            {/* Top bar */}
            <div
              className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2
              bg-gradient-to-b from-black/70 to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-background/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10 text-xs text-white font-medium">
                  <MonitorUp className="h-3 w-3 text-primary" />
                  <span>
                    {share.isSelf ? "You" : getParticipantName(share.socketId)}
                  </span>
                  {share.isSelf && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 px-1 ml-1"
                    >
                      sharing
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Fullscreen toggle */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-white/20 rounded-lg"
                  onClick={() => handleFullscreen(share.producerId)}
                >
                  {fullscreenId === share.producerId ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>

                {/* Stop sharing (only for self) */}
                {share.isSelf && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:bg-destructive/60 rounded-lg"
                    onClick={handleStopScreenShare}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <video
              ref={(el) => {
                if (el) {
                  videoRefs.current.set(share.producerId, el);
                  if (el.srcObject !== share.stream)
                    el.srcObject = share.stream;
                }
              }}
              autoPlay
              playsInline
              muted={share.isSelf} // mute self-preview to avoid echo
              className={cn(
                "w-full object-contain bg-black",
                isFullscreen ? "h-screen" : "max-h-[65vh]",
              )}
            />

            {/* Bottom gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 h-12
              bg-gradient-to-t from-black/40 to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            />
          </div>
        ))}

        {/* Participants grid — compact when screenshare is active */}
        <div
          className={cn(
            "grid gap-4",
            screenShares.length > 0
              ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
              : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
          )}
        >
          {participants.map((p) => (
            <div
              key={p.socketId}
              className={cn(
                "flex flex-col items-center rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors",
                screenShares.length > 0 ? "gap-1.5 p-2" : "gap-2.5 p-4",
              )}
            >
              <Image
                src={p.avatarUrl}
                alt={p.username}
                width={screenShares.length > 0 ? 40 : 60}
                height={screenShares.length > 0 ? 40 : 60}
                className="rounded-full ring-2 ring-border"
              />
              <span
                className={cn(
                  "font-medium text-center truncate w-full",
                  screenShares.length > 0 ? "text-xs" : "text-sm",
                )}
              >
                {p.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      <RoomMenuDock
        onMute={mute}
        onUnmute={unmute}
        onStartScreenShare={handleStartScreenShare}
        onStopScreenShare={handleStopScreenShare}
        isScreenSharing={isScreenSharing}
      />
    </div>
  );
}
