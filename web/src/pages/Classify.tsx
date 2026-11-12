import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHero } from '@/components/layout/PageHero';
import { SolidButton } from '@/components/ui/SolidButton';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/useToast';
import { CameraCapture } from '@/features/classify/CameraCapture';
import { UploadSection, type SampleImage } from '@/features/classify/UploadSection';
import { MultiPhotoTray, type PhotoItem } from '@/features/classify/MultiPhotoTray';
import { ScanOverlay } from '@/features/classify/ScanOverlay';
import { StagePanel } from '@/features/classify/StagePanel';
import { ResultCard } from '@/features/classify/ResultCard';
import { SimilarSpecies } from '@/features/classify/SimilarSpecies';
import { HeatmapView } from '@/features/classify/HeatmapView';
import { FeedbackPanel } from '@/features/classify/FeedbackPanel';
import { BatchModeSection } from '@/features/classify/BatchModeSection';
import { useHistoryService } from '@/features/history/useHistoryService';
import { useSession } from '@/features/auth/useSession';
import { getAllSpecies, getSpeciesById, hasRichContent, fetchSpeciesById } from '@/services/speciesService';
import { isMockMode } from '@/ml/mock';
import {
  runClassificationPipeline,
  STAGE_LABELS,
  getOrCreateWorker,
  getWorkerState,
  type ModelWorkerState,
} from '@/ml/pipelineRunner';
import type { ClassificationResult, PipelineStage } from '@/types/prediction';
import type { Species } from '@/types/species';
import { ArrowUpRight, History, Leaf } from '@/components/icons';
import { springDefault, easeOutExpo, DURATION_PAGE, DURATION_BASE, usePrefersReducedMotion } from '@/lib/motion';

const DistributionPanel = lazy(() => import('@/features/distribution/DistributionPanel'));

const SAMPLE_SPECIMENS: SampleImage[] = [
  {
    name: 'Ocimum tenuiflorum',
    common: 'Tulsi (High Confidence)',
    url: '/species/0.webp',
    fixtureIndex: 0,
  },
  {
    name: 'Hibiscus rosa-sinensis',
    common: 'Hibiscus (Medium Confidence)',
    url: '/species/20.webp',
    fixtureIndex: 1,
  },
  {
    name: 'Ocimum basilicum',
    common: 'Sweet Basil (Genus Fallback)',
    url: '/species/97.webp',
    fixtureIndex: 2,
  },
  {
    name: 'Non-Plant / Texture',
    common: 'Pebble (Unknown / Rejected)',
    url: '/species/sample_pebble.png',
    fixtureIndex: 3,
  },
];

