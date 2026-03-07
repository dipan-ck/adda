"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Peer, useRoomStore } from "@/store/roomStore";
import Image from "next/image";
import { Settings2, Maximize2, Minimize2 } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";

export default function RoomPeerCard({
  peer,
  setViewerQuality,
}: {
  peer: Peer;
  setViewerQuality: (producerId: string, layer?: 0 | 1 | 2) => Promise<void>;
}) {
  const videoStreams = useRoomStore((s) => s.videoStreams);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityLabel, setQualityLabel] = useState("Auto");

  const streamData =
    videoStreams.find((s) => s.userId === peer.userId && s.type === "screen") ??
    videoStreams.find((s) => s.userId === peer.userId);

  const hasStream = Boolean(streamData);

  // Track fullscreen state changes (e.g. user presses Escape)
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Fullscreen request failed:", err);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleQuality = useCallback(
    async (producerId: string, layer?: 0 | 1 | 2) => {
      await setViewerQuality(producerId, layer);
      if (layer === undefined) setQualityLabel("Auto");
      else if (layer === 2) setQualityLabel("1080p");
      else if (layer === 1) setQualityLabel("720p");
      else setQualityLabel("360p");
    },
    [setViewerQuality],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video rounded-lg border border-border bg-black overflow-hidden group shadow-sm"
      // In fullscreen the browser gives the element full viewport — these styles handle that
      style={
        isFullscreen
          ? { width: "100vw", height: "100vh", borderRadius: 0, border: "none" }
          : undefined
      }
    >
      {/* VIDEO */}
      {hasStream && streamData && (
        <video
          autoPlay
          playsInline
          muted
          ref={(el) => {
            if (el) el.srcObject = streamData.stream;
          }}
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}

      {/* AVATAR FALLBACK */}
      {!hasStream && (
        <div className="flex flex-col items-center justify-center h-full gap-3 py-6 bg-muted">
          <Image
            src={peer.avatarUrl}
            alt={peer.username}
            width={64}
            height={64}
            className="rounded-full ring-2 ring-border"
          />
          <span className="text-sm text-muted-foreground font-medium">
            {peer.username}
          </span>
        </div>
      )}

      {/* Overlay controls — always visible */}
      {hasStream && streamData && (
        <>
          {/* Name badge */}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
            <span className="text-xs text-white font-medium">
              {peer.username}
            </span>
          </div>

          {/* Top-right controls — always visible */}
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-100 transition-opacity duration-150">
            {/* Viewer quality */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs bg-black/70 backdrop-blur-sm border border-white/10 text-white hover:bg-black/80 hover:text-white rounded-md"
                >
                  <Settings2 className="w-3.5 h-3.5 mr-1" />
                  <span>{qualityLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                  Viewer Quality
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    handleQuality(streamData.producerId, undefined)
                  }
                >
                  Auto
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleQuality(streamData.producerId, 2)}
                >
                  High (1080p)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleQuality(streamData.producerId, 1)}
                >
                  Medium (720p)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleQuality(streamData.producerId, 0)}
                >
                  Low (360p)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Fullscreen toggle */}
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-black/70 backdrop-blur-sm border border-white/10 text-white hover:bg-black/80 hover:text-white rounded-md"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
