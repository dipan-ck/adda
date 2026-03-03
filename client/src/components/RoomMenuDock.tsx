"use client";

import {
  useState,
  useContext,
  createContext,
  useContext as useCtx,
} from "react";
import {
  Mic,
  MicOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { socket } from "@/lib/socket";
import { useRoomStore } from "@/store/roomStore";
import {
  SCREEN_QUALITY_PRESETS,
  type ScreenShareQuality,
} from "@/hooks/useMediasoup";

type Props = {
  onMute: () => void;
  onUnmute: () => void;
  onStartScreenShare: (quality: ScreenShareQuality) => void;
  onStopScreenShare: () => void;
  isScreenSharing: boolean;
};

export default function RoomMenuDock({
  onMute,
  onUnmute,
  onStartScreenShare,
  onStopScreenShare,
  isScreenSharing,
}: Props) {
  const { leaveRoom } = useRoomStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<ScreenShareQuality>(
    SCREEN_QUALITY_PRESETS[2],
  );

  const handleLeave = () => {
    socket.disconnect();
    leaveRoom();
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      onUnmute();
      setIsMuted(false);
    } else {
      onMute();
      setIsMuted(true);
    }
  };

  const handleDeafenToggle = () => {
    // Deafen = mute all incoming audio via gain nodes (future impl)
    // For now we toggle visual state + mute self too
    const next = !isDeafened;
    setIsDeafened(next);
    if (next && !isMuted) {
      onMute();
      setIsMuted(true);
    }
  };

  const handleScreenShare = () => {
    if (isScreenSharing) {
      onStopScreenShare();
    } else {
      setShowQualityDialog(true);
    }
  };

  const handleStartWithQuality = () => {
    setShowQualityDialog(false);
    onStartScreenShare(selectedQuality);
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-background/90 backdrop-blur-xl border border-border shadow-2xl">
            {/* Mute */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-xl h-10 w-10 transition-all duration-200",
                    isMuted &&
                      "bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive",
                  )}
                  onClick={handleMuteToggle}
                >
                  {isMuted ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isMuted ? "Unmute" : "Mute"}
              </TooltipContent>
            </Tooltip>

            {/* Deafen */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-xl h-10 w-10 transition-all duration-200",
                    isDeafened &&
                      "bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive",
                  )}
                  onClick={handleDeafenToggle}
                >
                  {isDeafened ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isDeafened ? "Undeafen" : "Deafen"}
              </TooltipContent>
            </Tooltip>

            {/* Screen Share */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-xl h-10 w-10 transition-all duration-200",
                    isScreenSharing &&
                      "bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary",
                  )}
                  onClick={handleScreenShare}
                >
                  {isScreenSharing ? (
                    <MonitorOff className="h-4 w-4" />
                  ) : (
                    <MonitorUp className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isScreenSharing ? "Stop sharing" : "Share screen"}
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-border mx-1" />

            {/* Leave */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="rounded-xl h-10 w-10 bg-destructive hover:bg-destructive/85 text-destructive-foreground transition-all duration-200"
                  onClick={handleLeave}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Leave room</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Screen share quality picker */}
      <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Screen Share Quality</DialogTitle>
            <DialogDescription>
              Choose the resolution and frame rate for your screen share.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-2">
            {SCREEN_QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setSelectedQuality(preset)}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all duration-150 text-left",
                  selectedQuality.label === preset.label
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/40",
                )}
              >
                <span className="font-medium">{preset.label}</span>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {preset.width}×{preset.height}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {preset.frameRate}fps
                  </Badge>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setShowQualityDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartWithQuality}>Start Sharing</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
