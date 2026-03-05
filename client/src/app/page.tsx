"use client";
import Image from "next/image";
import { generateUser } from "../lib/generate_user";
import { useUserStore } from "@/store/userStore";
import { useEffect, useState, useRef } from "react";
import { useRoomStore } from "@/store/roomStore";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import RoomUI from "@/components/RoomUi";

export default function Home() {
    const { user, setUser } = useUserStore();
    const { isInRoom, setRoom } = useRoomStore();
    const [roomIdInput, setRoomIdInput] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [focused, setFocused] = useState(false);
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) setUser(generateUser());
        const t = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(t);
    }, [user, setUser]);

    if (!user) return null;
    if (isInRoom) return <RoomUI />;

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
            setRoom(response.roomId, user.userId);
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
                setRoom(roomIdInput.trim(), user.userId);
            },
        );
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

        .home-root { font-family: 'DM Sans', sans-serif; }

        .reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s cubic-bezier(0.22,1,0.36,1),
                      transform 0.5s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal.show { opacity: 1; transform: translateY(0); }
        .d1 { transition-delay: 0.04s; }
        .d2 { transition-delay: 0.12s; }
        .d3 { transition-delay: 0.20s; }
        .d4 { transition-delay: 0.28s; }
        .d5 { transition-delay: 0.36s; }

        @keyframes ring-pulse {
          0%   { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.2); }
          70%  { box-shadow: 0 0 0 10px hsl(var(--primary) / 0); }
          100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
        }
        .avatar-ring {
          border-radius: 9999px;
          animation: ring-pulse 3s ease-out infinite;
        }

        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: hsl(142 71% 45%);
          flex-shrink: 0;
        }
        @keyframes dot-blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.25; }
        }
        .status-dot { animation: dot-blink 2.2s ease-in-out infinite; }

        /* Room ID input */
        .rid-wrap { position: relative; width: 100%; }
        .rid-input {
          font-family: 'DM Mono', monospace;
          font-size: 1.9rem;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-align: center;
          text-transform: uppercase;
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: hsl(var(--foreground));
          padding: 0.4rem 0 0.8rem;
          caret-color: hsl(var(--primary));
          transition: letter-spacing 0.2s ease;
        }
        .rid-input::placeholder {
          color: hsl(var(--muted-foreground) / 0.35);
          letter-spacing: 0.06em;
          font-size: 1rem;
          font-weight: 400;
          font-family: 'DM Sans', sans-serif;
          text-transform: none;
        }
        .rid-line {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: hsl(var(--border));
        }
        .rid-line::after {
          content: '';
          position: absolute;
          inset: 0;
          background: hsl(var(--foreground));
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
          height: 2px;
          top: -0.5px;
        }
        .rid-wrap.focused .rid-line::after { transform: scaleX(1); }

        /* Char count dot */
        .rid-count {
          position: absolute;
          right: 0;
          bottom: -20px;
          font-size: 0.65rem;
          font-family: 'DM Mono', monospace;
          color: hsl(var(--muted-foreground) / 0.4);
          letter-spacing: 0.05em;
          transition: opacity 0.2s;
        }

        .divider-line { flex: 1; height: 1px; background: hsl(var(--border)); }
        .divider-text {
          font-size: 0.62rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground) / 0.5);
        }

        .btn-primary-custom, .btn-secondary-custom {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-primary-custom:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px hsl(var(--primary) / 0.18);
        }
        .btn-primary-custom:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
        .btn-secondary-custom:hover:not(:disabled) { transform: translateY(-1px); }
        .btn-secondary-custom:active:not(:disabled) { transform: translateY(0); }
      `}</style>

            <div className="home-root flex items-center justify-center min-h-screen p-6">
                <div className="w-full max-w-[340px] flex flex-col items-center gap-9">
                    {/* Avatar */}
                    <div
                        className={`reveal d1 ${mounted ? "show" : ""} flex flex-col items-center gap-3`}
                    >
                        <div className="avatar-ring">
                            <Image
                                src={user.avatarUrl}
                                alt="avatar"
                                width={72}
                                height={72}
                                className="rounded-full"
                            />
                        </div>
                        {/* Username pill */}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40">
                            <span className="status-dot" />
                            <span className="text-sm font-medium text-foreground tracking-tight">
                                {user.username}
                            </span>
                        </div>
                    </div>

                    {/* Heading */}
                    <div
                        className={`reveal d2 ${mounted ? "show" : ""} text-center -mt-2`}
                    >
                        <h1 className="text-[1.6rem] font-semibold tracking-tight text-foreground leading-snug">
                            Join or create a room
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Enter a room ID below to get started.
                        </p>
                    </div>

                    {/* Room ID Input */}
                    <div
                        className={`reveal d3 ${mounted ? "show" : ""} w-full pb-6`}
                    >
                        <div className={`rid-wrap ${focused ? "focused" : ""}`}>
                            <input
                                ref={inputRef}
                                className="rid-input"
                                placeholder="Enter room ID"
                                value={roomIdInput}
                                onChange={(e) => setRoomIdInput(e.target.value)}
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                                onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    !isJoining &&
                                    handleJoinRoom()
                                }
                                disabled={isJoining || isCreating}
                                maxLength={12}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <div className="rid-line" />
                            {roomIdInput.length > 0 && (
                                <span className="rid-count">
                                    {roomIdInput.length}/12
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div
                        className={`reveal d4 ${mounted ? "show" : ""} w-full flex flex-col gap-3 -mt-2`}
                    >
                        <Button
                            onClick={handleJoinRoom}
                            disabled={isJoining || isCreating}
                            className="btn-primary-custom w-full h-11 gap-2 text-sm font-medium"
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
                            <div className="divider-line" />
                            <span className="divider-text">or</span>
                            <div className="divider-line" />
                        </div>

                        <Button
                            variant="secondary"
                            onClick={handleCreateRoom}
                            disabled={isJoining || isCreating}
                            className="btn-secondary-custom w-full h-11 gap-2 text-sm font-medium"
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
                        className={`reveal d5 ${mounted ? "show" : ""} text-[0.68rem] text-muted-foreground/40 text-center -mt-3`}
                    >
                        Connected via WebSocket · End-to-end
                    </p>
                </div>
            </div>
        </>
    );
}
