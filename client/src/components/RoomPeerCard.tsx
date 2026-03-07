"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
      className="relative w-full aspect-video rounded-xl border border-border bg-card overflow-hidden group"
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
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      )}

      {/* AVATAR FALLBACK */}
      {!hasStream && (
        <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
          <Image
            src={peer.avatarUrl}
            alt={peer.username}
            width={56}
            height={56}
            className="rounded-full ring-2 ring-border"
          />
          <span className="text-xs text-muted-foreground font-medium">
            {peer.username}
          </span>
        </div>
      )}

      {/* Overlay controls — visible on hover or in fullscreen */}
      {hasStream && streamData && (
        <>
          {/* Name badge */}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
            <span className="text-xs text-white font-medium">
              {peer.username}
            </span>
          </div>

          {/* Top-right controls */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {/* Viewer quality */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-[10px] px-2 py-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-md text-white hover:bg-black/80 transition-colors">
                  <Settings2 className="w-3 h-3" />
                  <span>{qualityLabel}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
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
            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center w-7 h-7 bg-black/60 backdrop-blur-sm border border-white/10 rounded-md text-white hover:bg-black/80 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
