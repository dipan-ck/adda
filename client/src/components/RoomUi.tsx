"use client";

import {
    useRoomStore,
    type Participant,
    type VideoStream,
} from "@/store/roomStore";
import Image from "next/image";
import { socket } from "@/lib/socket";
import { useEffect, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Maximize2,
    Minimize2,
    MonitorPlay,
    Users,
    Copy,
    Check,
} from "lucide-react";
import RoomMenuDock from "./RoomMenuDock";
import { useMediasoup } from "@/hooks/useMediasoup";

export default function RoomUI() {
    const { roomId, participants, setParticipants } = useRoomStore();
    const videoStreams = useRoomStore((s) => s.videoStreams);
    const cameraStreamsByUser = useRoomStore((s) => s.cameraStreamsByUserId);
    const mediasoup = useMediasoup();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        socket.on("room-participants", setParticipants);
        return () => {
            socket.off("room-participants", setParticipants);
        };
    }, [setParticipants]);

    const screenStreams = Array.from(videoStreams.values()).filter(
        (v) => v.kind === "screen",
    );
    const hasScreenShare = screenStreams.length > 0;

    const copyRoomId = async () => {
        if (!roomId) return;
        await navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        // ✅ overflow-hidden on root prevents any horizontal scroll
        <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
            {/* ── HEADER ─────────────────────────────────────────────── */}
            <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border bg-background z-40">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                        <MonitorPlay className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold hidden sm:block">
                        StreamRoom
                    </span>
                </div>

                <button
                    onClick={copyRoomId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-accent border border-border transition-colors group"
                >
                    <span className="text-xs text-muted-foreground font-mono">
                        {roomId}
                    </span>
                    {copied ? (
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                    ) : (
                        <Copy className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                    )}
                </button>

                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm tabular-nums">
                        {participants.length}
                    </span>
                </div>
            </header>

            {/* ── MAIN ── flex-1 + min-h-0 is critical for inner scroll containment */}
            <main className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
                {/* PRESENTATION LAYOUT */}
                <div
                    className="absolute inset-0 flex gap-2 p-2 pb-24 overflow-hidden transition-all duration-400 ease-in-out"
                    style={{
                        opacity: hasScreenShare ? 1 : 0,
                        transform: hasScreenShare
                            ? "translateY(0)"
                            : "translateY(8px)",
                        pointerEvents: hasScreenShare ? "auto" : "none",
                    }}
                >
                    {/* Screen share area — flex-1 with min-w-0 prevents overflow */}
                    <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-2">
                        {screenStreams.length === 1 ? (
                            <ScreenShareTile
                                videoStream={screenStreams[0]}
                                className="flex-1 min-h-0"
                            />
                        ) : (
                            <div className="flex-1 min-h-0 grid grid-cols-2 gap-2">
                                {screenStreams.map((vs) => (
                                    <ScreenShareTile
                                        key={vs.producerId}
                                        videoStream={vs}
                                        className="min-h-0"
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar — fixed width, scrollable */}
                    <div className="w-44 flex-shrink-0 flex flex-col gap-2 overflow-y-auto overflow-x-hidden">
                        {participants.map((p) => (
                            <ParticipantCard
                                key={p.userId}
                                participant={p}
                                cameraStream={
                                    cameraStreamsByUser.get(p.userId) ?? null
                                }
                                compact
                            />
                        ))}
                    </div>
                </div>

                {/* GALLERY LAYOUT */}
                <div
                    className="absolute inset-0 p-3 pb-24 overflow-y-auto overflow-x-hidden transition-all duration-400 ease-in-out"
                    style={{
                        opacity: hasScreenShare ? 0 : 1,
                        transform: hasScreenShare
                            ? "translateY(-8px)"
                            : "translateY(0)",
                        pointerEvents: hasScreenShare ? "none" : "auto",
                    }}
                >
                    {participants.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <Users className="h-10 w-10 opacity-20" />
                            <p className="text-sm">Waiting for participants…</p>
                        </div>
                    ) : (
                        <GalleryGrid
                            participants={participants}
                            cameraStreamsByUser={cameraStreamsByUser}
                        />
                    )}
                </div>
            </main>

            <RoomMenuDock {...mediasoup} />
        </div>
    );
}

/* ─────────────────────────────────────────────────── */
/* GALLERY GRID                                        */
/* Tiles always fit within the viewport — no overflow  */
/* ─────────────────────────────────────────────────── */
function GalleryGrid({
    participants,
    cameraStreamsByUser,
}: {
    participants: Participant[];
    cameraStreamsByUser: Map<string, MediaStream>;
}) {
    const n = participants.length;
    // Grid columns: keep tiles from getting too wide
    const cols = n === 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;

    return (
        <div
            className="w-full h-full grid gap-2"
            style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                // Auto-rows stretch to fill remaining height evenly
                gridAutoRows: "1fr",
            }}
        >
            {participants.map((p) => (
                <ParticipantCard
                    key={p.userId}
                    participant={p}
                    cameraStream={cameraStreamsByUser.get(p.userId) ?? null}
                />
            ))}
        </div>
    );
}

/* ─────────────────────────────────────────────────── */
/* SCREEN SHARE TILE                                   */
/* ─────────────────────────────────────────────────── */
function ScreenShareTile({
    videoStream,
    className = "",
}: {
    videoStream: VideoStream;
    className?: string;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFs, setIsFs] = useState(false);

    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = videoStream.stream;
    }, [videoStream.stream]);

    useEffect(() => {
        const h = () =>
            setIsFs(document.fullscreenElement === containerRef.current);
        document.addEventListener("fullscreenchange", h);
        return () => document.removeEventListener("fullscreenchange", h);
    }, []);

    const toggleFs = useCallback(async () => {
        if (!containerRef.current) return;
        document.fullscreenElement
            ? await document.exitFullscreen()
            : await containerRef.current.requestFullscreen();
    }, []);

    return (
        <div
            ref={containerRef}
            className={`relative flex items-center justify-center bg-black rounded-xl overflow-hidden group border border-border ${className}`}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
            />

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] text-foreground/70 font-medium">
                    Screen
                </span>
            </div>

            <button
                onClick={toggleFs}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground border border-border opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
                {isFs ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                )}
            </button>
        </div>
    );
}


