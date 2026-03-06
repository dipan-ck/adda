"use client";
import Image from "next/image";
import { useUserStore } from "@/store/userStore";
import { useState, useRef, useEffect } from "react";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRoomStore } from "@/store/roomStore";

export default function JoinRoomUI() {
  const { user } = useUserStore();
  const { setRoom } = useRoomStore();

  const [roomIdInput, setRoomIdInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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
      toast.success("Room created!", {
        description: `Room ID: ${response.roomId} — share it with others.`,
      });
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
          toast.error("Failed to join room", {
            description: response.error,
          });
          return;
        }
        toast.success("Joined successfully!", {
          description: `Welcome to room ${roomIdInput.trim()}, ${user.username}!`,
        });
        setRoom(roomIdInput.trim(), response.peers);
      },
    );
  };

  const reveal = (delay: string) =>
    `transition-all duration-500 ease-out ${delay} ${
      mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    }`;

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-[340px] flex flex-col items-center gap-9">
        {/* Avatar */}
        <div
          className={`${reveal("delay-[40ms]")} flex flex-col items-center gap-3`}
        >
          <div className="rounded-full animate-pulse ring-2 ring-primary/20">
            <Image
              src={user.avatarUrl}
              alt="avatar"
              width={72}
              height={72}
              className="rounded-full"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40">
            <span className="w-[7px] h-[7px] rounded-full bg-green-500 shrink-0 animate-pulse" />
            <span className="text-sm font-medium text-foreground tracking-tight">
              {user.username}
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className={`${reveal("delay-[120ms]")} text-center -mt-2`}>
          <h1 className="text-[1.6rem] font-semibold tracking-tight text-foreground leading-snug">
            Join or create a room
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a room ID below to get started.
          </p>
        </div>

        {/* Room ID Input */}
        <div className={`${reveal("delay-[200ms]")} w-full pb-6`}>
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
            {/* Animated underline */}
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

        {/* Buttons */}
        <div
          className={`${reveal("delay-[280ms]")} w-full flex flex-col gap-3 -mt-2`}
        >
          <Button
            onClick={handleJoinRoom}
            disabled={isJoining || isCreating}
            className="w-full h-11 gap-2 text-sm font-medium
                                   "
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
            className="w-full h-11 gap-2 text-sm font-medium
                                   "
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

        {/* Footer */}
        <p
          className={`${reveal("delay-[360ms]")} text-[0.68rem] text-muted-foreground/40 text-center -mt-3`}
        >
          Connected via WebSocket · End-to-end
        </p>
      </div>
    </div>
  );
}
