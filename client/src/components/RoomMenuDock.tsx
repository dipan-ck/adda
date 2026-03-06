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

type StreamQuality = "low" | "medium" | "high" | "ultra";

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
  cleanup,
  unmute,
  deafen,
  undeafen,
  startScreenShare,
  stopScreenShare,
}: {
  mute: () => void;
  cleanup: () => void;
  unmute: () => void;
  deafen: () => void;
  undeafen: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [noiseCancel, setNoiseCancel] = useState(true);
  const [micVol, setMicVol] = useState(100);
  const [speakerVol, setSpeakerVol] = useState(100);
  const [cameraOn, setCameraOn] = useState(false);
  const [quality, setQuality] = useState<StreamQuality>("high");
  const [noisePending, setNoisePending] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  const leaveRoom = useRoomStore((state) => state.leaveRoom);

  const handleMuteToggle = () => {
    if (isMuted) {
      unmute();
      setIsMuted(false);
    } else {
      mute();
      setIsMuted(true);
    }
  };

  const handleDeafenToggle = () => {
    if (isDeafened) {
      undeafen();
      setIsDeafened(false);
    } else {
      deafen();
      setIsDeafened(true);
    }
  };

  const handleScreenShare = async () => {
    if (isSharingScreen) {
      stopScreenShare();
      setIsSharingScreen(false);
    } else {
      try {
        await startScreenShare();
        setIsSharingScreen(true);
      } catch {
        /* user cancelled */
      }
    }
  };

  const handleLeave = () => {
    socket.disconnect();
    cleanup();
    leaveRoom();
  };

  const currentBadge =
    QUALITY_OPTIONS.find((o) => o.value === quality)?.badge ?? "1080p";

  // ── Shared icon-button size — larger tap targets on mobile ───────────────
  const iconBtn =
    "rounded-xl h-11 w-11 sm:h-10 sm:w-10 touch-manipulation transition-all";

  return (
    <TooltipProvider delayDuration={0}>
      {/*
        The dock is pinned to the bottom.
        On mobile it spans full width with safe-area padding.
        On sm+ it floats as a pill.
      */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50
                   sm:bottom-5 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-auto"
        style={{
          // iOS home bar safe area
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Inner container:
            mobile  = full-width bar with rounded top corners
            sm+     = floating pill */}
        <div
          className="flex items-center justify-center
                     gap-0 sm:gap-0.5
                     px-2 sm:px-2 py-2 sm:py-1.5
                     bg-popover border-t sm:border border-border
                     rounded-t-2xl sm:rounded-2xl
                     shadow-lg shadow-black/10
                     overflow-x-auto sm:overflow-x-visible
                     scrollbar-none"
        >
          {/* ══ MIC ══════════════════════════════════════ */}
          <Popover>
            <div className="flex items-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMuteToggle}
                    className={`${iconBtn} ${
                      isMuted
                        ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                  className="hidden sm:block"
                >
                  {isMuted ? "Unmute" : "Mute"}
                </TooltipContent>
              </Tooltip>

              {/* Chevron hidden on mobile to save space */}
              <PopoverTrigger asChild>
                <button
                  className="hidden sm:flex h-8 w-4 items-center justify-center
                             text-muted-foreground/50 hover:text-muted-foreground
                             transition-colors focus:outline-none touch-manipulation"
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
              // On mobile open upward and fill width sensibly
              className="w-[min(16rem,90vw)] p-4 rounded-xl"
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Microphone
              </p>
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Input volume
                    </Label>
                    <span className="text-xs font-mono text-foreground tabular-nums w-8 text-right">
                      {micVol}%
                    </span>
                  </div>
                  <Slider
                    value={[micVol]}
                    onValueChange={([v]) => setMicVol(v)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Waves className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs">Noise suppression</Label>
                  </div>
                  <Switch
                    checked={noiseCancel}
                    onCheckedChange={setNoiseCancel}
                    disabled={noisePending}
                    className="scale-90"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* ══ SPEAKER ══════════════════════════════════ */}
          <Popover>
            <div className="flex items-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeafenToggle}
                    className={`${iconBtn} ${
                      isDeafened
                        ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                  className="hidden sm:block"
                >
                  {isDeafened ? "Undeafen" : "Deafen"}
                </TooltipContent>
              </Tooltip>

              <PopoverTrigger asChild>
                <button
                  className="hidden sm:flex h-8 w-4 items-center justify-center
                             text-muted-foreground/50 hover:text-muted-foreground
                             transition-colors focus:outline-none touch-manipulation"
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
              className="w-[min(16rem,90vw)] p-4 rounded-xl"
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Speaker
              </p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Output volume
                  </Label>
                  <span className="text-xs font-mono text-foreground tabular-nums w-8 text-right">
                    {speakerVol}%
                  </span>
                </div>
                <Slider
                  value={[speakerVol]}
                  onValueChange={([v]) => setSpeakerVol(v)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-5 bg-border mx-1 shrink-0" />

          {/* ══ CAMERA ═══════════════════════════════════ */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCameraOn((v) => !v)}
                className={`${iconBtn} shrink-0 ${
                  cameraOn
                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
              className="hidden sm:block"
            >
              {cameraOn ? "Stop camera" : "Share camera"}
            </TooltipContent>
          </Tooltip>

          {/* ══ SCREEN SHARE ═════════════════════════════
              Hidden on mobile — screen sharing from phones is rarely useful
              and getDisplayMedia is not widely supported on mobile browsers.
          ══ */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleScreenShare}
                className={`${iconBtn} shrink-0 hidden sm:inline-flex ${
                  isSharingScreen
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {isSharingScreen ? (
                  <MonitorOff className="h-[18px] w-[18px]" />
                ) : (
                  <MonitorUp className="h-[18px] w-[18px]" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              className="hidden sm:block"
            >
              {isSharingScreen ? "Stop sharing" : "Share screen"}
            </TooltipContent>
          </Tooltip>

          {/* ══ QUALITY ══════════════════════════════════ */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0 hidden sm:inline-flex">
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-11 sm:h-10 px-1.5 flex items-center focus:outline-none touch-manipulation"
                      aria-label="Stream quality"
                    >
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono px-1.5 h-[18px]
                                   text-muted-foreground hover:text-foreground
                                   cursor-pointer transition-colors"
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
                className="hidden sm:block"
              >
                Stream quality
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent
              side="top"
              align="end"
              sideOffset={12}
              className="rounded-xl w-48 p-1"
            >
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest font-normal px-2 py-1.5">
                Stream quality
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={quality}
                onValueChange={(q) => setQuality(q as StreamQuality)}
              >
                {QUALITY_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs cursor-pointer px-2 py-2 rounded-lg touch-manipulation"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-muted-foreground text-[10px] tabular-nums">
                        {opt.desc}
                      </span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-border mx-1 shrink-0" />

          {/* ══ LEAVE ════════════════════════════════════ */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="destructive"
                onClick={handleLeave}
                className={`${iconBtn} shrink-0`}
              >
                <PhoneOff className="h-[18px] w-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              className="hidden sm:block"
            >
              Leave room
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
