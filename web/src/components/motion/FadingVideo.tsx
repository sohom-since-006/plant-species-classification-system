import { useEffect, useRef, useState, useMemo } from 'react';

export type FadingVideoProps = {
  src: string | string[];
  className?: string;
  style?: React.CSSProperties;
  poster?: string;
  forceVideo?: boolean;
};

export function FadingVideo({
  src,
  className = '',
  style,
  poster,
  forceVideo = false,
}: FadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sources = useMemo(() => (Array.isArray(src) ? src : [src]), [src]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSrc = sources[currentIndex] ?? sources[0];

  const [isMobileOrTouch, setIsMobileOrTouch] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Detect mobile width or touch pointer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => {
      const isNarrow = window.innerWidth < 768;
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      setIsMobileOrTouch(isNarrow || isTouch);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Pause when offscreen via IntersectionObserver
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry?.isIntersecting ?? true);
      },
      { threshold: 0.05 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [isMobileOrTouch]);

  // Pause when tab is hidden
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Play/pause control
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (prefersReducedMotion || !isInView || !isTabVisible) {
      video.pause();
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }, [prefersReducedMotion, isInView, isTabVisible, currentSrc]);

  const handleEnded = () => {
    if (sources.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % sources.length);
    }
  };

  // On mobile or touch devices under 768px, render static poster image for zero GPU/decode overhead
  if (isMobileOrTouch && poster && !forceVideo) {
    return (
      <img
        src={poster}
        alt="Botanical background atmosphere"
        className={className}
        style={{
          opacity: 1,
          ...style,
        }}
        loading="eager"
      />
    );
  }

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
      autoPlay={!prefersReducedMotion && isInView && isTabVisible}
      muted
      loop={sources.length <= 1}
      playsInline
      preload="metadata"
      onEnded={handleEnded}
    />
  );
}
