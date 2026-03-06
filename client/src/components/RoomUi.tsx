"use client";
import { useRoomStore } from "@/store/roomStore";
import RoomPeerCard from "./RoomPeerCard";
import RoomMenuDock from "./RoomMenuDock";
import { useState } from "react";
import { Copy, Check, Mic } from "lucide-react";
import useMediasoup from "@/hooks/useMediasoup";
import { Button } from "@/components/ui/button";

export default function RoomUI() {
  const peers = useRoomStore((s) => s.peers);
  const roomId = useRoomStore((s) => s.roomId);
  const [copied, setCopied] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    get_router_capabilities,
    cleanup,
    mute,
    unmute,
    deafen,
    undeafen,
    startScreenShare,
    stopScreenShare,
  } = useMediasoup();

  const n = peers.length;

  // Responsive column logic:
  //   mobile  (<640px)  → always 1 col
  //   tablet  (640-1024) → 1 if solo, else 2
  //   desktop (>1024)   → 1 / 2 / 3 / 4 based on count
  // We encode this as a CSS grid with responsive classes instead of inline style.
  function gridCols() {
    if (n <= 1) return "grid-cols-1";
    if (n <= 4) return "grid-cols-1 sm:grid-cols-2";
    if (n <= 9) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  }

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      await get_router_capabilities();
      setJoined(true);
    } catch (err: any) {
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        setError(
          "Microphone access denied. Please allow mic access and try again.",
        );
      } else {
        setError("Failed to connect. Please try again.");
        console.error(err);
      }
    } finally {
      setJoining(false);
    }
  }

  const handleCopy = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Gate / join screen ────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div
        className="w-screen flex flex-col items-center justify-center bg-background px-4"
        // dvh accounts for mobile browser chrome (address bar)
        style={{ minHeight: "100dvh" }}
      >
        <div className="w-full max-w-sm flex flex-col items-center gap-5 p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm">
          <div className="p-3 rounded-full bg-muted">
            <Mic className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">Join Room</p>
            <p className="text-xs text-muted-foreground">
              Allow microphone access to join the conversation.
            </p>
          </div>
          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="w-full rounded-full"
          >
            {joining ? "Joining…" : "Join with Mic"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Room layout ──────────────────────────────────────────────────────────
  return (
    <div
      className="w-screen flex flex-col bg-background relative overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* ── Top room-ID bar ── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     bg-card/80 backdrop-blur-sm border border-border
                     hover:bg-card active:scale-95 transition-all group"
        >
          <span className="text-[0.6rem] text-muted-foreground uppercase tracking-widest font-medium hidden xs:inline">
            Room
          </span>
          <span className="font-mono text-xs font-semibold text-foreground tracking-wider">
            {roomId}
          </span>
          {copied ? (
            <Check className="w-3 h-3 text-green-500 shrink-0" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      </div>

      {/* ── Peer grid area ──
          pt-12 clears the top pill
          pb accommodates the dock height + safe-area on iOS
      ── */}
      <div
        className="flex-1 p-3 pt-12 overflow-y-auto overflow-x-hidden"
        // safe-area-inset-bottom handles iPhone notch / home bar
        style={{
          paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {n === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Waiting for others to join…
            </p>
          </div>
        ) : n === 1 ? (
          /* Single peer — centered, max width so it doesn't stretch on wide screens */
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-2xl">
              <RoomPeerCard peer={peers[0]} />
            </div>
          </div>
        ) : (
          <div className={`grid gap-2 sm:gap-3 w-full ${gridCols()}`}>
            {peers.map((peer) => (
              <RoomPeerCard key={peer.userId} peer={peer} />
            ))}
          </div>
        )}
      </div>

      {/* ── Dock ── */}
      <RoomMenuDock
        mute={mute}
        cleanup={cleanup}
        unmute={unmute}
        deafen={deafen}
        undeafen={undeafen}
        startScreenShare={startScreenShare}
        stopScreenShare={stopScreenShare}
      />
    </div>
  );
}
