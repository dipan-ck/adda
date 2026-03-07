"use client";
import { useRoomStore } from "@/store/roomStore";
import RoomPeerCard from "./RoomPeerCard";
import RoomMenuDock from "./RoomMenuDock";
import ShareModal from "./ShareModal";
import { useState } from "react";
import { Mic } from "lucide-react";
import useMediasoup from "@/hooks/useMediasoup";
import { Button } from "@/components/ui/button";

export default function RoomUI() {
  const peers = useRoomStore((s) => s.peers);
  const roomId = useRoomStore((s) => s.roomId);

  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const {
    get_router_capabilities,
    cleanup,
    mute,
    unmute,
    deafen,
    undeafen,
    startScreenShare,
    stopScreenShare,
    setScreenMaxQuality,
    setViewerQuality,
  } = useMediasoup();

  const n = peers.length;

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

  // ── Gate / join screen ────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div
        className="w-screen flex flex-col items-center justify-center bg-background px-4"
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
      {/* ── Peer grid area ── */}
      <div
        className="flex-1 p-3 pt-4 overflow-y-auto overflow-x-hidden"
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
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-2xl">
              <RoomPeerCard
                peer={peers[0]}
                setViewerQuality={setViewerQuality}
              />
            </div>
          </div>
        ) : (
          <div className={`grid gap-2 sm:gap-3 w-full ${gridCols()}`}>
            {peers.map((peer) => (
              <RoomPeerCard
                key={peer.userId}
                peer={peer}
                setViewerQuality={setViewerQuality}
              />
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
        setScreenMaxQuality={setScreenMaxQuality}
        onShareRoom={() => setShareOpen(true)}
      />

      {/* ── Share Modal ── */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        roomId={roomId}
      />
    </div>
  );
}
