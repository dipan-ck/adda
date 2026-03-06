"use client";
import Image from "next/image";
import { useUserStore } from "@/store/userStore";
import { useState, useRef } from "react";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, Plus, ArrowRight, Github } from "lucide-react";
import { toast } from "sonner";
import { useRoomStore } from "@/store/roomStore";

export default function JoinRoomUI() {
  const { user } = useUserStore();
  const { setRoom } = useRoomStore();

  const [roomIdInput, setRoomIdInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleCreateRoom = () => {
    setIsCreating(true);
    socket.connect();
    socket.emit("create-room", user, (response: any) => {
      setIsCreating(false);
      if (!response?.roomId) {
        toast.error("Failed to create room", {
          description: "Something went wrong. Please try again.",
        });
        return;
      }

      setRoom(response.roomId, response.peers);
    });
  };

  const handleJoinRoom = () => {
    if (!roomIdInput.trim()) {
      toast.warning("Room ID required", {
        description: "Please enter a Room ID before joining.",
      });
      inputRef.current?.focus();
      return;
    }
    setIsJoining(true);
    socket.connect();
    socket.emit(
      "join-room",
      { roomId: roomIdInput.trim(), user },
      (response: any) => {
        setIsJoining(false);
        if (response?.error) {
          toast.error("Failed to join room", { description: response.error });
          return;
        }
        toast.success("Joined successfully!", {
          description: `Welcome to room ${roomIdInput.trim()}, ${user.username}!`,
        });
        setRoom(roomIdInput.trim(), response.peers);
      },
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-[340px] flex flex-col items-center gap-9">
        {/* ── App logo slot ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-30  flex items-center justify-center overflow-hidden">
            <Image src="/logo.svg" alt="Adda" width={95} height={95} />
          </div>
        </div>

        {/* ── Avatar + status ── */}
        <div className="flex flex-col items-center gap-3 -mt-2">
          <Image
            src={user.avatarUrl}
            alt="avatar"
            width={72}
            height={72}
            className="rounded-full ring-2 ring-border"
          />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40">
            <span className="text-sm font-medium text-foreground tracking-tight">
              {user.username}
            </span>
          </div>
        </div>

        {/* ── Heading ── */}
        <div className="text-center -mt-2">
          <h1 className="text-[1.6rem] font-semibold  tracking-tight text-foreground leading-snug">
            Join or create a room
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a room ID below to get started.
          </p>
        </div>

        {/* ── Room ID input ── */}
        <div className="w-full pb-6">
          <div className="relative w-full">
            <input
              ref={inputRef}
              placeholder="Enter room ID"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) =>
                e.key === "Enter" && !isJoining && handleJoinRoom()
              }
              disabled={isJoining || isCreating}
              maxLength={12}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent border-none outline-none
                         font-mono text-[1.9rem] font-medium tracking-[0.22em]
                         text-center uppercase text-foreground
                         caret-primary pb-3 pt-1
                         placeholder:text-muted-foreground/35
                         placeholder:text-base placeholder:tracking-normal
                         placeholder:normal-case placeholder:font-sans"
            />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
            <div
              className={`absolute bottom-0 left-0 right-0 h-0.5 bg-foreground
                          transition-transform duration-[400ms] ease-out origin-center
                          ${focused ? "scale-x-100" : "scale-x-0"}`}
            />
            {roomIdInput.length > 0 && (
              <span className="absolute right-0 -bottom-5 font-mono text-[0.65rem] text-muted-foreground/40 tracking-wide">
                {roomIdInput.length}/12
              </span>
            )}
          </div>
        </div>

        {/* ── Buttons ── */}
        <div className="w-full flex flex-col gap-3 -mt-2">
          <Button
            onClick={handleJoinRoom}
            disabled={isJoining || isCreating}
            className="w-full h-11 gap-2 text-sm font-medium"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Join Room
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-50" />
              </>
            )}
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[0.62rem] tracking-widest uppercase text-muted-foreground/50">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="outline"
            onClick={handleCreateRoom}
            disabled={isJoining || isCreating}
            className="w-full h-11 gap-2 text-sm font-medium"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Room
              </>
            )}
          </Button>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-4 pt-1">
          <a
            href="https://github.com/dipan-ck/adda"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
          <span className="w-px h-3 bg-border" />
          {/* TODO: update href to your portfolio URL when ready */}
          <a
            href="https://dipanck.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground font-sans hover:text-primary transition-colors"
          >
            by Dipan Chakrabort
          </a>
        </div>
      </div>
    </div>
  );
}
