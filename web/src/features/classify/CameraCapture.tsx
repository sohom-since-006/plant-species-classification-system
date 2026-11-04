import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X } from '@/components/icons';
import { SolidButton } from '@/components/ui/SolidButton';

export type CameraCaptureProps = {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    setIsLoading(true);
    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Camera access is not supported by your browser or in this environment.');
      setIsLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMsg(
          'Camera permission was denied. Please allow camera permissions in your browser address bar or settings to take photos directly.',
        );
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMsg('No camera device was detected on your system.');
      } else {
        setErrorMsg(`Unable to access camera: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `plant_scan_${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        stopStream();
        onCapture(file);
      },
      'image/jpeg',
      0.92,
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Camera plant scanner"
    >
      <div className="relative w-full max-w-lg liquid-glass-strong rounded-3xl p-6 overflow-hidden flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[var(--accent)]" />
            <span className="font-heading italic text-xl text-white">Live Camera Capture</span>
          </div>
          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-1.5 rounded-full liquid-glass text-white/70 hover:text-white transition-colors"
            aria-label="Close camera"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder window */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black/70 border border-white/10 flex items-center justify-center">
          {isLoading && (
            <div className="flex flex-col items-center gap-2 text-white/70">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              <span className="text-xs font-mono">Initializing camera...</span>
            </div>
          )}

          {errorMsg ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-rose-300 leading-relaxed font-body">{errorMsg}</p>
              <SolidButton onClick={startCamera} className="text-xs px-4 py-2">
                Retry Camera
              </SolidButton>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Viewfinder corner guidelines */}
          {!errorMsg && !isLoading && (
            <div className="absolute inset-6 pointer-events-none border border-white/20 rounded-xl">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--accent)]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--accent)]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)]" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-6 w-full">
          <button
            onClick={handleCapture}
            disabled={!!errorMsg || isLoading}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-[var(--accent)] text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            aria-label="Capture photograph"
            type="button"
          >
            <div className="w-10 h-10 rounded-full border-2 border-black/30" />
          </button>
        </div>
      </div>
    </div>
  );
}