function VideoEl({
    stream,
    className,
    muted = true,
}: {
    stream: MediaStream | null;
    className?: string;
    muted?: boolean;
}) {
    // Callback ref — called synchronously when element mounts
    const attach = useCallback(
        (el: HTMLVideoElement | null) => {
            if (!el) return;
            if (el.srcObject !== stream) {
                el.srcObject = stream;
            }
            if (stream) el.play().catch(() => {});
        },
        [stream],
    );

    return (
        <video
            ref={attach}
            autoPlay
            playsInline
            muted={muted}
            className={className}
        />
    );
}

/* ─────────────────────────────────────────────────── */
/* PARTICIPANT CARD                                    */
/* ─────────────────────────────────────────────────── */
function ParticipantCard({
    participant: p,
    cameraStream,
    compact = false,
}: {
    participant: Participant;
    cameraStream: MediaStream | null;
    compact?: boolean;
}) {
    const hasCamera = !!cameraStream;

    if (compact) {
        return (
            <div className="relative rounded-lg overflow-hidden bg-card border border-border flex-shrink-0 aspect-video">
                <VideoEl
                    stream={cameraStream}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                    muted
                />
                {/* Avatar layer — sits on top when no camera */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 bg-card transition-opacity duration-300"
                    style={{
                        opacity: hasCamera ? 0 : 1,
                        pointerEvents: hasCamera ? "none" : "auto",
                    }}
                >
                    <Image
                        src={p.avatarUrl}
                        alt={p.username}
                        width={28}
                        height={28}
                        className="rounded-full ring-1 ring-border"
                    />
                    <span className="text-[9px] text-muted-foreground text-center truncate w-full leading-tight">
                        {p.username}
                    </span>
                </div>
                <div
                    className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 transition-opacity duration-300"
                    style={{ opacity: hasCamera ? 1 : 0 }}
                >
                    <span className="text-[9px] font-medium text-white truncate block">
                        {p.username}
                    </span>
                </div>
            </div>
        );
    }

    /* Gallery tile */
    return (
        <div className="relative rounded-xl overflow-hidden bg-card border border-border group w-full h-full flex items-center justify-center min-h-0">
            {/* Video — always rendered, opacity driven by hasCamera */}
            <VideoEl
                stream={cameraStream}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                muted
            />

            {/* Avatar — fades when camera is on */}
            <div
                className="relative z-10 flex flex-col items-center gap-2 p-4 w-full transition-opacity duration-300"
                style={{
                    opacity: hasCamera ? 0 : 1,
                    pointerEvents: hasCamera ? "none" : "auto",
                }}
            >
                <div className="relative">
                    <Image
                        src={p.avatarUrl}
                        alt={p.username}
                        width={56}
                        height={56}
                        className="rounded-full ring-2 ring-border"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
                </div>
                <span className="text-sm font-medium text-card-foreground text-center truncate w-full max-w-[120px]">
                    {p.username}
                </span>
            </div>

            {/* Camera overlays */}
            <div
                className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 z-20 transition-opacity duration-300"
                style={{ opacity: hasCamera ? 1 : 0 }}
            >
                <span className="text-xs font-medium text-white truncate block">
                    {p.username}
                </span>
            </div>

            <Badge
                variant="secondary"
                className="absolute top-2 right-2 z-20 gap-1 text-[9px] uppercase tracking-widest transition-opacity duration-300"
                style={{ opacity: hasCamera ? 1 : 0 }}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
            </Badge>
        </div>
    );
}
