"use client";

import { useState, useRef, useCallback } from "react";
import axios, { AxiosError } from "axios";
import {
  Film,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  Play,
  Users,
  Trash2,
  FileVideo,
  Clock,
  HardDrive,
  Info,
  Clapperboard,
  CloudUpload,
  Pause,
  RotateCcw,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// ─── Config ───────────────────────────────────────────────────────────────────

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL!;

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStage = "idle" | "uploading" | "success" | "error";

interface VideoMeta {
  name: string;
  size: number;
  type: string;
  duration?: number;
  lastModified: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatMime(type: string): string {
  const map: Record<string, string> = {
    "video/mp4": "MP4",
    "video/webm": "WebM",
    "video/ogg": "OGG",
    "video/quicktime": "MOV",
    "video/x-matroska": "MKV",
    "video/x-msvideo": "AVI",
  };
  return map[type] ?? type.replace("video/", "").toUpperCase();
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 ** 2) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / 1024 ** 2).toFixed(1)} MB/s`;
}

function formatTimeRemaining(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "Calculating…";
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s left`;
}

// ─── Drop Zone (YouTube-style large) ──────────────────────────────────────────

function DropZone({
  onFile,
  isDragging,
  setIsDragging,
}: {
  onFile: (f: File) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (f: File) => {
    if (f.type.startsWith("video/")) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handle(f);
      }}
      className={`
        relative flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed
        cursor-pointer transition-all duration-200 py-20 px-12 select-none
        ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-muted/20 hover:border-muted-foreground/40 hover:bg-muted/30"
        }
      `}
      onClick={() => inputRef.current?.click()}
    >
      {/* Big upload icon */}
      <div
        className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-colors ${
          isDragging ? "bg-primary/10" : "bg-muted"
        }`}
      >
        <CloudUpload
          size={40}
          strokeWidth={1.5}
          className={isDragging ? "text-primary" : "text-muted-foreground"}
        />
        {isDragging && (
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
        )}
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">
          {isDragging ? "Drop to upload" : "Drag and drop a video file"}
        </p>
        <p className="text-sm text-muted-foreground">
          Or{" "}
          <span className="text-primary font-medium underline underline-offset-2 cursor-pointer">
            browse files
          </span>{" "}
          from your computer
        </p>
      </div>

      {/* Format pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {["MP4", "WebM", "MOV", "MKV", "AVI"].map((fmt) => (
          <span
            key={fmt}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border"
          >
            {fmt}
          </span>
        ))}
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
          Max 3 GB
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
        }}
      />
    </div>
  );
}

// ─── Info Strip ────────────────────────────────────────────────────────────────

function InfoStrip() {
  const items = [
    { icon: <Trash2 size={13} />, text: "Deleted when the room closes" },
    { icon: <Users size={13} />, text: "Your controls apply to everyone" },
    { icon: <Play size={13} />, text: "Playback synced in real-time" },
  ];
  return (
    <div className="flex items-stretch gap-0 rounded-xl border border-border overflow-hidden divide-x divide-border">
      {items.map(({ icon, text }, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-2 px-3 py-4 bg-muted/30 text-center"
        >
          <span className="text-muted-foreground">{icon}</span>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {text}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Video Preview Card ───────────────────────────────────────────────────────

function VideoPreviewCard({
  meta,
  file,
  onRemove,
  onUpload,
}: {
  meta: VideoMeta;
  file: File;
  onRemove: () => void;
  onUpload: () => void;
}) {
  const [objectUrl] = useState(() => URL.createObjectURL(file));
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    isPlaying ? vid.pause() : vid.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="rounded-2xl border border-border overflow-hidden bg-black">
        <div
          className="relative w-full group cursor-pointer"
          style={{ aspectRatio: "16/9" }}
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={objectUrl}
            className="w-full h-full object-contain"
            onEnded={() => setIsPlaying(false)}
            preload="metadata"
            playsInline
          />
          {/* Overlay */}
          <div
            className={`absolute inset-0 transition-colors ${
              isPlaying
                ? "opacity-0 group-hover:opacity-100 bg-black/20"
                : "bg-black/40 group-hover:bg-black/50"
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/70 transition-colors">
                {isPlaying ? (
                  <Pause size={22} className="text-white" fill="white" />
                ) : (
                  <Play size={22} className="text-white ml-1" fill="white" />
                )}
              </div>
            </div>
          </div>
          {/* Duration badge */}
          {meta.duration !== undefined && (
            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm rounded-md px-2.5 py-1 flex items-center gap-1.5">
              <Clock size={11} className="text-white/70" />
              <span className="text-xs font-semibold text-white tabular-nums">
                {formatDuration(meta.duration)}
              </span>
            </div>
          )}
        </div>

        {/* File meta bar */}
        <div className="px-5 py-3.5 bg-muted/20 border-t border-border/60 flex items-center gap-3">
          <FileVideo size={16} className="text-muted-foreground shrink-0" />
          <p
            className="flex-1 text-sm font-medium text-foreground truncate"
            title={meta.name}
          >
            {meta.name}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs gap-1">
              <HardDrive size={10} />
              {formatBytes(meta.size)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {formatMime(meta.type)}
            </Badge>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Remove file"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Upload CTA */}
      <Button
        className="w-full gap-2 h-11 text-sm"
        size="lg"
        onClick={onUpload}
      >
        <Upload size={15} />
        Upload video
      </Button>
    </div>
  );
}

// ─── Upload Progress ──────────────────────────────────────────────────────────

function UploadProgress({
  percent,
  fileName,
  uploadedBytes,
  totalBytes,
  speedBps,
  secondsRemaining,
  onCancel,
}: {
  percent: number;
  fileName: string;
  uploadedBytes: number;
  totalBytes: number;
  speedBps: number;
  secondsRemaining: number;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Big animated icon + percent */}
      <div className="flex flex-col items-center gap-5 py-6">
        <div className="relative w-24 h-24">
          {/* Circular progress ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 96 96"
          >
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - percent / 100)}`}
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {percent}%
            </span>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-base font-semibold text-foreground">Uploading…</p>
          <p
            className="text-sm text-muted-foreground truncate max-w-xs"
            title={fileName}
          >
            {fileName}
          </p>
        </div>
      </div>

      {/* Progress bar + stats */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
        <Progress value={percent} className="h-2 rounded-full" />

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Uploaded
            </p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {formatBytes(uploadedBytes)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Speed
            </p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {speedBps > 0 ? formatSpeed(speedBps) : "—"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Remaining
            </p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {formatTimeRemaining(secondsRemaining)}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Keep this window open — closing it will interrupt the upload.
      </p>
    </div>
  );
}

// ─── Upload Error ─────────────────────────────────────────────────────────────

function UploadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle
          size={36}
          strokeWidth={1.5}
          className="text-destructive"
        />
      </div>
      <div className="text-center space-y-2 max-w-sm">
        <p className="text-base font-semibold text-foreground">Upload failed</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>
      </div>
      <Button variant="outline" className="gap-2" onClick={onRetry}>
        <RotateCcw size={14} />
        Try again
      </Button>
    </div>
  );
}

// ─── Upload Success ───────────────────────────────────────────────────────────

function UploadSuccess({
  meta,
  file,
  onStartStreaming,
}: {
  meta: VideoMeta;
  file: File;
  onStartStreaming: () => void;
}) {
  const [objectUrl] = useState(() => URL.createObjectURL(file));
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    isPlaying ? vid.pause() : vid.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-5">
      {/* Success banner */}
      <div className="flex items-center gap-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-4">
        <div className="relative shrink-0">
          <CheckCircle2 size={26} className="text-emerald-500" />
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Upload complete!
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preview your video, then start streaming when you're ready.
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <Badge variant="secondary" className="text-[10px]">
            {formatBytes(meta.size)}
          </Badge>
        </div>
      </div>

      {/* Video preview */}
      <div className="rounded-2xl border border-border overflow-hidden bg-black">
        <div
          className="relative w-full group cursor-pointer"
          style={{ aspectRatio: "16/9" }}
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={objectUrl}
            className="w-full h-full object-contain"
            onEnded={() => setIsPlaying(false)}
            preload="metadata"
            playsInline
          />
          <div
            className={`absolute inset-0 transition-colors ${
              isPlaying
                ? "opacity-0 group-hover:opacity-100 bg-black/20"
                : "bg-black/40 group-hover:bg-black/50"
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/70 transition-colors">
                {isPlaying ? (
                  <Pause size={22} className="text-white" fill="white" />
                ) : (
                  <Play size={22} className="text-white ml-1" fill="white" />
                )}
              </div>
            </div>
          </div>
          {meta.duration !== undefined && (
            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm rounded-md px-2.5 py-1 flex items-center gap-1.5">
              <Clock size={11} className="text-white/70" />
              <span className="text-xs font-semibold text-white tabular-nums">
                {formatDuration(meta.duration)}
              </span>
            </div>
          )}
        </div>
        <div className="px-5 py-3 bg-muted/20 border-t border-border/60 flex items-center gap-2">
          <FileVideo size={14} className="text-muted-foreground shrink-0" />
          <p className="flex-1 text-xs font-medium text-foreground truncate">
            {meta.name}
          </p>
          <Badge variant="secondary" className="text-[10px]">
            {formatMime(meta.type)}
          </Badge>
        </div>
      </div>

      {/* Start streaming CTA */}
      <Button
        onClick={onStartStreaming}
        className="w-full gap-2 h-12 text-sm font-semibold"
        size="lg"
      >
        <Clapperboard size={16} />
        Start streaming for everyone
      </Button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function WatchPartyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<UploadStage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [speedBps, setSpeedBps] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const cancelTokenRef = useRef<ReturnType<
    typeof axios.CancelToken.source
  > | null>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const lastProgressRef = useRef<{ loaded: number; time: number }>({
    loaded: 0,
    time: 0,
  });

  const handleFile = useCallback((file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);

    const meta: VideoMeta = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    };

    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.src = url;
    vid.onloadedmetadata = () => {
      meta.duration = vid.duration;
      URL.revokeObjectURL(url);
      setVideoMeta({ ...meta });
    };
    vid.onerror = () => {
      URL.revokeObjectURL(url);
      setVideoMeta(meta);
    };
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !videoMeta) return;

    setStage("uploading");
    setUploadPercent(0);
    setUploadedBytes(0);
    setSpeedBps(0);
    setSecondsRemaining(0);
    setErrorMessage(null);

    uploadStartTimeRef.current = Date.now();
    lastProgressRef.current = { loaded: 0, time: Date.now() };

    try {
      const { data } = await axios.post(`${SERVER_URL}/get-signed-url`, {
        name: videoMeta.name,
        size: videoMeta.size,
        type: videoMeta.type,
        duration: videoMeta.duration,
      });

      const { signedUrl } = data as {
        signedUrl: string;
        key: string;
        expiresIn: number;
      };

      cancelTokenRef.current = axios.CancelToken.source();

      await axios.put(signedUrl, selectedFile, {
        headers: { "Content-Type": selectedFile.type },
        cancelToken: cancelTokenRef.current.token,
        onUploadProgress: (e) => {
          const loaded = e.loaded;
          const total = e.total ?? selectedFile.size;
          const now = Date.now();

          const percent = Math.min(Math.round((loaded / total) * 100), 99);
          setUploadPercent(percent);
          setUploadedBytes(loaded);

          const elapsed = (now - lastProgressRef.current.time) / 1000;
          const bytesDiff = loaded - lastProgressRef.current.loaded;

          if (elapsed > 0.2) {
            const currentSpeed = bytesDiff / elapsed;
            setSpeedBps(currentSpeed);
            const bytesLeft = total - loaded;
            setSecondsRemaining(
              currentSpeed > 0 ? bytesLeft / currentSpeed : 0,
            );
            lastProgressRef.current = { loaded, time: now };
          }
        },
      });

      setUploadPercent(100);
      setUploadedBytes(selectedFile.size);
      setStage("success");
    } catch (err) {
      if (axios.isCancel(err)) return;

      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      const serverMsg =
        axiosErr.response?.data?.message ?? axiosErr.response?.data?.error;
      const status = axiosErr.response?.status;
      const message =
        status === 413
          ? "The file exceeds the maximum allowed size of 3 GB."
          : status === 415
            ? "This file format is not supported."
            : (serverMsg ?? "Something went wrong. Please try again.");

      setErrorMessage(message);
      setStage("error");
    }
  }, [selectedFile, videoMeta]);

  const handleStartStreaming = useCallback(() => {
    console.log("[WatchParty] start streaming event fired (placeholder)");
    onClose();
  }, [onClose]);

  const handleCloseAttempt = () => {
    if (stage === "uploading") {
      setCancelDialogOpen(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    cancelTokenRef.current?.cancel("User cancelled");
    setStage("idle");
    setSelectedFile(null);
    setVideoMeta(null);
    setUploadPercent(0);
    setUploadedBytes(0);
    setSpeedBps(0);
    setSecondsRemaining(0);
    setErrorMessage(null);
    onClose();
  };

  const handleCancelConfirm = () => {
    setCancelDialogOpen(false);
    resetAndClose();
  };

  const handleRetry = () => {
    setStage("idle");
    setErrorMessage(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleCloseAttempt()}>
        <DialogContent className="max-w-3xl! w-full gap-0 p-0 overflow-hidden flex flex-col max-h-[92dvh]">
          {/* ── Header ── */}
          <DialogHeader className="px-7 pt-7 pb-5 border-b border-border shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Film size={20} className="text-foreground" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Start a Watch Party
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Upload a video file and stream it live with your room.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">
            {/* Info strip — only shown on idle/empty */}
            {stage === "idle" && !selectedFile && <InfoStrip />}

            {/* Idle — no file */}
            {stage === "idle" && !selectedFile && (
              <DropZone
                onFile={handleFile}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              />
            )}

            {/* Idle — file selected */}
            {stage === "idle" && selectedFile && videoMeta && (
              <VideoPreviewCard
                meta={videoMeta}
                file={selectedFile}
                onRemove={() => {
                  setSelectedFile(null);
                  setVideoMeta(null);
                }}
                onUpload={handleUpload}
              />
            )}

            {/* Uploading */}
            {stage === "uploading" && (
              <UploadProgress
                percent={uploadPercent}
                fileName={selectedFile?.name ?? ""}
                uploadedBytes={uploadedBytes}
                totalBytes={selectedFile?.size ?? 0}
                speedBps={speedBps}
                secondsRemaining={secondsRemaining}
                onCancel={() => setCancelDialogOpen(true)}
              />
            )}

            {/* Error */}
            {stage === "error" && errorMessage && (
              <UploadError message={errorMessage} onRetry={handleRetry} />
            )}

            {/* Success */}
            {stage === "success" && selectedFile && videoMeta && (
              <UploadSuccess
                meta={videoMeta}
                file={selectedFile}
                onStartStreaming={handleStartStreaming}
              />
            )}
          </div>

          {/* ── Footer — hidden on success & uploading (CTA is inline) ── */}
          {stage !== "success" && stage !== "idle" && (
            <div className="px-7 pb-6 pt-4 border-t border-border shrink-0 flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={handleCloseAttempt}
              >
                Cancel
              </Button>
              {stage === "uploading" && (
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <X size={14} />
                  Cancel upload
                </Button>
              )}
              {stage === "error" && (
                <Button className="flex-1 gap-2" onClick={handleUpload}>
                  <Upload size={14} />
                  Retry upload
                </Button>
              )}
            </div>
          )}

          {/* Footer for idle with no file — just close */}
          {stage === "idle" && !selectedFile && (
            <div className="px-7 pb-6 pt-4 border-t border-border shrink-0">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCloseAttempt}
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel-during-upload confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-destructive" />
              </div>
              <AlertDialogTitle>Cancel upload?</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pl-[52px]">
                <p>
                  If you cancel now, the upload will be interrupted and all
                  progress will be lost.
                </p>
                <p className="text-foreground font-medium text-xs bg-destructive/8 border border-destructive/20 rounded-lg px-3.5 py-2.5 leading-relaxed">
                  You cannot start streaming without a completed upload —{" "}
                  <strong>you'll need to re-upload from scratch.</strong>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep uploading</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel upload
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
