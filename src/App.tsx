import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Clock,
  Monitor,
  Film,
} from "lucide-react";

// Sample videos (public domain)
const SAMPLE_VIDEOS = [
  {
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    title: "Big Buck Bunny",
    subtitle: "Animation • 2008",
    poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg",
  },
];

type Quality = "auto" | "1080p" | "720p" | "480p" | "360p";
const QUALITIES: Quality[] = ["auto", "1080p", "720p", "480p", "360p"];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [quality, setQuality] = useState<Quality>("auto");
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showPlayAnimation, setShowPlayAnimation] = useState(false);
  const [playAnimationType, setPlayAnimationType] = useState<"play" | "pause">("play");
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  // Time input states
  const [inputHours, setInputHours] = useState("0");
  const [inputMinutes, setInputMinutes] = useState("0");
  const [inputSeconds, setInputSeconds] = useState("0");

  const video = SAMPLE_VIDEOS[0];

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying && !showQualityMenu && !showTimeInput) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3500);
    }
  }, [isPlaying, showQualityMenu, showTimeInput]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, resetHideTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showTimeInput && e.target instanceof HTMLInputElement) return;
      const vid = videoRef.current;
      if (!vid) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (vid.paused) {
            vid.play();
          } else {
            vid.pause();
          }
          resetHideTimer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          vid.currentTime = Math.max(0, vid.currentTime - 10);
          resetHideTimer();
          break;
        case "ArrowRight":
          e.preventDefault();
          vid.currentTime = Math.min(vid.duration, vid.currentTime + 10);
          resetHideTimer();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => {
            const nv = Math.min(1, v + 0.1);
            vid.volume = nv;
            return nv;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => {
            const nv = Math.max(0, v - 0.1);
            vid.volume = nv;
            return nv;
          });
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showTimeInput, resetHideTimer]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setPlayAnimationType("play");
    } else {
      vid.pause();
      setPlayAnimationType("pause");
    }
    setShowPlayAnimation(true);
    setTimeout(() => setShowPlayAnimation(false), 600);
    resetHideTimer();
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current) return;
    const x = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = x * duration;
    resetHideTimer();
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    setHoverTime(x * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    resetHideTimer();
  };

  const handleQualityChange = (q: Quality) => {
    setQuality(q);
    setShowQualityMenu(false);
  };

  const handleGoToTime = () => {
    const h = parseInt(inputHours) || 0;
    const m = parseInt(inputMinutes) || 0;
    const s = parseInt(inputSeconds) || 0;
    const totalSeconds = h * 3600 + m * 60 + s;
    if (videoRef.current && totalSeconds >= 0 && totalSeconds <= duration) {
      videoRef.current.currentTime = totalSeconds;
    }
    setShowTimeInput(false);
    resetHideTimer();
  };

  const openTimeInput = () => {
    const h = Math.floor(currentTime / 3600);
    const m = Math.floor((currentTime % 3600) / 60);
    const s = Math.floor(currentTime % 60);
    setInputHours(h.toString());
    setInputMinutes(m.toString());
    setInputSeconds(s.toString());
    setShowTimeInput(true);
    setShowQualityMenu(false);
  };

  const handleSpeedChange = (delta: number) => {
    setPlaybackRate((prev) => {
      const next = Math.max(0.25, Math.min(2, prev + delta));
      if (videoRef.current) videoRef.current.playbackRate = next;
      return next;
    });
  };

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.volume = volume;
      setIsLoading(false);
    }
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const getQualityLabel = (q: Quality) => {
    switch (q) {
      case "auto": return "Auto";
      case "1080p": return "1080p HD";
      case "720p": return "720p HD";
      case "480p": return "480p";
      case "360p": return "360p";
    }
  };

  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-20 blur-3xl"
          style={{
            background: `radial-gradient(ellipse at center, rgba(0,122,255,0.3), rgba(88,86,214,0.15), transparent 70%)`,
          }}
        />
      </div>

      {/* Player Container */}
      <div
        ref={containerRef}
        className="player-container relative w-full h-full max-w-[1200px] max-h-[95vh] mx-auto flex items-center justify-center cursor-pointer select-none"
        onMouseMove={resetHideTimer}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(".controls-area")) return;
          togglePlay();
        }}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest(".controls-area")) return;
          toggleFullscreen();
        }}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          src={video.src}
          poster={video.poster}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onProgress={handleProgress}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          preload="metadata"
          playsInline
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="loading-spinner" />
          </div>
        )}

        {/* Play/Pause Animation */}
        {showPlayAnimation && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="play-ripple absolute w-20 h-20 rounded-full bg-white/10" />
            <div className="animate-scale-in glass-dark w-20 h-20 rounded-full flex items-center justify-center">
              {playAnimationType === "play" ? (
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              ) : (
                <Pause className="w-8 h-8 text-white" fill="white" />
              )}
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={`controls-area absolute inset-0 z-30 transition-opacity duration-500 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top gradient & info */}
          <div className="gradient-top absolute top-0 left-0 right-0 h-28 px-6 pt-5">
            <div className="flex items-start justify-between">
              <div className="animate-fade-in">
                <h1 className="text-white text-lg font-semibold tracking-tight drop-shadow-lg">
                  {video.title}
                </h1>
                <p className="text-white/60 text-sm font-medium mt-0.5">
                  {video.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="quality-badge">{quality === "auto" ? "HD" : quality}</span>
                {playbackRate !== 1 && (
                  <span className="quality-badge" style={{ background: "linear-gradient(135deg, #FF9500, #FF3B30)" }}>
                    {playbackRate}x
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="gradient-bottom absolute bottom-0 left-0 right-0 px-5 pb-5 pt-20">
            {/* Progress Bar */}
            <div
              ref={progressRef}
              className="progress-container relative w-full cursor-pointer mb-4 py-2"
              onClick={handleProgressClick}
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setHoverTime(null)}
            >
              {/* Hover time tooltip */}
              {hoverTime !== null && (
                <div
                  className="absolute bottom-full mb-3 px-2.5 py-1 glass-dark rounded-lg text-xs text-white font-medium pointer-events-none"
                  style={{ left: hoverX, transform: "translateX(-50%)" }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
              <div className="progress-track h-[4px] relative">
                <div className="progress-buffer" style={{ width: `${bufferProgress}%` }} />
                <div className="progress-fill" style={{ width: `${progress}%` }} />
                <div className="progress-thumb" style={{ left: `${progress}%` }} />
              </div>
            </div>

            {/* Time display */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-xs font-medium tabular-nums">
                {formatTime(currentTime)}
              </span>
              <span className="text-white/40 text-xs font-medium tabular-nums">
                -{formatTime(Math.max(0, duration - currentTime))}
              </span>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-between">
              {/* Left: Volume */}
              <div className="flex items-center gap-3 min-w-[180px]">
                <button
                  className="glass-button w-10 h-10 rounded-full flex items-center justify-center tooltip"
                  data-tooltip={isMuted ? "Unmute" : "Mute"}
                  onClick={toggleMute}
                >
                  <VolumeIcon className="w-[18px] h-[18px] text-white" />
                </button>
                <div className="w-24 relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="volume-slider w-full"
                    style={{
                      background: `linear-gradient(to right, #007AFF ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${(isMuted ? 0 : volume) * 100}%)`,
                    }}
                  />
                </div>
              </div>

              {/* Center: Playback controls */}
              <div className="flex items-center gap-3">
                <button
                  className="glass-button w-10 h-10 rounded-full flex items-center justify-center tooltip"
                  data-tooltip="-10s"
                  onClick={() => handleSkip(-10)}
                >
                  <RotateCcw className="w-[18px] h-[18px] text-white" />
                </button>
                <button
                  className="glass-button w-10 h-10 rounded-full flex items-center justify-center tooltip"
                  data-tooltip="Previous"
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = 0;
                  }}
                >
                  <SkipBack className="w-[18px] h-[18px] text-white" fill="white" />
                </button>
                <button
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))",
                    backdropFilter: "blur(30px)",
                    border: "1.5px solid rgba(255,255,255,0.25)",
                    boxShadow: "0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-white" fill="white" />
                  ) : (
                    <Play className="w-7 h-7 text-white ml-1" fill="white" />
                  )}
                </button>
                <button
                  className="glass-button w-10 h-10 rounded-full flex items-center justify-center tooltip"
                  data-tooltip="End"
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = duration;
                  }}
                >
                  <SkipForward className="w-[18px] h-[18px] text-white" fill="white" />
                </button>
                <button
                  className="glass-button w-10 h-10 rounded-full flex items-center justify-center tooltip"
                  data-tooltip="+10s"
                  onClick={() => handleSkip(10)}
                >
                  <RotateCw className="w-[18px] h-[18px] text-white" />
                </button>
              </div>

              {/* Right: Settings */}
              <div className="flex items-center gap-2 min-w-[180px] justify-end">
                {/* Speed Control */}
                <div className="flex items-center glass-button rounded-full px-1 h-10">
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    onClick={() => handleSpeedChange(-0.25)}
                  >
                    <ChevronDown className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-white text-xs font-semibold min-w-[36px] text-center tabular-nums">
                    {playbackRate}x
                  </span>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    onClick={() => handleSpeedChange(0.25)}
                  >
                    <ChevronUp className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Go to time */}
                <button
                  className="glass-button w-10 h-10 rounded-full flex items-center justify-center tooltip"
                  data-tooltip="Go to time"
                  onClick={openTimeInput}
                >
                  <Clock className="w-[18px] h-[18px] text-white" />
                </button>

                {/* Quality */}
                <div className="relative">
                  <button
                    className="glass-button w-10 h-10 rounded-full flex items-center justify-center tooltip"
                    data-tooltip="Quality"
                    onClick={() => {
                      setShowQualityMenu(!showQualityMenu);
                      setShowTimeInput(false);
                    }}
                  >
                    <Settings className="w-[18px] h-[18px] text-white" />
                  </button>

                  {/* Quality Menu */}
                  {showQualityMenu && (
                    <div className="quality-menu absolute bottom-14 right-0 glass-dark rounded-2xl p-2 min-w-[200px] shadow-2xl">
                      <div className="px-3 py-2 mb-1">
                        <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2">
                          <Monitor className="w-3.5 h-3.5" />
                          Video Quality
                        </p>
                      </div>
                      {QUALITIES.map((q) => (
                        <button
                          key={q}
                          className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all duration-150 ${
                            quality === q
                              ? "bg-[#007AFF]/20 text-white"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                          onClick={() => handleQualityChange(q)}
                        >
                          <span className="text-sm font-medium">{getQualityLabel(q)}</span>
                          {quality === q && (
                            <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
                          )}
                        </button>
                      ))}
                      <div className="border-t border-white/10 mt-2 pt-2 px-3 py-2">
                        <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2 mb-2">
                          <Film className="w-3.5 h-3.5" />
                          Playback Speed
                        </p>
                        <div className="flex items-center justify-between">
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            onClick={() => handleSpeedChange(-0.25)}
                          >
                            <ChevronDown className="w-4 h-4 text-white" />
                          </button>
                          <span className="text-white font-semibold text-sm tabular-nums">{playbackRate}x</span>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            onClick={() => handleSpeedChange(0.25)}
                          >
                            <ChevronUp className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fullscreen */}
                <button
                  className="glass-button w-10 h-10 rounded-full flex items-center justify-center tooltip"
                  data-tooltip={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize className="w-[18px] h-[18px] text-white" />
                  ) : (
                    <Maximize className="w-[18px] h-[18px] text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Time Input Modal */}
          {showTimeInput && (
            <div className="absolute inset-0 flex items-center justify-center z-40" onClick={() => setShowTimeInput(false)}>
              <div
                className="animate-scale-in glass-dark rounded-3xl p-6 min-w-[340px] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Clock className="w-5 h-5 text-[#007AFF]" />
                  <h3 className="text-white text-base font-semibold">Go to Time</h3>
                </div>
                <div className="flex items-center gap-3 justify-center mb-5">
                  <div className="flex flex-col items-center">
                    <label className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mb-2">
                      Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={inputHours}
                      onChange={(e) => setInputHours(e.target.value)}
                      className="time-input w-16 h-12"
                    />
                  </div>
                  <span className="text-white/40 text-2xl font-light mt-6">:</span>
                  <div className="flex flex-col items-center">
                    <label className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mb-2">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={inputMinutes}
                      onChange={(e) => setInputMinutes(e.target.value)}
                      className="time-input w-16 h-12"
                    />
                  </div>
                  <span className="text-white/40 text-2xl font-light mt-6">:</span>
                  <div className="flex flex-col items-center">
                    <label className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mb-2">
                      Seconds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={inputSeconds}
                      onChange={(e) => setInputSeconds(e.target.value)}
                      className="time-input w-16 h-12"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3 rounded-xl text-white/60 font-semibold text-sm hover:bg-white/5 transition-colors"
                    onClick={() => setShowTimeInput(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #007AFF, #5856D6)",
                      color: "white",
                    }}
                    onClick={handleGoToTime}
                  >
                    Go
                  </button>
                </div>
                <p className="text-white/30 text-[11px] text-center mt-3">
                  Duration: {formatTime(duration)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Initial play overlay (when not started) */}
        {!isPlaying && currentTime === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div
              className="animate-scale-in w-24 h-24 rounded-full flex items-center justify-center cursor-pointer pointer-events-auto transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
                backdropFilter: "blur(40px)",
                border: "2px solid rgba(255,255,255,0.2)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
              onClick={togglePlay}
            >
              <Play className="w-10 h-10 text-white ml-1.5" fill="white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
