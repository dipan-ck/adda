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
  Share2,
  Copy,
  Check,
  X,
  Link2,
  Hash,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { socket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";
import { useState } from "react";

type ScreenQuality = "480p" | "720p30" | "720p60" | "1080p30" | "1080p60";

const QUALITY_OPTIONS: {
  value: ScreenQuality;
  label: string;
  desc: string;
  badge: string;
}[] = [
  { value: "480p", label: "Low", desc: "480p · 30 fps", badge: "480p" },
  { value: "720p30", label: "Medium", desc: "720p · 30 fps", badge: "720p" },
  { value: "720p60", label: "High", desc: "720p · 60 fps", badge: "720p60" },
  { value: "1080p30", label: "Ultra", desc: "1080p · 30 fps", badge: "1080p" },
  { value: "1080p60", label: "Max", desc: "1080p · 60 fps", badge: "60fps" },
];

function ShareModal({
  open,
  onClose,
  roomId,
}: {
  open: boolean;
  onClose: () => void;
  roomId: string | null;
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const roomLink = `https://adda.dipan.cc?roomId=${roomId}`;

  const handleCopy = async (text: string, type: "id" | "link") => {
    await navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0 border border-border">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Share2 className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-base font-semibold">
                Invite to room
              </DialogTitle>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-left">
            Share the room ID or link so others can join instantly.
          </p>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          {/* Room ID row */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="p-1.5 rounded-md bg-background border border-border shrink-0">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
                Room ID
              </p>
              <p className="font-mono text-sm font-semibold text-foreground tracking-wider truncate">
                {roomId}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(roomId!, "id")}
                  className="h-8 w-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {copiedId ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {copiedId ? "Copied!" : "Copy ID"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Invite Link row */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="p-1.5 rounded-md bg-background border border-border shrink-0">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
                Invite Link
              </p>
              <p className="font-mono text-[11px] text-muted-foreground truncate">
                {roomLink}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(roomLink, "link")}
                  className="h-8 w-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {copiedLink ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {copiedLink ? "Copied!" : "Copy link"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <Button onClick={onClose} className="w-full rounded-xl h-9 text-sm">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RoomMenuDock({
  mute,
  cleanup,
  unmute,
  deafen,
  undeafen,
  startScreenShare,
  stopScreenShare,
  changeScreenShareQuality,
}: {
  mute: () => void;
  cleanup: () => void;
  unmute: () => void;
  deafen: () => void;
  undeafen: () => void;
  startScreenShare: (quality?: ScreenQuality) => Promise<void>;
  stopScreenShare: () => void;
  changeScreenShareQuality: (quality: ScreenQuality) => Promise<void>;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [noiseCancel, setNoiseCancel] = useState(true);
  const [micVol, setMicVol] = useState(100);
  const [speakerVol, setSpeakerVol] = useState(100);
  const [cameraOn, setCameraOn] = useState(false);
  const [quality, setQuality] = useState<ScreenQuality>("720p60");
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const roomId = useRoomStore((s) => s.roomId);

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
        await startScreenShare(quality);
        setIsSharingScreen(true);
      } catch {
        /* user cancelled */
      }
    }
  };

  const handleQualityChange = async (q: ScreenQuality) => {
    setQuality(q);
    if (isSharingScreen) await changeScreenShareQuality(q);
  };

  const handleLeave = () => {
    socket.disconnect();
    cleanup();
    leaveRoom();
  };

  const currentBadge =
    QUALITY_OPTIONS.find((o) => o.value === quality)?.badge ?? "720p60";
  const iconBtn = "rounded-xl h-9 w-9 touch-manipulation transition-all";

  return (
    <TooltipProvider delayDuration={0}>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        roomId={roomId}
      />

      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-center gap-0.5 px-2 py-1.5 bg-popover border border-border rounded-2xl shadow-lg shadow-black/10">
          {/* ══ MIC ══════════════════════════════════════ */}
          <Popover>
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMuteToggle}
                    className={`${iconBtn} ${isMuted ? "bg-destructive/15 text-destructive hover:bg-destructive/25" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                  >
                    {isMuted ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {isMuted ? "Unmute" : "Mute"}
                </TooltipContent>
              </Tooltip>
              <PopoverTrigger asChild>
                <button
                  className="flex h-8 w-4 items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none touch-manipulation"
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
              className="w-64 p-4 rounded-xl"
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
                    className="scale-90"
                  />
                </div>
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
                    className={`${iconBtn} ${isDeafened ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/25" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                  >
                    {isDeafened ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {isDeafened ? "Undeafen" : "Deafen"}
                </TooltipContent>
              </Tooltip>
              <PopoverTrigger asChild>
                <button
                  className="flex h-8 w-4 items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none touch-manipulation"
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
              className="w-64 p-4 rounded-xl"
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
                className={`${iconBtn} ${cameraOn ? "bg-primary/15 text-primary hover:bg-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                {cameraOn ? (
                  <CameraOff className="h-4 w-4" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
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
                className={`${iconBtn} ${isSharingScreen ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                {isSharingScreen ? (
                  <MonitorOff className="h-4 w-4" />
                ) : (
                  <MonitorUp className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {isSharingScreen ? "Stop sharing" : "Share screen"}
            </TooltipContent>
          </Tooltip>

          {/* ══ INVITE / SHARE ═══════════════════════════ */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShareOpen(true)}
                className={`${iconBtn} text-muted-foreground hover:text-foreground hover:bg-accent`}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Invite
            </TooltipContent>
          </Tooltip>

          {/* ══ QUALITY ══════════════════════════════════ */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-9 px-1.5 flex items-center focus:outline-none touch-manipulation"
                      aria-label="Stream quality"
                    >
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono px-1.5 h-[18px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        {currentBadge}
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
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
                onValueChange={(q) => handleQualityChange(q as ScreenQuality)}
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
                className={iconBtn}
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Leave room
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
