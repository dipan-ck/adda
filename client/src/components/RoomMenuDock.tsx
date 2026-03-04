"use client";

import {
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    MonitorUp,
    MonitorOff,
    PhoneOff,
    Waves,
    ChevronUp,
    Camera,
    CameraOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { socket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";
import { useState } from "react";
import type { StreamQuality } from "@/hooks/useMediasoup";

type Props = {
    mute: () => void;
    unmute: () => void;
    deafen: () => void;
    undeafen: () => void;
    setMicVolume: (v: number) => void;
    setSpeakerVolume: (v: number) => void;
    setNoiseCancellation: (enabled: boolean) => Promise<void>;
    startScreenShare: (quality?: StreamQuality) => Promise<void>;
    stopScreenShare: () => void;
    changeStreamQuality: (quality: StreamQuality) => Promise<void>;
    startCameraShare: () => Promise<void>;
    stopCameraShare: () => void;
    isScreenSharing: () => boolean;
    isCameraSharing: () => boolean;
};

const QUALITY_OPTIONS: {
    value: StreamQuality;
    label: string;
    desc: string;
    badge: string;
}[] = [
    { value: "low", label: "Low", desc: "480p · 15 fps", badge: "480p" },
    { value: "medium", label: "Medium", desc: "720p · 30 fps", badge: "720p" },
    { value: "high", label: "High", desc: "1080p · 30 fps", badge: "1080p" },
    { value: "ultra", label: "Ultra", desc: "1080p · 60 fps", badge: "60fps" },
];

export default function RoomMenuDock({
    mute,
    unmute,
    deafen,
    undeafen,
    setMicVolume,
    setSpeakerVolume,
    setNoiseCancellation,
    startScreenShare,
    stopScreenShare,
    changeStreamQuality,
    startCameraShare,
    stopCameraShare,
}: Props) {
    const { leaveRoom } = useRoomStore();

    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [noiseCancel, setNoiseCancel] = useState(true);
    const [micVol, setMicVol] = useState(100);
    const [speakerVol, setSpeakerVol] = useState(100);
    const [sharing, setSharing] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);
    const [quality, setQuality] = useState<StreamQuality>("high");
    const [noisePending, setNoisePending] = useState(false);

    const handleMuteToggle = () => {
        isMuted ? unmute() : mute();
        setIsMuted((v) => !v);
    };

    const handleDeafenToggle = () => {
        isDeafened ? undeafen() : deafen();
        setIsDeafened((v) => !v);
    };

    const handleMicVolChange = ([v]: number[]) => {
        setMicVol(v);
        setMicVolume(v / 100);
    };

    const handleSpeakerVolChange = ([v]: number[]) => {
        setSpeakerVol(v);
        setSpeakerVolume(v / 100);
    };

    const handleNoiseCancelToggle = async (val: boolean) => {
        setNoiseCancel(val);
        setNoisePending(true);
        try {
            await setNoiseCancellation(val);
        } finally {
            setNoisePending(false);
        }
    };

    const handleScreenShare = async () => {
        if (sharing) {
            stopScreenShare();
            setSharing(false);
        } else {
            try {
                await startScreenShare(quality);
                setSharing(true);
            } catch {
                // User cancelled picker
            }
        }
    };

    const handleQualityChange = async (q: string) => {
        const next = q as StreamQuality;
        setQuality(next);
        if (sharing) await changeStreamQuality(next);
    };

    const handleCameraToggle = async () => {
        if (cameraOn) {
            stopCameraShare();
            setCameraOn(false);
        } else {
            try {
                await startCameraShare();
                setCameraOn(true);
            } catch {
                // User denied permission
            }
        }
    };

    const handleLeave = () => {
        socket.disconnect();
        leaveRoom();
    };

    const currentBadge =
        QUALITY_OPTIONS.find((o) => o.value === quality)?.badge ?? "1080p";

    return (
        // TooltipProvider MUST wrap everything; using delayDuration=0 for reliability
        <TooltipProvider delayDuration={0}>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/[0.07] shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
                    {/* ══ MIC ══════════════════════════════════════ */}
                    <Popover>
                        <div className="flex items-center">
                            {/* Mic mute button */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleMuteToggle}
                                        className={`rounded-xl h-10 w-10 transition-all ${
                                            isMuted
                                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                : "text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                                        }`}
                                    >
                                        {isMuted ? (
                                            <MicOff className="h-[18px] w-[18px]" />
                                        ) : (
                                            <Mic className="h-[18px] w-[18px]" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    sideOffset={8}
                                    className="bg-zinc-800 border-white/10 text-zinc-200 text-xs px-2 py-1"
                                >
                                    {isMuted ? "Unmute" : "Mute"}
                                </TooltipContent>
                            </Tooltip>

                            {/* Mic settings chevron — NOTE: PopoverTrigger is NOT wrapped
                                in Tooltip here to avoid asChild nesting conflicts */}
                            <PopoverTrigger asChild>
                                <button
                                    className="h-8 w-4 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors focus:outline-none"
                                    aria-label="Mic settings"
                                >
                                    <ChevronUp className="h-3 w-3" />
                                </button>
                            </PopoverTrigger>
                        </div>

                        <PopoverContent
                            side="top"
                            align="start"
                            sideOffset={12}
                            className="w-64 bg-zinc-900 border-white/[0.08] p-4 rounded-xl shadow-2xl"
                        >
                            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                                Microphone
                            </p>
                            <div className="space-y-4">
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-zinc-400">
                                            Input volume
                                        </Label>
                                        <span className="text-xs font-mono text-zinc-300 tabular-nums w-8 text-right">
                                            {micVol}%
                                        </span>
                                    </div>
                                    <Slider
                                        value={[micVol]}
                                        onValueChange={handleMicVolChange}
                                        min={0}
                                        max={100}
                                        step={1}
                                    />
                                </div>

                                <Separator className="bg-white/[0.06]" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Waves className="h-3.5 w-3.5 text-zinc-400" />
                                        <Label className="text-xs text-zinc-300">
                                            Noise suppression
                                        </Label>
                                    </div>
                                    <Switch
                                        checked={noiseCancel}
                                        onCheckedChange={
                                            handleNoiseCancelToggle
                                        }
                                        disabled={noisePending}
                                        className="data-[state=checked]:bg-emerald-500 scale-90"
                                    />
                                </div>

                                {noisePending && (
                                    <p className="text-[10px] text-zinc-500 text-center animate-pulse">
                                        Updating microphone…
                                    </p>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* ══ SPEAKER ══════════════════════════════════ */}
                    <Popover>
                        <div className="flex items-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleDeafenToggle}
                                        className={`rounded-xl h-10 w-10 transition-all ${
                                            isDeafened
                                                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                                : "text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                                        }`}
                                    >
                                        {isDeafened ? (
                                            <VolumeX className="h-[18px] w-[18px]" />
                                        ) : (
                                            <Volume2 className="h-[18px] w-[18px]" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    sideOffset={8}
                                    className="bg-zinc-800 border-white/10 text-zinc-200 text-xs px-2 py-1"
                                >
                                    {isDeafened ? "Undeafen" : "Deafen"}
                                </TooltipContent>
                            </Tooltip>

                            <PopoverTrigger asChild>
                                <button
                                    className="h-8 w-4 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors focus:outline-none"
                                    aria-label="Speaker settings"
                                >
                                    <ChevronUp className="h-3 w-3" />
                                </button>
                            </PopoverTrigger>
                        </div>

                        <PopoverContent
                            side="top"
                            align="start"
                            sideOffset={12}
                            className="w-64 bg-zinc-900 border-white/[0.08] p-4 rounded-xl shadow-2xl"
                        >
                            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                                Speaker
                            </p>
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-zinc-400">
                                        Output volume
                                    </Label>
                                    <span className="text-xs font-mono text-zinc-300 tabular-nums w-8 text-right">
                                        {speakerVol}%
                                    </span>
                                </div>
                                <Slider
                                    value={[speakerVol]}
                                    onValueChange={handleSpeakerVolChange}
                                    min={0}
                                    max={100}
                                    step={1}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="w-px h-5 bg-white/[0.06] mx-1" />

                    {/* ══ CAMERA ═══════════════════════════════════ */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCameraToggle}
                                className={`rounded-xl h-10 w-10 transition-all ${
                                    cameraOn
                                        ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                                        : "text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                                }`}
                            >
                                {cameraOn ? (
                                    <CameraOff className="h-[18px] w-[18px]" />
                                ) : (
                                    <Camera className="h-[18px] w-[18px]" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            sideOffset={8}
                            className="bg-zinc-800 border-white/10 text-zinc-200 text-xs px-2 py-1"
                        >
                            {cameraOn ? "Stop camera" : "Share camera"}
                        </TooltipContent>
                    </Tooltip>

                    {/* ══ SCREEN SHARE ═════════════════════════════ */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleScreenShare}
                                className={`rounded-xl h-10 w-10 transition-all ${
                                    sharing
                                        ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                        : "text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                                }`}
                            >
                                {sharing ? (
                                    <MonitorOff className="h-[18px] w-[18px]" />
                                ) : (
                                    <MonitorUp className="h-[18px] w-[18px]" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            sideOffset={8}
                            className="bg-zinc-800 border-white/10 text-zinc-200 text-xs px-2 py-1"
                        >
                            {sharing ? "Stop sharing" : "Share screen"}
                        </TooltipContent>
                    </Tooltip>

                    {/* Quality picker — Tooltip wraps the trigger span, NOT the DropdownMenuTrigger
                        directly, to avoid the asChild nesting conflict that hides tooltips */}
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {/* Extra wrapper span so Tooltip's ref doesn't conflict
                                    with DropdownMenuTrigger's ref */}
                                <span>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="h-10 px-1.5 flex items-center focus:outline-none"
                                            aria-label="Stream quality"
                                        >
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-mono px-1.5 h-[18px] border-white/10 text-zinc-500 bg-transparent hover:border-white/20 hover:text-zinc-300 cursor-pointer transition-colors"
                                            >
                                                {currentBadge}
                                            </Badge>
                                        </button>
                                    </DropdownMenuTrigger>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent
                                side="top"
                                sideOffset={8}
                                className="bg-zinc-800 border-white/10 text-zinc-200 text-xs px-2 py-1"
                            >
                                Stream quality
                            </TooltipContent>
                        </Tooltip>

                        <DropdownMenuContent
                            side="top"
                            align="end"
                            sideOffset={12}
                            className="bg-zinc-900 border-white/[0.08] rounded-xl shadow-2xl w-48 p-1"
                        >
                            <DropdownMenuLabel className="text-[10px] text-zinc-500 uppercase tracking-widest font-normal px-2 py-1.5">
                                Stream quality
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                            <DropdownMenuRadioGroup
                                value={quality}
                                onValueChange={handleQualityChange}
                            >
                                {QUALITY_OPTIONS.map((opt) => (
                                    <DropdownMenuRadioItem
                                        key={opt.value}
                                        value={opt.value}
                                        className="text-xs text-zinc-300 focus:bg-white/[0.08] focus:text-white cursor-pointer px-2 py-2 rounded-lg"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-medium">
                                                {opt.label}
                                            </span>
                                            <span className="text-zinc-500 text-[10px] tabular-nums">
                                                {opt.desc}
                                            </span>
                                        </div>
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="w-px h-5 bg-white/[0.06] mx-1" />

                    {/* ══ LEAVE ════════════════════════════════════ */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                onClick={handleLeave}
                                className="rounded-xl h-10 w-10 bg-red-500/90 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all"
                            >
                                <PhoneOff className="h-[18px] w-[18px]" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            sideOffset={8}
                            className="bg-zinc-800 border-white/10 text-zinc-200 text-xs px-2 py-1"
                        >
                            Leave room
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
}
