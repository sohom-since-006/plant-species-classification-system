import { useRef, useEffect } from 'react';

export type FadingVideoProps = {
  src: string | string[];
  className?: string;
  style?: React.CSSProperties;
  poster?: string;
};

export function FadingVideo({ src, className = '', style, poster }: FadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentSrc = Array.isArray(src) ? src[0] : src;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      video.pause();
    }
  }, []);

  return (
    <video
      ref={videoRef}
      src={currentSrc}
      className={className}
      style={style}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
  );
}

