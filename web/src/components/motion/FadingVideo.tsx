import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

export type FadingVideoProps = {
  src: string | string[];
  className?: string;
  style?: React.CSSProperties;
  poster?: string;
};

export function FadingVideo({ src, className = '', style, poster }: FadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const isFadingOutRef = useRef(false);

  const sources = useMemo(() => (Array.isArray(src) ? src : [src]), [src]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSrc = sources[currentIndex] ?? sources[0];

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const cancelFade = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const fadeIn = useCallback(
    (durationMs = 500) => {
      cancelFade();
      isFadingOutRef.current = false;
      const video = videoRef.current;
      if (!video) return;

      if (prefersReducedMotion) {
        video.style.opacity = '1';
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / durationMs);
        if (videoRef.current) {
          videoRef.current.style.opacity = String(progress);
        }
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [cancelFade, prefersReducedMotion],
  );

  const fadeOut = useCallback(
    (durationMs = 550) => {
      cancelFade();
      isFadingOutRef.current = true;
      const video = videoRef.current;
      if (!video) return;

      if (prefersReducedMotion) {
        video.style.opacity = '0';
        return;
      }

      const currentOpacity = parseFloat(video.style.opacity || '1');
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / durationMs);
        if (videoRef.current) {
          videoRef.current.style.opacity = String(Math.max(0, currentOpacity * (1 - progress)));
        }
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [cancelFade, prefersReducedMotion],
  );

  useEffect(() => {
    return () => {
      cancelFade();
    };
  }, [cancelFade]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (prefersReducedMotion) {
      video.pause();
      video.style.opacity = '1';
    }
  }, [prefersReducedMotion, currentSrc]);

  const handleLoadedData = () => {
    const video = videoRef.current;
    if (!video) return;

    if (prefersReducedMotion) {
      video.pause();
      video.style.opacity = '1';
      return;
    }

    video.play().catch(() => {
      // Browser autoplay policy catch
    });
    fadeIn(500);
  };

  const handleTimeUpdate = () => {
    if (prefersReducedMotion) return;
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const remaining = video.duration - video.currentTime;
    if (remaining <= 0.55 && remaining > 0 && !isFadingOutRef.current) {
      fadeOut(550);
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;

    if (sources.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % sources.length);
    } else {
      video.currentTime = 0;
      video.play().catch(() => {});
      fadeIn(500);
    }
  };

  return (
    <video
      ref={videoRef}
      src={currentSrc}
      className={className}
      style={{
        opacity: prefersReducedMotion ? 1 : 0,
        ...style,
      }}
      poster={poster}
      autoPlay={!prefersReducedMotion}
      muted
      playsInline
      preload="auto"
      onLoadedData={handleLoadedData}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
    />
  );
}
