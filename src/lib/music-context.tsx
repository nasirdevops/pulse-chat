import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumCover: string;
  preview: string;
  duration: number;
  youtubeId?: string;
}

// YouTube IFrame API types
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLDivElement,
        opts: Record<string, unknown>
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface MusicContextType {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  playTrack: (track: Track, queue?: Track[]) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  stopPlayback: () => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

// Singleton YouTube player reference
let ytPlayer: YTPlayer | null = null;
let ytReady = false;
let ytPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (ytReady) return Promise.resolve();
  if (ytPromise) return ytPromise;

  ytPromise = new Promise<void>((resolve) => {
    // Create hidden container
    let container = document.getElementById("yt-player-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "yt-player-container";
      container.style.cssText =
        "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;top:0;left:0;";
      document.body.appendChild(container);

      const playerDiv = document.createElement("div");
      playerDiv.id = "yt-player";
      container.appendChild(playerDiv);
    }

    if (window.YT && window.YT.Player) {
      createYTPlayer().then(() => {
        ytReady = true;
        resolve();
      });
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      createYTPlayer().then(() => {
        ytReady = true;
        resolve();
      });
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return ytPromise;
}

function createYTPlayer(): Promise<void> {
  return new Promise((resolve) => {
    if (ytPlayer) {
      resolve();
      return;
    }

    const el = document.getElementById("yt-player") as HTMLDivElement;
    ytPlayer = new window.YT!.Player(el, {
      height: "1",
      width: "1",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: () => resolve(),
      },
    });
  });
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const currentModeRef = useRef<"youtube" | "audio">("audio");

  // Get or create HTML5 audio element
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.volume = 0.8;
      audio.preload = "auto";
      // playsinline prevents iOS from taking over fullscreen
      audio.setAttribute("playsinline", "");
      audio.setAttribute("webkit-playsinline", "");
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  // Keep audio playing when page is hidden (background playback)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && currentModeRef.current === "audio" && audioRef.current) {
        // Prevent browser from pausing on visibility change
        audioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Initialize hidden YouTube player container on mount
  useEffect(() => {
    if (!ytContainerRef.current) {
      const container = document.createElement("div");
      container.id = "yt-player-mount";
      container.style.cssText =
        "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;top:0;left:0;";
      document.body.appendChild(container);
      ytContainerRef.current = container;
    }
  }, []);

  // Poll YouTube player state for progress/duration/track-end
  useEffect(() => {
    const interval = setInterval(() => {
      if (ytPlayer && currentModeRef.current === "youtube" && ytReady) {
        try {
          const state = ytPlayer.getPlayerState();
          const YT = window.YT;

          if (YT && state === YT.PlayerState.PLAYING) {
            setProgress(ytPlayer.getCurrentTime());
            setDuration(ytPlayer.getDuration());
            setIsPlaying(true);
          } else if (YT && state === YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          }

          // Track ended → auto-advance
          if (YT && state === YT.PlayerState.ENDED) {
            setQueueIndex((prev) => {
              const next = prev + 1;
              setQueue((q) => {
                if (next < q.length) {
                  setCurrentTrack(q[next]);
                  playYouTube(q[next]);
                } else {
                  setIsPlaying(false);
                }
                return q;
              });
              return next;
            });
          }
        } catch {
          // ignore
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Also poll HTML5 audio for progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentModeRef.current === "audio" && audioRef.current) {
        const audio = audioRef.current;
        setProgress(audio.currentTime);
        setDuration(audio.duration || 0);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Play via YouTube
  const playYouTube = useCallback(
    async (track: Track) => {
      if (!track.youtubeId) return;
      currentModeRef.current = "youtube";

      // Pause HTML5 audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
      }

      await loadYouTubeAPI();
      if (ytPlayer) {
        ytPlayer.loadVideoById(track.youtubeId);
        ytPlayer.setVolume(Math.round(volume * 100));
        setIsPlaying(true);
      }
    },
    [volume]
  );

  // Play via HTML5 audio (fallback for Deezer previews)
  const playAudio = useCallback(
    (track: Track) => {
      currentModeRef.current = "audio";

      // Pause YouTube if playing
      if (ytPlayer && ytReady) {
        try {
          ytPlayer.pauseVideo();
        } catch {
          // ignore
        }
      }

      const audio = getAudio();
      audio.src = track.preview;
      audio.volume = volume;
      audio.load();
      audio.play().catch(() => {});
      setIsPlaying(true);

      // Update Media Session playback state
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }

      audio.onended = () => {
        setQueueIndex((prev) => {
          const next = prev + 1;
          setQueue((q) => {
            if (next < q.length) {
              setCurrentTrack(q[next]);
              if (q[next].youtubeId) {
                playYouTube(q[next]);
              } else {
                playAudio(q[next]);
              }
            } else {
              setIsPlaying(false);
            }
            return q;
          });
          return next;
        });
      };
    },
    [getAudio, volume, playYouTube]
  );

  const playTrack = useCallback(
    (track: Track, newQueue?: Track[]) => {
      if (newQueue) {
        setQueue(newQueue);
        const idx = newQueue.findIndex((t) => t.id === track.id);
        setQueueIndex(idx >= 0 ? idx : 0);
      } else {
        setQueueIndex((prev) => {
          const idx = queue.findIndex((t) => t.id === track.id);
          return idx >= 0 ? idx : prev;
        });
      }
      setCurrentTrack(track);

      // Prefer YouTube for full songs, fallback to audio
      if (track.youtubeId) {
        playYouTube(track);
      } else if (track.preview) {
        playAudio(track);
      }
    },
    [queue, playYouTube, playAudio]
  );

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0) => {
      if (tracks.length === 0) return;
      const track = tracks[startIndex];
      playTrack(track, tracks);
    },
    [playTrack]
  );

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;

    if (currentModeRef.current === "youtube" && ytPlayer && ytReady) {
      try {
        const state = ytPlayer.getPlayerState();
        const YT = window.YT;
        if (YT && state === YT.PlayerState.PLAYING) {
          ytPlayer.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayer.playVideo();
          setIsPlaying(true);
        }
      } catch {
        // ignore
      }
    } else {
      const audio = getAudio();
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [currentTrack, isPlaying, getAudio]);

  const nextTrack = useCallback(() => {
    const next = queueIndex + 1;
    if (next < queue.length) {
      setQueueIndex(next);
      setCurrentTrack(queue[next]);
      if (queue[next].youtubeId) {
        playYouTube(queue[next]);
      } else if (queue[next].preview) {
        playAudio(queue[next]);
      }
      setIsPlaying(true);
    }
  }, [queueIndex, queue, playYouTube, playAudio]);

  const prevTrack = useCallback(() => {
    // If past 3 seconds, restart current track
    if (currentModeRef.current === "youtube" && ytPlayer && ytReady) {
      try {
        if (ytPlayer.getCurrentTime() > 3) {
          ytPlayer.seekTo(0, true);
          setProgress(0);
          return;
        }
      } catch {
        // ignore
      }
    } else if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }

    const prev = queueIndex - 1;
    if (prev >= 0) {
      setQueueIndex(prev);
      setCurrentTrack(queue[prev]);
      if (queue[prev].youtubeId) {
        playYouTube(queue[prev]);
      } else if (queue[prev].preview) {
        playAudio(queue[prev]);
      }
      setIsPlaying(true);
    }
  }, [queueIndex, queue, playYouTube, playAudio, currentTrack]);

  const seekTo = useCallback(
    (time: number) => {
      if (currentModeRef.current === "youtube" && ytPlayer && ytReady) {
        try {
          ytPlayer.seekTo(time, true);
          setProgress(time);
        } catch {
          // ignore
        }
      } else {
        const audio = getAudio();
        audio.currentTime = time;
        setProgress(time);
      }
    },
    [getAudio]
  );

  const setVolume = useCallback(
    (vol: number) => {
      setVolumeState(vol);

      if (currentModeRef.current === "youtube" && ytPlayer && ytReady) {
        try {
          ytPlayer.setVolume(Math.round(vol * 100));
        } catch {
          // ignore
        }
      }

      if (audioRef.current) {
        audioRef.current.volume = vol;
      }
    },
    []
  );

  const stopPlayback = useCallback(() => {
    // Stop YouTube
    if (ytPlayer && ytReady) {
      try {
        ytPlayer.stopVideo();
      } catch { /* ignore */ }
    }
    // Stop HTML5 audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setQueue([]);
    setQueueIndex(0);
  }, []);

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        queue,
        queueIndex,
        isPlaying,
        volume,
        progress,
        duration,
        playTrack,
        playQueue,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        stopPlayback,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
