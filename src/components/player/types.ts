export interface VideoSource {
  src: string;
  type?: string;
}

export interface VideoPlayerProps {
  sources: VideoSource[];
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
}
