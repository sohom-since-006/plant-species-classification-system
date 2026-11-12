import { useState, useRef } from 'react';
import { Upload, X, Play, RefreshCw, AlertTriangle, CheckCircle, ArrowUpRight } from '@/components/icons';
import { SolidButton } from '@/components/ui/SolidButton';
import { TierBadge } from '@/components/ui/TierBadge';
import { Modal } from '@/components/ui/Modal';
import { runClassificationPipeline } from '@/ml/pipelineRunner';
import { exportBatchToCsv, downloadCsv, type BatchExportRow } from './batchCsv';
import { getSpeciesById } from '@/services/speciesService';
import type { ClassificationResult } from '@/types/prediction';

export interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: ClassificationResult;
  error?: string;
}

export function BatchModeSection() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedItemForModal, setSelectedItemForModal] = useState<BatchItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = Math.max(0, 10 - items.length);
    if (remainingSlots === 0) return;

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

    const fileArray = Array.from(files)
      .filter((file) => ALLOWED_TYPES.includes(file.type) && file.size <= MAX_BYTES)
      .slice(0, remainingSlots);

    const newItems: BatchItem[] = fileArray.map((file, idx) => ({
      id: `${Date.now()}_${idx}_${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    if (isProcessing) return;
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleClearAll = () => {
    if (isProcessing) return;
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setCurrentIndex(0);
    setSelectedItemForModal(null);
  };

  const handleStartBatch = async () => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    for (let i = 0; i < items.length; i++) {
      if (controller.signal.aborted) break;

      const currentItem = items[i];
      if (!currentItem) continue;

      // Skip already completed items
      if (currentItem.status === 'done') continue;

      setCurrentIndex(i);
      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'processing' } : item)),
      );

      try {
        const res = await runClassificationPipeline(
          [currentItem.file],
          () => {}, // Silent stage updates in batch mode
          {
            signal: controller.signal,
            minDisplayTimeMs: 400, // Efficient batch execution
          },
        );

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'done', result: res } : item,
          ),
        );
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          break;
        }
        const errorMsg = err instanceof Error ? err.message : 'Classification failed';
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', error: errorMsg } : item,
          ),
        );
      }
    }

    setIsProcessing(false);
    abortControllerRef.current = null;
  };

  const handleCancelBatch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
  };

  const handleExportCsv = () => {
    const doneItems = items.filter((item) => item.status === 'done' && item.result);
    if (doneItems.length === 0) return;

    const exportRows: BatchExportRow[] = doneItems.map((item) => {
      const res = item.result!;
      const topCand = res.top3[0];
      const spObj = topCand?.speciesId !== undefined ? getSpeciesById(topCand.speciesId) : undefined;
      const isUnknown = res.unknown || res.tier === 'unknown';

      const commonName = isUnknown
        ? 'Unknown / Non-Plant'
        : spObj?.commonName || 'Unknown Flora';
      const scientificName = isUnknown
        ? 'Incertae sedis'
        : spObj?.scientificName || 'Flora spec.';

      const top2Cand = res.top3[1];
      const top3Cand = res.top3[2];
      const top2Sp = top2Cand?.speciesId !== undefined ? getSpeciesById(top2Cand.speciesId) : undefined;
      const top3Sp = top3Cand?.speciesId !== undefined ? getSpeciesById(top3Cand.speciesId) : undefined;

      return {
        filename: item.file.name,
        commonName,
        scientificName,
        confidence: topCand?.prob ?? 0,
        tier: res.tier,
        rejected: isUnknown,
        family: spObj?.family,
        top2: top2Sp ? `${top2Sp.commonName} (${Math.round((top2Cand?.prob ?? 0) * 100)}%)` : undefined,
        top3: top3Sp ? `${top3Sp.commonName} (${Math.round((top3Cand?.prob ?? 0) * 100)}%)` : undefined,
      };
    });

    const csvContent = exportBatchToCsv(exportRows);
    downloadCsv(csvContent, `plantai_batch_export_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const completedCount = items.filter((i) => i.status === 'done').length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Upload Zone & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h3 className="font-heading italic text-xl md:text-2xl text-[var(--fg)] flex items-center gap-2">
            <span>Batch Specimen Classification</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Up to 10 Images
            </span>
          </h3>
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Upload a collection of botanical photos to run sequential edge neural classification off-thread and export consolidated CSV reports.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {items.length > 0 && !isProcessing && (
            <button
              onClick={handleClearAll}
              className="text-xs font-mono text-[var(--fg-subtle)] hover:text-rose-400 transition-colors"
            >
              Clear All
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload batch plant images"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          <SolidButton
            onClick={() => fileInputRef.current?.click()}
            disabled={items.length >= 10 || isProcessing}
            className="text-xs px-4 py-2"
          >
            <Upload className="w-3.5 h-3.5" />
            Add Images ({items.length}/10)
          </SolidButton>
        </div>
      </div>

      {/* Progress Bar & Batch Actions */}
      {items.length > 0 && (
        <div className="liquid-glass rounded-2xl p-6 border border-white/10 space-y-4" data-glow="">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-mono uppercase text-[var(--fg-subtle)]">Batch Progress</p>
              <p className="text-sm font-semibold text-[var(--fg)] mt-0.5">
                {isProcessing
                  ? `Processing Specimen ${currentIndex + 1} of ${items.length}: "${items[currentIndex]?.file.name}"...`
                  : completedCount === items.length
                  ? `Completed all ${items.length} specimens`
                  : `${completedCount} of ${items.length} specimens classified`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isProcessing ? (
                <button
                  onClick={handleCancelBatch}
                  className="liquid-glass text-xs font-mono px-4 py-2 rounded-xl text-rose-300 border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                >
                  Cancel Batch
                </button>
              ) : (
                <SolidButton
                  onClick={handleStartBatch}
                  disabled={completedCount === items.length}
                  className="text-xs px-5 py-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  {completedCount === 0 ? 'Run Batch Inference' : 'Resume Batch'}
                </SolidButton>
              )}

              <button
                onClick={handleExportCsv}
                disabled={completedCount === 0}
                className="liquid-glass text-xs font-mono px-4 py-2 rounded-xl text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/10 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
              >
                <span>Export CSV</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Items Grid */}
      {items.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="liquid-glass-strong rounded-3xl p-12 border-2 border-dashed border-white/15 text-center cursor-pointer hover:border-[var(--accent)]/50 transition-colors space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[var(--accent)]">
            <Upload className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <p className="font-heading italic text-lg text-[var(--fg)]">
              Drop up to 10 botanical images here
            </p>
            <p className="text-xs text-[var(--fg-muted)]">
              Supports JPEG, PNG, and WebP formats. All processing executes locally on your device.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, idx) => {
            const res = item.result;
            const topCand = res?.top3[0];
            const spObj = topCand?.speciesId !== undefined ? getSpeciesById(topCand.speciesId) : undefined;
            const isUnknown = res?.unknown || res?.tier === 'unknown';

            return (
              <div
                key={item.id}
                className={`liquid-glass-strong rounded-2xl overflow-hidden border transition-all flex flex-col justify-between ${
                  item.status === 'processing'
                    ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/50'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {/* Image and status badge */}
                <div className="relative h-44 bg-black/40 overflow-hidden">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                  {!isProcessing && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md text-white/70 hover:text-white flex items-center justify-center transition-colors"
                      aria-label="Remove item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Status overlay */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    {item.status === 'processing' && (
                      <span className="liquid-glass px-2.5 py-1 rounded-full text-[10px] font-mono text-[var(--accent)] flex items-center gap-1.5 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Analyzing...
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="liquid-glass px-2.5 py-0.5 rounded-full text-[10px] font-mono text-[var(--fg-subtle)]">
                        #{idx + 1} Pending
                      </span>
                    )}
                    {item.status === 'done' && res && (
                      <span className="liquid-glass px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        Calibrated
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="bg-rose-500/80 px-2 py-0.5 rounded-full text-[10px] font-mono text-white flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Content */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-[var(--fg-subtle)] truncate">
                      {item.file.name}
                    </p>

                    {item.status === 'done' && res && (
                      <div>
                        {isUnknown ? (
                          <div>
                            <p className="font-heading italic text-base text-rose-300">
                              Unknown / Rejected
                            </p>
                            <p className="text-[11px] font-mono text-[var(--fg-muted)]">
                              Fails distance / confidence threshold
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-heading italic text-base text-[var(--fg)] truncate">
                              {spObj?.commonName || 'Plant Specimen'}
                            </p>
                            <p className="text-[11px] font-mono italic text-[var(--accent)] truncate">
                              {spObj?.scientificName || 'Flora spec.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {item.status === 'error' && (
                      <p className="text-xs text-rose-400 font-mono">{item.error}</p>
                    )}
                  </div>

                  {/* Result Indicators */}
                  {item.status === 'done' && res && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TierBadge tier={res.tier} />
                        <span className="text-xs font-mono font-bold text-[var(--fg)]">
                          {Math.round((topCand?.prob ?? 0) * 100)}%
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedItemForModal(item)}
                        className="text-xs font-mono text-[var(--accent)] hover:underline flex items-center gap-0.5"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedItemForModal && selectedItemForModal.result && (
        <Modal
          open={true}
          onClose={() => setSelectedItemForModal(null)}
          title={
            selectedItemForModal.result.unknown
              ? 'Specimen Inspection (Rejected)'
              : getSpeciesById(selectedItemForModal.result.top3[0]?.speciesId ?? -1)?.commonName || 'Specimen Inspection'
          }
        >
          <div className="space-y-6 text-[var(--fg)]">
            <div className="flex gap-4 items-start">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-black/40 shrink-0 border border-white/10">
                <img
                  src={selectedItemForModal.previewUrl}
                  alt={selectedItemForModal.file.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono text-[var(--fg-subtle)]">
                  File: {selectedItemForModal.file.name}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <TierBadge tier={selectedItemForModal.result.tier} />
                  <span className="text-sm font-mono font-bold text-[var(--accent)]">
                    {Math.round((selectedItemForModal.result.top3[0]?.prob ?? 0) * 100)}% Confidence
                  </span>
                </div>
                {selectedItemForModal.result.unknown && (
                  <p className="text-xs text-rose-300 font-mono mt-1">
                    Out of distribution: cosine distance to genus centroid exceeds τ=0.31 or probability &lt; 57%.
                  </p>
                )}
              </div>
            </div>

            {/* Candidate Breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase text-[var(--fg-subtle)]">Candidate Matches</p>
              <div className="space-y-2">
                {selectedItemForModal.result.top3.map((cand, idx) => {
                  const sp = getSpeciesById(cand.speciesId);
                  return (
                    <div
                      key={cand.speciesId}
                      className="liquid-glass p-3 rounded-xl flex items-center justify-between text-xs font-mono border border-white/5"
                    >
                      <div>
                        <span className="text-[var(--fg-subtle)] mr-2">#{idx + 1}</span>
                        <span className="text-[var(--fg)] font-semibold">{sp?.commonName || 'Flora'}</span>
                        <span className="text-[var(--fg-muted)] italic ml-1.5">({sp?.scientificName || 'spec.'})</span>
                      </div>
                      <span className="text-[var(--accent)] font-bold">
                        {Math.round(cand.prob * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-[var(--fg-muted)]">
              Evaluated with MobileNetV4 • Version {selectedItemForModal.result.modelVersion}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