export function Classify() {
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useSession();
  const { savePrediction, isSaving } = useHistoryService();
  const prefersReduced = usePrefersReducedMotion();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStage, setCurrentStage] = useState<PipelineStage>('preprocess');
  const [stageProgress, setStageProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState(STAGE_LABELS.preprocess);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [forcedFixture, setForcedFixture] = useState<number | undefined>(undefined);
  const [isSaved, setIsSaved] = useState(false);
  const [optInThumbnail, setOptInThumbnail] = useState(false);
  const [classifyMode, setClassifyMode] = useState<'single' | 'batch'>('single');

  // Model loading & worker lifecycle state
  const [workerStatus, setWorkerStatus] = useState<ModelWorkerState>('unloaded');
  const [workerProgress, setWorkerProgress] = useState(0);
  const [workerMsg, setWorkerMsg] = useState('');
  const [workerErr, setWorkerErr] = useState<string | null>(null);
  const [showProgressBanner, setShowProgressBanner] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Eagerly preheat model worker on Classify page mount if not in mock mode
  useEffect(() => {
    if (!isMockMode) {
      try {
        getOrCreateWorker((progress, message) => {
          setWorkerProgress(progress);
          setWorkerMsg(message);
          if (progress >= 1.0) {
            setWorkerStatus('ready');
          } else {
            setWorkerStatus('loading');
          }
        });
        const current = getWorkerState();
        setWorkerStatus(current.state);
        setWorkerProgress(current.progress);
        setWorkerMsg(current.message);
        setWorkerErr(current.error);
        if (current.state === 'loading') {
          setShowProgressBanner(true);
        }
      } catch (e) {
        setWorkerStatus('error');
        setWorkerErr(e instanceof Error ? e.message : String(e));
      }
    }
  }, []);

  // Auto-hide progress banner 1.5 seconds after reaching 100% / ready state
  useEffect(() => {
    if (workerStatus === 'loading') {
      setShowProgressBanner(true);
    } else if (workerStatus === 'ready' || workerProgress >= 1.0) {
      const timer = setTimeout(() => {
        setShowProgressBanner(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [workerStatus, workerProgress]);

  // Species Lookup Map (contains all 112 cataloged species)
  const speciesMap = useMemo(() => {
    const map = new Map<number, Species>();
    getAllSpecies().forEach((s) => map.set(s.id, s));
    return map;
  }, []);

  // Handle initialFile passed via navigation state from Hero / CTA
  useEffect(() => {
    const initialFile = (location.state as { initialFile?: File })?.initialFile;
    if (initialFile && photos.length === 0) {
      const url = URL.createObjectURL(initialFile);
      setPhotos([
        {
          id: `initial_${Date.now()}`,
          file: initialFile,
          previewUrl: url,
        },
      ]);
    }
  }, [location.state, photos.length]);

  // Clean up object URLs and abort controller on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [photos]);

  const addPhoto = (file: File, forcedIdx?: number) => {
    // Cancel any stale inference run immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsAnalyzing(false);
    }

    if (photos.length >= 3) {
      showToast('Maximum 3 photos can be combined for multi-organ analysis.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotos((prev) => [
      ...prev,
      {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl: url,
      },
    ]);
    if (typeof forcedIdx === 'number') {
      setForcedFixture(forcedIdx);
    }
    setResult(null);
    setIsDone(false);
    setError(null);
    setIsSaved(false);
  };

  const removePhoto = (id: string) => {
    // Cancel any active inference run immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsAnalyzing(false);
    }

    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setResult(null);
    setIsDone(false);
    setError(null);
    setIsSaved(false);
  };

  const handleSampleSelect = async (sample: SampleImage) => {
    try {
      const file = new File(['sample-plant-specimen-bytes'], `${sample.name}.jpg`, {
        type: 'image/jpeg',
        lastModified: 1700000000000,
      });
      setPhotos([
        {
          id: `sample_${sample.fixtureIndex}`,
          file,
          previewUrl: sample.url,
        },
      ]);
      setForcedFixture(sample.fixtureIndex);
      setResult(null);
      setIsDone(false);
      setError(null);
      setIsSaved(false);
    } catch {
      showToast('Could not load sample specimen.');
    }
  };

  const handleIdentify = async () => {
    if (photos.length === 0) return;

    setIsAnalyzing(true);
    setError(null);
    setIsDone(false);
    setResult(null);
    setStageProgress(0);
    setCurrentStage('preprocess');
    setStageLabel(STAGE_LABELS.preprocess);
    setCurrentPhotoIndex(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const photoFiles = photos.map((p) => p.file);
      const res = await runClassificationPipeline(
        photoFiles,
        (event) => {
          setCurrentStage(event.stage);
          setStageProgress(event.progress);
          setStageLabel(event.label);
          setCurrentPhotoIndex(event.photoIndex);
        },
        {
          signal: controller.signal,
          forcedFixture,
          minDisplayTimeMs: 1600,
        },
      );

      setIsDone(true);
      setResult(res);
      setIsSaved(false);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setIsAnalyzing(false);
        return;
      }
      const message =
        err instanceof Error ? err.message : 'An unexpected classification error occurred.';
      setError(message);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
    setError(null);
  };

  const handleReset = () => {
    handleCancel();
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setResult(null);
    setIsDone(false);
    setError(null);
    setForcedFixture(undefined);
    setIsSaved(false);
  };

  const handleSaveToHistory = async () => {
    if (!result || isSaved || isSaving) return;

    try {
      await savePrediction({
        result,
        imageSource: photos[0]?.file ?? null,
        optInUpload: optInThumbnail,
      });
      setIsSaved(true);
      showToast(
        user
          ? optInThumbnail
            ? 'Saved to cloud history with photo thumbnail!'
            : 'Saved to cloud history (photo kept private on device)!'
          : 'Saved to local device history!',
      );
    } catch {
      showToast('Could not save prediction to history.');
    }
  };

  const handleDownloadResultImage = () => {
    if (!result) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark canvas background
    ctx.fillStyle = '#05130b';
    ctx.fillRect(0, 0, 800, 600);

    // Decorative header line
    ctx.fillStyle = '#6ee7a8';
    ctx.fillRect(0, 0, 800, 6);

    // Title & Taxonomy
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(topSpecies?.commonName || 'Plant Specimen Scan', 50, 70);

    ctx.fillStyle = '#6ee7a8';
    ctx.font = 'italic 20px sans-serif';
    ctx.fillText(topSpecies?.scientificName || 'Botanical Classification', 50, 105);

    // Regional Names (Hindi / Bengali)
    const regional = [
      topSpecies?.namesHindi ? `Hindi: ${topSpecies.namesHindi}` : null,
      topSpecies?.namesBengali ? `Bengali: ${topSpecies.namesBengali}` : null,
    ].filter(Boolean).join('   |   ');

    if (regional) {
      ctx.fillStyle = '#e4e4e7';
      ctx.font = '16px sans-serif';
      ctx.fillText(regional, 50, 135);
    }

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '14px monospace';
    ctx.fillText(`Family: ${topSpecies?.family || 'Taxonomic Class'}`, 50, regional ? 165 : 140);

    // Confidence & Tier
    const probPct = Math.round((result.top3[0]?.prob ?? 0) * 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`Confidence: ${probPct}%  |  Tier: ${result.tier.toUpperCase()}`, 50, 210);

    // Candidate breakdown
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '14px sans-serif';
    ctx.fillText('Top Candidate Probabilities:', 50, 260);

    result.top3.forEach((pred, i) => {
      const sp = getSpeciesById(pred.speciesId);
      const reg = [sp?.namesHindi, sp?.namesBengali].filter(Boolean).join(' / ');
      const name = sp
        ? `${sp.commonName} (${sp.scientificName})${reg ? ` — ${reg}` : ''}`
        : `Botanical Specimen (${pred.speciesId})`;
      const pct = (pred.prob * 100).toFixed(1);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText(`${i + 1}. ${name} — ${pct}%`, 50, 290 + i * 32);
    });

    // Disclaimer
    ctx.fillStyle = '#71717a';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      '⚠️ Identification is probabilistic. Never ingest or use plants based only on automated results.',
      50,
      520,
    );
    ctx.fillText(`Model: ${result.modelVersion}  |  Processed on-device locally`, 50, 545);

    // Trigger download
    const link = document.createElement('a');
    link.download = `plant-classification-${topSpecies?.slug || 'specimen'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Classification summary image downloaded!');
  };

  const topSpeciesId = result?.top3[0]?.speciesId;
  const [asyncTopSpecies, setAsyncTopSpecies] = useState<Species | null>(null);

  useEffect(() => {
    if (typeof topSpeciesId === 'number') {
      const sync = getSpeciesById(topSpeciesId);
      setAsyncTopSpecies(sync);
      fetchSpeciesById(topSpeciesId).then((loaded) => {
        if (loaded) setAsyncTopSpecies(loaded);
      });
    } else {
      setAsyncTopSpecies(null);
    }
  }, [topSpeciesId]);

  const topSpecies =
    asyncTopSpecies ||
    (typeof topSpeciesId === 'number' ? getSpeciesById(topSpeciesId) : undefined);

  const candidateSpecies = useMemo(() => {
    if (!result?.top3) return [];
    return result.top3.map((p) => getSpeciesById(p.speciesId));
  }, [result?.top3]);

  // Build Result Tabs
  const tabItems = useMemo(() => {
    if (!result) return [];

    return [
      {
        label: 'Details',
        content: topSpecies ? (
          <div className="space-y-6 pt-2 font-body text-xs text-white/80">
            {/* Bilingual Names & Taxonomy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="liquid-glass rounded-xl p-4 border border-white/10 space-y-1.5" data-glow="">
                <p className="text-[11px] font-body font-semibold uppercase tracking-wider text-white/60">
                  Regional Names
                </p>
                <p>
                  <strong className="text-white">Hindi:</strong> {topSpecies.namesHindi || '—'}
                </p>
                <p>
                  <strong className="text-white">Bengali:</strong>{' '}
                  {topSpecies.namesBengali || '—'}
                </p>
              </div>

              <div className="liquid-glass rounded-xl p-4 border border-white/10 space-y-1.5" data-glow="">
                <p className="text-[11px] font-body font-semibold uppercase tracking-wider text-white/60">
                  Taxonomy &amp; Origin
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-white/10 font-body text-[11px]">
                    Genus: {topSpecies.genus}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 font-body text-[11px] capitalize">
                    Type: {topSpecies.plantType}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 font-body text-[11px] capitalize">
                    Origin: {topSpecies.origin}
                  </span>
                </div>
              </div>
            </div>

            {/* Complete Monograph or Pending Overview */}
            {hasRichContent(topSpecies.id) ? (
              <>
                {/* Identifying Features */}
                <div className="liquid-glass rounded-xl p-5 border border-white/10 space-y-2" data-glow="">
                  <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Identifying Botanical Features
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-white/80 leading-relaxed">
                    {topSpecies.identifyingFeatures.map((feat, idx) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                </div>

                {/* Habitat & Distribution */}
                {topSpecies.habitat && (
                  <div className="liquid-glass rounded-xl p-4 border border-white/10 space-y-1" data-glow="">
                    <p className="text-[11px] font-body font-semibold uppercase tracking-wider text-white/60">
                      Natural Habitat &amp; Distribution
                    </p>
                    <p className="leading-relaxed">{topSpecies.habitat}</p>
                  </div>
                )}

                {/* Traditional Uses with safety flag */}
                {topSpecies.uses.length > 0 && (
                  <div className="liquid-glass rounded-xl p-5 border border-white/10 space-y-2" data-glow="">
                    <p className="text-xs font-body font-semibold uppercase tracking-wider text-emerald-400">
                      Traditional &amp; Practical Uses
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-white/80 leading-relaxed">
                      {topSpecies.uses.map((use, idx) => (
                        <li key={idx}>{use}</li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-white/50 pt-1 italic">
                      Educational information only, not medical advice.
                    </p>
                  </div>
                )}

                {/* Care Tips */}
                {topSpecies.careTips.length > 0 && (
                  <div className="liquid-glass rounded-xl p-5 border border-white/10 space-y-2" data-glow="">
                    <p className="text-xs font-body font-semibold uppercase tracking-wider text-teal-300">
                      Cultivation &amp; Care Tips
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-white/80 leading-relaxed">
                      {topSpecies.careTips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Toxicity / Safety Note */}
                {topSpecies.isToxic ? (
                  <div className="liquid-glass rounded-xl p-4 border border-rose-500/30 bg-rose-950/20 text-rose-200 flex items-start gap-3">
                    <span className="text-base" aria-hidden="true">⚠️</span>
                    <div>
                      <p className="font-semibold text-xs text-rose-100">Toxicity &amp; Precautions</p>
                      <p className="text-[11px] leading-relaxed mt-0.5">{topSpecies.toxicityNote}</p>
                    </div>
                  </div>
                ) : topSpecies.toxicityNote ? (
                  <div className="liquid-glass rounded-xl p-4 border border-emerald-500/20 bg-emerald-950/10 text-emerald-100/90 flex items-start gap-3">
                    <span className="text-base" aria-hidden="true">🌿</span>
                    <div>
                      <p className="font-semibold text-xs text-emerald-300">Safety &amp; Edibility</p>
                      <p className="text-[11px] leading-relaxed mt-0.5 text-white/80">{topSpecies.toxicityNote}</p>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="liquid-glass rounded-xl p-5 border border-white/10 space-y-2" data-glow="">
                <p className="text-xs font-body font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Botanical Monograph Pending
                </p>
                <p className="leading-relaxed font-light text-white/80">
                  {topSpecies.description}
                </p>
                <p className="text-[11px] text-white/50 pt-1 italic">
                  Extended care guidelines and traditional ethnobotanical notes for this species are being compiled. Coarse regional distribution from GBIF is available below.
                </p>
              </div>
            )}

            {/* Where It's Found - Coarse Occurrence Distribution */}
            <div className="pt-4 border-t border-white/10 space-y-4">
              <Suspense fallback={<Skeleton className="h-72 w-full rounded-2xl" />}>
                <DistributionPanel speciesId={topSpecies.id} />
              </Suspense>
            </div>
          </div>
        ) : (
          <div className="liquid-glass rounded-xl p-6 text-center text-white/60 text-xs">
            Botanical details will appear once a specimen is identified.
          </div>
        ),
      },
      {
        label: 'Similar species',
        content: (
          <SimilarSpecies
            similarMatches={result.similar}
            topSpecies={topSpecies}
            speciesMap={speciesMap}
          />
        ),
      },
      {
        label: 'Attention Heatmap',
        content: (
          <HeatmapView
            originalImageUrl={photos[0]?.previewUrl || ''}
            camData={result.camData}
          />
        ),
      },
      {
        label: 'Feedback',
        content: (
          <FeedbackPanel
            predictedSpeciesId={topSpecies?.id}
            confidence={result.top3[0]?.prob}
            modelVersion={result.modelVersion}
          />
        ),
      },
    ];
  }, [result, topSpecies, speciesMap, photos]);

  const activePhoto = photos[currentPhotoIndex] || photos[0];

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Hidden file input for adding angle to multi-photo tray */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) addPhoto(file);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => {
          setIsCameraOpen(false);
          addPhoto(file);
        }}
      />

      {/* Synchronized Hero Header */}
      <PageHero
        badge="ON-DEVICE BOTANICAL VISION"
        title="Classify Any Plant"
        italicSubtitle="Private Edge Intelligence"
        description="Drop a leaf or blossom photograph to identify species, calibrated confidence, attention heatmaps, and look-alike nuances. 100% processed locally on your device."
      />

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-6 md:px-12 space-y-8">
        {/* Visible Demo Mode Badge */}
        {isMockMode && (
          <div className="liquid-glass rounded-full px-4 py-1.5 flex items-center justify-between text-xs border border-amber-500/30 bg-amber-950/20 text-amber-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono">Demo mode: results are simulated (VITE_MOCK_ML=true)</span>
            </div>
            <span className="text-[10px] font-mono uppercase text-amber-300/80">Deterministic Fixtures</span>
          </div>
        )}

        {/* Model Loading Progress Banner (auto-hides 1.5s after 100%) */}
        {!isMockMode && showProgressBanner && (
          <div className="liquid-glass rounded-2xl p-4 border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-white space-y-2 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0 animate-ping" />
                <span className="truncate">
                  Initializing On-Device Model: {workerMsg || 'Downloading neural network...'}
                </span>
              </div>
              <span className="text-[var(--accent)] font-semibold shrink-0">
                {Math.round(workerProgress * 100)}%
              </span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--accent)] h-full transition-all duration-300"
                style={{ width: `${Math.round(workerProgress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Model Error Banner (always kept visible) */}
        {!isMockMode && workerStatus === 'error' && (
          <div className="liquid-glass rounded-2xl p-4 border border-rose-500/40 bg-rose-950/20 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
            <div className="space-y-0.5 min-w-0">
              <p className="font-semibold text-rose-100">Failed to initialize on-device neural model</p>
              <p className="text-[11px] text-rose-200/80 truncate">
                {workerErr || 'Hardware acceleration or WASM initialization failed.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="liquid-glass px-3 py-1.5 rounded-lg border border-rose-400/30 text-rose-100 hover:bg-rose-500/20 font-mono text-[11px] shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* ─── Mode Switcher (Single vs Batch) ────────────────────── */}
        <div className="flex items-center justify-center">
          <div
            className="liquid-glass p-1.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-xl"
            role="tablist"
            aria-label="Classification Mode Selection"
          >
            <button
              type="button"
              role="tab"
              aria-selected={classifyMode === 'single'}
              onClick={() => setClassifyMode('single')}
              className={`px-5 py-2 rounded-full text-xs font-mono transition-all ${
                classifyMode === 'single'
                  ? 'bg-[var(--accent)] text-black font-semibold shadow-md'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              Single Specimen
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={classifyMode === 'batch'}
              onClick={() => setClassifyMode('batch')}
              className={`px-5 py-2 rounded-full text-xs font-mono transition-all ${
                classifyMode === 'batch'
                  ? 'bg-[var(--accent)] text-black font-semibold shadow-md'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              Batch Mode (Up to 10)
            </button>
          </div>
        </div>

        {/* ─── Classification Work Area ───────────────────────────── */}
        <div className="liquid-glass-strong rounded-3xl p-6 md:p-10 border border-white/15 shadow-2xl space-y-8">
          {classifyMode === 'batch' ? (
            <BatchModeSection />
          ) : photos.length === 0 ? (
            /* Upload Zone + Samples */
            <UploadSection
              onFileSelect={(file) => addPhoto(file)}
              onCameraClick={() => setIsCameraOpen(true)}
              onSampleSelect={handleSampleSelect}
              sampleImages={SAMPLE_SPECIMENS}
            />
          ) : (
            /* Active Specimen Tray & Scan View */
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading italic text-2xl text-white">Specimen Photos</h3>
                  <p className="text-xs text-white/60 font-body">
                    Upload up to 3 angles for higher classification accuracy.
                  </p>
                </div>
                {!isAnalyzing && !result && (
                  <button
                    onClick={handleReset}
                    className="text-xs font-mono text-white/60 hover:text-white underline"
                    type="button"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Multi-Photo Tray (Shown when idle or editing) */}
              {!isAnalyzing && !result && (
                <MultiPhotoTray
                  photos={photos}
                  onRemovePhoto={removePhoto}
                  onAddClick={() => fileInputRef.current?.click()}
                  onCameraClick={() => setIsCameraOpen(true)}
                />
              )}

              {/* ─── Analyzing or Error State: Active Scanning Preview ──── */}
              {(isAnalyzing || error) && activePhoto && (
                <div className="space-y-6">
                  {/* Photo Preview with ScanOverlay */}
                  <div className="relative aspect-[4/3] max-h-96 w-full rounded-2xl overflow-hidden liquid-glass border border-white/15 shadow-2xl bg-black/40">
                    <img
                      src={activePhoto.previewUrl}
                      alt="Active Specimen Scan"
                      className="w-full h-full object-cover"
                    />
                    <ScanOverlay
                      isScanning={isAnalyzing}
                      stage={currentStage}
                      progress={stageProgress}
                      photoIndex={currentPhotoIndex}
                      totalPhotos={photos.length}
                      hasError={Boolean(error)}
                      isDone={isDone}
                      imageSeed={activePhoto.file.name}
                    />
                  </div>

                  {/* Stage Progress Panel */}
                  <StagePanel
                    isAnalyzing={isAnalyzing}
                    progress={stageProgress}
                    stageLabel={stageLabel}
                    photoIndex={currentPhotoIndex}
                    totalPhotos={photos.length}
                    error={error}
                    onCancel={handleCancel}
                    onRetry={handleIdentify}
                  />
                </div>
              )}

              {/* ─── Identify Action Trigger (Only when idle) ─────────── */}
              {!isAnalyzing && !result && !error && (
                <div className="pt-2">
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <SolidButton
                      onClick={handleIdentify}
                      data-glow=""
                      className="w-full py-4 text-sm justify-center rounded-2xl shadow-xl hover:scale-[1.01] transition-transform"
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Leaf className="w-4 h-4" />
                        <span>Identify Plant Specimen</span>
                        <ArrowUpRight className="w-4 h-4 ml-1" />
                      </div>
                    </SolidButton>
                  </motion.div>
                </div>
              )}
            </div>
          )}

          {/* ─── Results Reveal Sequence ───────────────────────────── */}
          {result && (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0 }}
              animate={prefersReduced ? false : { opacity: 1 }}
              transition={{ duration: DURATION_PAGE }}
              className="pt-8 border-t border-white/10 space-y-10"
            >
              {/* Photo + Result Card Side-by-Side Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Locked Specimen Photo on the left */}
                <motion.div
                  layout={!prefersReduced}
                  initial={prefersReduced ? false : { opacity: 0, scale: 0.95 }}
                  animate={prefersReduced ? false : { opacity: 1, scale: 1 }}
                  transition={springDefault}
                  className="lg:col-span-5 relative rounded-2xl overflow-hidden liquid-glass border border-white/15 aspect-[4/3] shadow-2xl bg-black/40"
                >
                  <img
                    src={photos[0]?.previewUrl}
                    alt="Classified Specimen"
                    className="w-full h-full object-cover"
                  />
                  <ScanOverlay
                    isScanning={false}
                    isDone={true}
                    progress={1.0}
                    photoIndex={0}
                    totalPhotos={photos.length}
                    imageSeed={photos[0]?.file.name}
                  />
                </motion.div>

                {/* Primary Result Card Sliding in from right */}
                <motion.div
                  layout={!prefersReduced}
                  initial={prefersReduced ? false : { opacity: 0, x: 24 }}
                  animate={prefersReduced ? false : { opacity: 1, x: 0 }}
                  transition={{ duration: DURATION_PAGE, ease: easeOutExpo }}
                  className="lg:col-span-7"
                >
                  <ResultCard
                    result={result}
                    topSpecies={topSpecies}
                    candidateSpecies={candidateSpecies}
                  />
                </motion.div>
              </div>

              {/* Action Buttons: Save, Download, Classify Another */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <SolidButton
                    onClick={handleSaveToHistory}
                    disabled={isSaved || isSaving}
                    data-glow=""
                    className="text-xs px-4 py-2.5 rounded-full"
                  >
                    <History className="w-3.5 h-3.5 mr-1.5" />
                    <span>{isSaving ? 'Saving...' : isSaved ? 'Saved to History' : 'Save to History'}</span>
                  </SolidButton>

                  <button
                    onClick={handleDownloadResultImage}
                    data-glow=""
                    className="liquid-glass px-4 py-2.5 rounded-full text-xs font-medium text-white hover:text-[var(--accent)] border border-white/15 transition-all hover:scale-105 cursor-pointer"
                    type="button"
                  >
                    Download Summary Image
                  </button>

                  <button
                    onClick={handleReset}
                    data-glow=""
                    className="liquid-glass px-4 py-2.5 rounded-full text-xs font-medium text-white/80 hover:text-white border border-white/15 ml-auto transition-colors cursor-pointer"
                    type="button"
                  >
                    Classify Another Plant
                  </button>
                </div>

                {/* Privacy opt-in toggle for thumbnail upload */}
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-white/70 select-none hover:text-white/90 transition-colors">
                  <input
                    type="checkbox"
                    checked={optInThumbnail}
                    onChange={(e) => setOptInThumbnail(e.target.checked)}
                    className="rounded border-white/20 text-emerald-500 focus:ring-emerald-400 bg-white/5 cursor-pointer"
                  />
                  <span>
                    Include photo thumbnail in cloud history (Default: off — photos remain private on your device)
                  </span>
                </label>
              </div>

              {/* Multi-Tab Deep Dive: Details, Similar, Heatmap, Feedback */}
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={prefersReduced ? false : { opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: DURATION_BASE, ease: easeOutExpo }}
                className="pt-4 border-t border-white/10"
              >
                <Tabs tabs={tabItems} defaultIndex={0} />
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
