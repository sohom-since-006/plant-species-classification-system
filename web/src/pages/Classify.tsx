import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import { SolidButton } from '@/components/ui/SolidButton';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/useToast';
import { CameraCapture } from '@/features/classify/CameraCapture';
import { UploadSection, type SampleImage } from '@/features/classify/UploadSection';
import { MultiPhotoTray, type PhotoItem } from '@/features/classify/MultiPhotoTray';
import { ResultCard } from '@/features/classify/ResultCard';
import { SimilarSpecies } from '@/features/classify/SimilarSpecies';
import { HeatmapView } from '@/features/classify/HeatmapView';
import { FeedbackPanel } from '@/features/classify/FeedbackPanel';
import { useHistoryStore } from '@/features/history/useHistoryStore';
import { MOCK_SPECIES, getSpeciesById } from '@/data/mockSpecies';
import { getMockResult, isMockMode } from '@/ml/mock';
import type { ClassificationResult, SavedPrediction } from '@/types/prediction';
import type { Species } from '@/types/species';
import { ArrowUpRight, History, Leaf } from '@/components/icons';

const SAMPLE_SPECIMENS: SampleImage[] = [
  {
    name: 'Ocimum tenuiflorum',
    common: 'Tulsi (High Confidence)',
    url: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400&q=80',
    fixtureIndex: 0,
  },
  {
    name: 'Hibiscus rosa-sinensis',
    common: 'Hibiscus (Medium Confidence)',
    url: 'https://images.unsplash.com/photo-1550950158-d0d960dff51b?w=400&q=80',
    fixtureIndex: 1,
  },
  {
    name: 'Ocimum basilicum',
    common: 'Sweet Basil (Genus Fallback)',
    url: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=400&q=80',
    fixtureIndex: 2,
  },
  {
    name: 'Non-Plant / Texture',
    common: 'Pebble (Unknown / Rejected)',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&q=80',
    fixtureIndex: 3,
  },
];

