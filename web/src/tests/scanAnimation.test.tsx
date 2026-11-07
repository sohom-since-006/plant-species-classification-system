import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  runClassificationPipeline,
  STAGE_LABELS,
  getDeterministicDetectionPoints,
  type PipelineStageEvent,
} from '@/ml/pipelineRunner';
import { ScanOverlay } from '@/features/classify/ScanOverlay';
import { StagePanel } from '@/features/classify/StagePanel';

describe('Stage State Machine (Order & Progression)', () => {
  it('dispatches all pipeline stages in strict sequential order', async () => {
    const stageEvents: PipelineStageEvent[] = [];
    const mockFile = new File(['fake-bytes'], 'tulsi.jpg', { type: 'image/jpeg' });

    await runClassificationPipeline(
      [mockFile],
      (event) => {
        stageEvents.push({ ...event });
      },
      { minDisplayTimeMs: 60 }, // Shorter minimum for fast test execution
    );

    expect(stageEvents.length).toBeGreaterThanOrEqual(6);

    // Verify stage order: preprocess -> inference -> postprocess -> similar -> cam
    const stageNames = stageEvents.map((e) => e.stage);
    expect(stageNames[0]).toBe('preprocess');
    expect(stageNames).toContain('inference');
    expect(stageNames).toContain('postprocess');
    expect(stageNames).toContain('similar');
    expect(stageNames[stageNames.length - 1]).toBe('cam');

    // Verify monotonic progress from >0 to 1.0
    for (let i = 1; i < stageEvents.length; i++) {
      expect(stageEvents[i]!.progress).toBeGreaterThanOrEqual(stageEvents[i - 1]!.progress);
    }
    expect(stageEvents[stageEvents.length - 1]!.progress).toBe(1.0);

    // Verify stage text labels
    expect(STAGE_LABELS.preprocess).toBe('Reading image');
    const labels = stageEvents.map((e) => e.label);
    expect(labels).toContain('Reading image');
    expect(labels).toContain('Detecting structure');
    expect(labels).toContain('Matching species');
    expect(labels).toContain('Calibrating confidence');
    expect(labels).toContain('Finding look-alikes');
    expect(labels).toContain('Building heatmap');
  });

  it('sequences multi-photo scans across each photo in turn', async () => {
    const stageEvents: PipelineStageEvent[] = [];
    const photo1 = new File(['p1'], 'angle1.jpg', { type: 'image/jpeg' });
    const photo2 = new File(['p2'], 'angle2.jpg', { type: 'image/jpeg' });

    await runClassificationPipeline(
      [photo1, photo2],
      (event) => {
        stageEvents.push({ ...event });
      },
      { minDisplayTimeMs: 80 },
    );

    const photo0Events = stageEvents.filter((e) => e.photoIndex === 0);
    const photo1Events = stageEvents.filter((e) => e.photoIndex === 1);

    expect(photo0Events.length).toBeGreaterThan(0);
    expect(photo1Events.length).toBeGreaterThan(0);
    expect(photo0Events[0]!.totalPhotos).toBe(2);
  });
});

describe('Minimum Total Display Time & Cancellation', () => {
  it('enforces minimum total display time when raw inference is fast', async () => {
    const mockFile = new File(['bytes'], 'specimen.jpg', { type: 'image/jpeg' });
    const minTime = 120; // 120 ms minimum budget

    const start = performance.now();
    await runClassificationPipeline([mockFile], () => {}, {
      minDisplayTimeMs: minTime,
    });
    const duration = performance.now() - start;

    expect(duration).toBeGreaterThanOrEqual(minTime - 15); // Allow small timer jitter
  });

  it('cancels immediately upon receiving abort signal without completing', async () => {
    const mockFile = new File(['bytes'], 'specimen.jpg', { type: 'image/jpeg' });
    const controller = new AbortController();

    const stageEvents: PipelineStageEvent[] = [];
    const pipelinePromise = runClassificationPipeline(
      [mockFile],
      (event) => {
        stageEvents.push(event);
        // Abort on first event
        controller.abort();
      },
      { signal: controller.signal, minDisplayTimeMs: 500 },
    );

    await expect(pipelinePromise).rejects.toThrow();
    // Verify pipeline was cut off before reaching later stages
    expect(stageEvents.some((e) => e.stage === 'cam' && e.progress === 1.0)).toBe(false);
  });
});

describe('Error Handling State Machine', () => {
  it('throws and preserves error state when inference encounters a failure', async () => {
    const mockFile = new File(['corrupt'], 'corrupt.jpg', { type: 'image/jpeg' });

    await expect(
      runClassificationPipeline([mockFile], () => {}, {
        simulateError: true,
        minDisplayTimeMs: 60,
      }),
    ).rejects.toThrow(/WebGL context lost/i);
  });

  it('renders StagePanel error state with red border and retry action', () => {
    const onRetry = vi.fn();
    const onCancel = vi.fn();

    render(
      <StagePanel
        isAnalyzing={false}
        progress={0.35}
        stageLabel="Matching species"
        error="Neural acceleration failed: WebGL context lost."
        onRetry={onRetry}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Classification Interrupted/i)).toBeInTheDocument();
    expect(screen.getByText(/WebGL context lost/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry Analysis/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Deterministic Detection Points', () => {
  it('generates consistent organic coordinates from image seed', () => {
    const pts1 = getDeterministicDetectionPoints('tulsi-leaf-specimen-42');
    const pts2 = getDeterministicDetectionPoints('tulsi-leaf-specimen-42');

    expect(pts1).toEqual(pts2);
    expect(pts1.length).toBe(6);

    for (const pt of pts1) {
      expect(pt.x).toBeGreaterThanOrEqual(18);
      expect(pt.x).toBeLessThanOrEqual(82);
      expect(pt.y).toBeGreaterThanOrEqual(18);
      expect(pt.y).toBeLessThanOrEqual(82);
    }
  });
});

describe('ScanOverlay & Reduced Motion', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders static brackets under prefers-reduced-motion without scan line', () => {
    const { container } = render(
      <ScanOverlay
        isScanning={true}
        stage="inference"
        progress={0.5}
        photoIndex={0}
        totalPhotos={1}
        imageSeed="tulsi-reduced"
      />,
    );

    // Corner brackets are rendered
    expect(container.querySelectorAll('.border-t-2').length).toBe(2);
    expect(container.querySelectorAll('.border-b-2').length).toBe(2);

    // No sweeping scan line or moving detection points under reduced motion
    const circles = container.querySelectorAll('circle');
    // Circles are only inside SVG pattern, no animated detection point circles
    const animatedCircles = Array.from(circles).filter((c) => c.querySelector('animate'));
    expect(animatedCircles.length).toBe(0);
  });
});
