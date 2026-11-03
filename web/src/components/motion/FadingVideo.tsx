import { useEffect, useRef, useState, useMemo } from 'react';

export type FadingVideoProps = {
  src: string | string[];
  className?: string;
  style?: React.CSSProperties;
  poster?: string;
};

export function FadingVideo({ src, className = '', style, poster }: FadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sources = useMemo(() => (Array.isArray(src) ? src : [src]), [src]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSrc = sources[currentIndex] ?? sources[0];

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (prefersReducedMotion) {
      video.pause();
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }, [prefersReducedMotion, currentSrc]);

  const handleEnded = () => {
    if (sources.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % sources.length);
    }
  };

  return (
    <video
      ref={videoRef}
      src={currentSrc}
      className={className}
      style={{
        opacity: 1,
        ...style,
      }}
      poster={poster}
      autoPlay={!prefersReducedMotion}
      muted
      loop={sources.length <= 1}
      playsInline
      preload="auto"
      onEnded={handleEnded}
    />
  );
}
