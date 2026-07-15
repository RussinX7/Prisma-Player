"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import "./video-player.css";
import type { VideoPlayerProps } from "./types";

export default function VideoPlayer({
  sources,
  poster,
  autoplay = false,
  muted = false,
  controls = true,
  className = "",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!containerRef.current || playerRef.current) return;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered");
    containerRef.current.appendChild(videoElement);

    playerRef.current = videojs(videoElement, {
      controls,
      responsive: true,
      fluid: true,
      preload: "metadata",
      playsinline: true,
      html5: {
        vhs: {
          overrideNative: false,
        },
      },
    });

    return () => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) player.dispose();
      playerRef.current = null;
    };
  }, [controls]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;

    player.autoplay(autoplay);
    player.muted(muted);
    player.poster(poster ?? "");
    player.src(sources);
  }, [autoplay, muted, poster, sources]);

  return (
    <div className={`prisma-video-player ${className}`} data-vjs-player>
      <div ref={containerRef} />
    </div>
  );
}
