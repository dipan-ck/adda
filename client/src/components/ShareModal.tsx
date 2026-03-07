"use client";

import { Share2, Copy, Check, Link2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useState } from "react";

export default function ShareModal({
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

  const roomLink = `${process.env.NEXT_PUBLIC_CLIENT_URL}?roomId=${roomId}`;

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