export function Classify() {
  const location = useLocation();
  const { showToast } = useToast();
  const addPrediction = useHistoryStore((state) => state.addPrediction);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [forcedFixture, setForcedFixture] = useState<number | undefined>(undefined);
  const [isSaved, setIsSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Species Lookup Map
  const speciesMap = useMemo(() => {
    const map = new Map<number, Species>();
    MOCK_SPECIES.forEach((s) => map.set(s.id, s));
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

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  const addPhoto = (file: File, forcedIdx?: number) => {
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
    setIsSaved(false);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setResult(null);
    setIsSaved(false);
  };

  const handleSampleSelect = async (sample: SampleImage) => {
    try {
      // Create a deterministic mock file from sample image name
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
      setIsSaved(false);
    } catch {
      showToast('Could not load sample specimen.');
    }
  };

  const handleIdentify = () => {
    if (photos.length === 0) return;
    setIsAnalyzing(true);
    setResult(null);

    // Simulate on-device ONNX inference duration
    setTimeout(() => {
      setIsAnalyzing(false);
      const primaryPhoto = photos[0]!.file;
      const res = getMockResult(primaryPhoto, forcedFixture);
      setResult(res);
      setIsSaved(false);
    }, 1100);
  };

  const handleReset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setResult(null);
    setForcedFixture(undefined);
    setIsSaved(false);
  };

  const handleSaveToHistory = () => {
    if (!result || isSaved) return;

    const topId = result.top3[0]?.speciesId;
    const topSpecies = topId ? getSpeciesById(topId) : undefined;
    const topProb = result.top3[0]?.prob ?? 0;

    const entry: SavedPrediction = {
      id: `pred_${Date.now()}`,
      speciesId: topId ?? null,
      confidence: topProb,
      tier: result.tier,
      top3: result.top3,
      similar: result.similar,
      imagePath: photos[0]?.previewUrl ?? null,
      modelVersion: result.modelVersion,
      createdAt: new Date().toISOString(),
      speciesName: topSpecies
        ? `${topSpecies.commonName} (${topSpecies.scientificName})`
        : 'Unrecognized Specimen',
    };

    addPrediction(entry);
    setIsSaved(true);
    showToast('Saved to your local identification history!');
  };

  const handleDownloadResultImage = () => {
    if (!result) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw card background
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, 800, 600);

    // Border
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 760, 560);

    // Header branding
    ctx.fillStyle = '#6EE7A8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('PLANT SPECIES CLASSIFICATION SYSTEM', 50, 60);

    // Title & Scientific Name
    const topId = result.top3[0]?.speciesId;
    const topSpecies = topId ? getSpeciesById(topId) : undefined;
    const commonName = topSpecies ? topSpecies.commonName : 'Unrecognized Specimen';
    const sciName = topSpecies ? topSpecies.scientificName : 'Unknown taxon';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 32px serif';
    ctx.fillText(commonName, 50, 110);

    ctx.fillStyle = '#6EE7A8';
    ctx.font = 'italic 20px serif';
    ctx.fillText(sciName, 50, 145);

    // Confidence & Tier
    const probPct = Math.round((result.top3[0]?.prob ?? 0) * 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`Confidence: ${probPct}%  |  Tier: ${result.tier.toUpperCase()}`, 50, 200);

    // Candidate breakdown
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '14px sans-serif';
    ctx.fillText('Top Candidate Probabilities:', 50, 250);

    result.top3.forEach((pred, i) => {
      const sp = getSpeciesById(pred.speciesId);
      const name = sp ? `${sp.commonName} (${sp.scientificName})` : `Class #${pred.speciesId}`;
      const pct = (pred.prob * 100).toFixed(1);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText(`${i + 1}. ${name} — ${pct}%`, 50, 280 + i * 30);
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

  const topSpecies = result?.top3[0]?.speciesId
    ? speciesMap.get(result.top3[0].speciesId)
    : undefined;

  const candidateSpecies = result?.top3.map((p) => speciesMap.get(p.speciesId)) ?? [];

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
              <div className="liquid-glass rounded-xl p-4 border border-white/10 space-y-1.5">
                <p className="text-[10px] font-mono uppercase text-white/50">Regional Names</p>
                <p>
                  <strong className="text-white">Hindi:</strong> {topSpecies.namesHindi || '—'}
                </p>
                <p>
                  <strong className="text-white">Bengali:</strong>{' '}
                  {topSpecies.namesBengali || '—'}
                </p>
              </div>

              <div className="liquid-glass rounded-xl p-4 border border-white/10 space-y-1.5">
                <p className="text-[10px] font-mono uppercase text-white/50">Taxonomy & Origin</p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px]">
                    Genus: {topSpecies.genus}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] capitalize">
                    Type: {topSpecies.plantType}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] capitalize">
                    Origin: {topSpecies.origin}
                  </span>
                </div>
              </div>
            </div>

            {/* Identifying Features */}
            <div className="liquid-glass rounded-xl p-5 border border-white/10 space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
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
              <div className="liquid-glass rounded-xl p-4 border border-white/10 space-y-1">
                <p className="text-[10px] font-mono uppercase text-white/50">
                  Natural Habitat & Distribution
                </p>
                <p className="leading-relaxed">{topSpecies.habitat}</p>
              </div>
            )}

            {/* Traditional Uses with safety flag */}
            <div className="liquid-glass rounded-xl p-5 border border-white/10 space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                Traditional & Practical Uses
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

            {/* Care Tips */}
            <div className="liquid-glass rounded-xl p-5 border border-white/10 space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-teal-300 font-semibold">
                Cultivation & Care Tips
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/80 leading-relaxed">
                {topSpecies.careTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            {/* Toxicity Warning */}
            {topSpecies.toxicityNote && (
              <div className="liquid-glass rounded-xl p-4 border border-rose-500/30 bg-rose-950/20 text-rose-200 flex items-start gap-3">
                <span className="text-base" aria-hidden="true">⚠️</span>
                <div>
                  <p className="font-semibold text-xs text-rose-100">Toxicity & Precautions</p>
                  <p className="text-[11px] leading-relaxed mt-0.5">{topSpecies.toxicityNote}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="liquid-glass rounded-xl p-6 text-center text-white/60 text-xs">
            Botanical details are only available for recognized plant species.
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
        content: <FeedbackPanel predictedSpeciesId={topSpecies?.id} />,
      },
    ];
  }, [result, topSpecies, speciesMap, photos]);

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
      <div className="max-w-4xl mx-auto px-6 md:px-12 space-y-8">
        {/* Visible Demo Mode Badge (Requirement 10) */}
        {isMockMode && (
          <div className="liquid-glass rounded-full px-4 py-1.5 flex items-center justify-between text-xs border border-amber-500/30 bg-amber-950/20 text-amber-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono">Demo mode: results are simulated (VITE_MOCK_ML=true)</span>
            </div>
            <span className="text-[10px] font-mono uppercase text-amber-300/80">Deterministic Fixtures</span>
          </div>
        )}

        {/* ─── Classification Work Area ───────────────────────────── */}
        <div className="liquid-glass-strong rounded-3xl p-6 md:p-10 border border-white/15 shadow-2xl space-y-8">
          {photos.length === 0 ? (
            /* Upload Zone + Samples */
            <UploadSection
              onFileSelect={(file) => addPhoto(file)}
              onCameraClick={() => setIsCameraOpen(true)}
              onSampleSelect={handleSampleSelect}
              sampleImages={SAMPLE_SPECIMENS}
            />
          ) : (
            /* Multi-Photo Tray & Controls */
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading italic text-2xl text-white">Specimen Photos</h3>
                  <p className="text-xs text-white/60 font-body">
                    Upload up to 3 angles for higher classification accuracy.
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs font-mono text-white/60 hover:text-white underline"
                  type="button"
                >
                  Clear all
                </button>
              </div>

              {/* Photo Tray */}
              <MultiPhotoTray
                photos={photos}
                onRemovePhoto={removePhoto}
                onAddClick={() => fileInputRef.current?.click()}
                onCameraClick={() => setIsCameraOpen(true)}
              />

              {/* Identify Action Trigger */}
              {!result && (
                <div className="pt-2">
                  <SolidButton
                    onClick={handleIdentify}
                    disabled={isAnalyzing}
                    className="w-full py-4 text-sm justify-center rounded-2xl shadow-xl hover:scale-[1.01] transition-transform"
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                        <span>Analyzing botanical traits on-device...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 font-medium">
                        <Leaf className="w-4 h-4" />
                        <span>Identify Plant Specimen</span>
                        <ArrowUpRight className="w-4 h-4 ml-1" />
                      </div>
                    )}
                  </SolidButton>
                </div>
              )}
            </div>
          )}

          {/* ─── Results & Tabs Container ─────────────────────────── */}
          {result && (
            <div className="pt-8 border-t border-white/10 space-y-10 animate-fade-in">
              {/* Primary Result Card */}
              <ResultCard
                result={result}
                topSpecies={topSpecies}
                candidateSpecies={candidateSpecies}
              />

              {/* Action Buttons: Save, Download, Classify Another */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <SolidButton
                  onClick={handleSaveToHistory}
                  disabled={isSaved}
                  className="text-xs px-4 py-2.5 rounded-full"
                >
                  <History className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isSaved ? 'Saved to History' : 'Save to History'}</span>
                </SolidButton>

                <button
                  onClick={handleDownloadResultImage}
                  className="liquid-glass px-4 py-2.5 rounded-full text-xs font-medium text-white hover:text-[var(--accent)] border border-white/15 transition-all hover:scale-105"
                  type="button"
                >
                  Download Summary Image
                </button>

                <button
                  onClick={handleReset}
                  className="liquid-glass px-4 py-2.5 rounded-full text-xs font-medium text-white/80 hover:text-white border border-white/15 ml-auto transition-colors"
                  type="button"
                >
                  Classify Another Plant
                </button>
              </div>

              {/* Multi-Tab Deep Dive: Details, Similar, Heatmap, Feedback */}
              <div className="pt-4 border-t border-white/10">
                <Tabs tabs={tabItems} defaultIndex={0} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
