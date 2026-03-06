"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Maximize2, Minimize2 } from "lucide-react";
import { Peer, VideoStream } from "@/store/roomStore";
import { useRoomStore } from "@/store/roomStore";
import { Badge } from "@/components/ui/badge";

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none)").matches;
}

function FullscreenOverlay({
  peer,
  streamData,
  onClose,
}: {
  peer: Peer;
  streamData: VideoStream | undefined;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // true = native fullscreen succeeded; false = CSS fallback
  const [nativeFs, setNativeFs] = useState(false);
  const [visible, setVisible] = useState(false);

  // ── Try native fullscreen, fall back to CSS overlay ───────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    async function enter() {
      try {
        if (el!.requestFullscreen) {
          await el!.requestFullscreen();
          setNativeFs(true);
        } else if ((el as any).webkitRequestFullscreen) {
          await (el as any).webkitRequestFullscreen();
          setNativeFs(true);
        } else {
          // iOS Safari — no native fullscreen for arbitrary elements
          setNativeFs(false);
        }
      } catch {
        setNativeFs(false);
      }
      // Animate in regardless of mode
      requestAnimationFrame(() => setVisible(true));
    }

    enter();

    // Native fullscreen exit via Escape or browser button
    function onFsChange() {
      const fsEl =
        document.fullscreenElement || (document as any).webkitFullscreenElement;
      if (!fsEl) onClose();
    }

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, [onClose]);

  // ── Keep video srcObject in sync ──────────────────────────────────────────
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = streamData?.stream ?? null;
  }, [streamData?.stream]);

  // ── Exit ──────────────────────────────────────────────────────────────────
  async function handleMinimize() {
    setVisible(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if ((document as any).webkitFullscreenElement)
        await (document as any).webkitExitFullscreen();
    } catch {
      /* already exited */
    }
    setTimeout(onClose, 220);
  }

  // When native fullscreen is active the browser controls sizing;
  // when falling back we use fixed + 100dvh to fill the visual viewport.
  const fallbackStyle = !nativeFs
    ? {
        position: "fixed" as const,
        inset: 0,
        zIndex: 9999,
        width: "100%",
        height: "100dvh",
      }
    : { width: "100vw", height: "100vh" };

  return (
    <div
      ref={containerRef}
      className="bg-black flex items-center justify-center"
      style={{
        ...fallbackStyle,
        transition: "opacity 220ms ease",
        opacity: visible ? 1 : 0,
      }}
    >
      {streamData ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24">
            <Image
              src={peer.avatarUrl}
              alt={peer.username}
              fill
              className="rounded-full ring-2 ring-white/20 object-cover"
            />
          </div>
          <p className="text-white/80 text-base font-medium">{peer.username}</p>
          <p className="text-white/40 text-sm">No active stream</p>
        </div>
      )}

      {/* Minimize button — large tap target for mobile */}
      <button
        onClick={handleMinimize}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10
                   p-2.5 sm:p-2 rounded-xl
                   bg-white/10 backdrop-blur-sm border border-white/20
                   text-white hover:bg-white/20 active:scale-95
                   transition-all duration-150
                   touch-manipulation"
        aria-label="Exit fullscreen"
      >
        <Minimize2 className="w-5 h-5" />
      </button>

      {/* Bottom HUD */}
      <div
        className="absolute bottom-0 inset-x-0 h-20
                    bg-gradient-to-t from-black/80 to-transparent
                    flex items-end px-4 sm:px-5 pb-4 pointer-events-none"
        // Safe area for iPhone home bar
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
        }}
      >
        <div className="flex items-center gap-2">
          {streamData?.type === "screen" && (
            <Badge
              variant="secondary"
              className="text-[10px] uppercase tracking-widest"
            >
              Screen
            </Badge>
          )}
          <span className="text-white/90 text-sm font-medium">
            {peer.username}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Peer Card ────────────────────────────────────────────────────────────────

export default function RoomPeerCard({ peer }: { peer: Peer }) {
  const videoStreams = useRoomStore((s) => s.videoStreams);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [focused, setFocused] = useState(false);
  // On touch devices we always show the expand icon (no hover state available)
  const [touch] = useState(() =>
    typeof window !== "undefined" ? isTouchDevice() : false,
  );

  const streamData =
    videoStreams.find((s) => s.userId === peer.userId && s.type === "screen") ??
    videoStreams.find((s) => s.userId === peer.userId);

  // Always sync srcObject — null clears dead streams so avatar shows
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = streamData?.stream ?? null;
  }, [streamData]);

  const handleClose = useCallback(() => setFocused(false), []);
  const hasStream = Boolean(streamData);

  return (
    <>
      {/* ── Card ── */}
      <div
        onClick={() => setFocused(true)}
        className="relative w-full rounded-xl border border-border bg-card overflow-hidden
                   cursor-pointer select-none group
                   transition-all duration-200 ease-out
                   hover:shadow-lg active:scale-[0.98]
                   touch-manipulation"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Video layer — always mounted so srcObject assignment sticks */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover
                      transition-opacity duration-300
                      ${hasStream ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        />

        {/* Avatar fallback */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-3
                      transition-opacity duration-300
                      ${hasStream ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          <div className="relative w-12 h-12 sm:w-16 sm:h-16">
            <Image
              src={peer.avatarUrl}
              alt={peer.username}
              fill
              className="rounded-full ring-2 ring-border object-cover"
            />
          </div>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            {peer.username}
          </span>
        </div>

        {/* Screen share badge */}
        {streamData?.type === "screen" && (
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
            <Badge
              variant="secondary"
              className="text-[9px] sm:text-[10px] uppercase tracking-widest px-1.5"
            >
              Screen
            </Badge>
          </div>
        )}

        {/* Username overlay — bottom left */}
        <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2">
          <Badge
            variant="outline"
            className="text-[10px] sm:text-xs bg-background/50 backdrop-blur-sm border-border/60 px-1.5"
          >
            {peer.username}
          </Badge>
        </div>

        {/* Expand icon:
            - Desktop: fade in on hover
            - Touch/mobile: always visible (no hover state) */}
        <div
          className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2
                      p-1.5 rounded-md
                      bg-background/50 backdrop-blur-sm border border-border/60
                      transition-opacity duration-200
                      ${
                        touch
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
        >
          <Maximize2 className="w-3 h-3 text-foreground" />
        </div>
      </div>

      {focused && (
        <FullscreenOverlay
          peer={peer}
          streamData={streamData}
          onClose={handleClose}
        />
      )}
    </>
  );
}
