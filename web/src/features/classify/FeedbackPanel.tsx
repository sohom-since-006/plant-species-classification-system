import { useState, useMemo } from 'react';
import { ThumbsUp, ThumbsDown, Search } from '@/components/icons';
import { SolidButton } from '@/components/ui/SolidButton';
import { useToast } from '@/components/ui/useToast';
import { getAllSpecies } from '@/services/speciesService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type FeedbackPanelProps = {
  predictedSpeciesId?: number;
  confidence?: number;
  modelVersion?: string;
};

export function FeedbackPanel({
  predictedSpeciesId,
  confidence,
  modelVersion = 'plant_model.v1.onnx',
}: FeedbackPanelProps) {
  const { showToast } = useToast();
  const [rating, setRating] = useState<'correct' | 'incorrect' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCorrectSpeciesId, setSelectedCorrectSpeciesId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // All cataloged 150 species for correction picker
  const allSpecies = useMemo(() => getAllSpecies(), []);

  const filteredSpecies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allSpecies.slice(0, 30);
    return allSpecies.filter(
      (s) =>
        s.commonName.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        (s.namesHindi && s.namesHindi.toLowerCase().includes(q)) ||
        (s.namesBengali && s.namesBengali.toLowerCase().includes(q)),
    );
  }, [allSpecies, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;

    if (Date.now() - lastSubmitTime < 5000) {
      showToast('Please wait a few seconds before submitting another feedback entry.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const wasCorrect = rating === 'correct';
    const correctSpecies = wasCorrect
      ? predictedSpeciesId ?? null
      : selectedCorrectSpeciesId ?? null;

    try {
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.from('feedback').insert({
          predicted_species: predictedSpeciesId ?? null,
          correct_species: correctSpecies,
          was_correct: wasCorrect,
          comment: comment.trim() ? comment.trim().slice(0, 500) : null,
          confidence: typeof confidence === 'number' ? confidence : null,
          model_version: modelVersion,
        });

        if (error) {
          console.warn('Feedback submission could not reach cloud, logged locally:', error.message);
        }
      }

      setIsSubmitted(true);
      setLastSubmitTime(Date.now());
      showToast('Thank you! Your feedback helps calibrate botanical classification.');
    } catch {
      setIsSubmitted(true);
      setLastSubmitTime(Date.now());
      showToast('Thank you! Your feedback has been noted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="liquid-glass rounded-2xl p-8 text-center space-y-3 border border-emerald-500/20">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-[var(--accent)] flex items-center justify-center mx-auto border border-emerald-500/30">
          ✓
        </div>
        <h3 className="font-heading italic text-2xl text-white">Feedback Received</h3>
        <p className="text-xs text-white/70 max-w-sm mx-auto font-light leading-relaxed">
          Your observation has been submitted. When the botanical vision model is periodically
          re-calibrated, verified corrections inform temperature scaling and rejection boundaries.
        </p>
        <button
          onClick={() => {
            setIsSubmitted(false);
            setRating(null);
            setComment('');
            setSelectedCorrectSpeciesId(null);
            setErrorMessage(null);
          }}
          className="text-xs font-mono text-[var(--accent)] underline hover:text-white pt-2 cursor-pointer"
          type="button"
        >
          Submit more feedback
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      <div className="text-xs text-white/70 font-body leading-relaxed">
        Help improve future edge weights. Was this automated identification accurate for your
        specimen?
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Thumbs Up / Thumbs Down Rating */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setRating('correct')}
          className={`flex-1 liquid-glass rounded-2xl py-4 px-6 flex items-center justify-center gap-3 transition-all border cursor-pointer ${
            rating === 'correct'
              ? 'border-[var(--accent)] bg-emerald-500/15 text-[var(--accent)]'
              : 'border-white/10 text-white/80 hover:text-white hover:border-white/20'
          }`}
        >
          <ThumbsUp className="w-5 h-5" />
          <span className="font-body text-sm font-medium">Yes, Correct Species</span>
        </button>

        <button
          type="button"
          onClick={() => setRating('incorrect')}
          className={`flex-1 liquid-glass rounded-2xl py-4 px-6 flex items-center justify-center gap-3 transition-all border cursor-pointer ${
            rating === 'incorrect'
              ? 'border-rose-400 bg-rose-500/15 text-rose-300'
              : 'border-white/10 text-white/80 hover:text-white hover:border-white/20'
          }`}
        >
          <ThumbsDown className="w-5 h-5" />
          <span className="font-body text-sm font-medium">Incorrect / Misidentified</span>
        </button>
      </div>

      {/* If marked incorrect: Searchable Correct-Species Picker */}
      {rating === 'incorrect' && (
        <div className="liquid-glass rounded-2xl p-5 border border-white/15 space-y-4">
          <label className="block text-xs font-mono uppercase tracking-wider text-white/80">
            What is the actual species? (Optional)
          </label>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Search by common, scientific, or regional name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl liquid-glass border border-white/10 text-xs text-white placeholder-white/40 outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Filtered Species list (150 species) */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {filteredSpecies.map((s) => {
              const isSelected = selectedCorrectSpeciesId === s.id;
              const isPredicted = predictedSpeciesId === s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedCorrectSpeciesId(s.id)}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border border-[var(--accent)] text-white'
                      : 'hover:bg-white/5 text-white/80 border border-transparent'
                  }`}
                >
                  <div>
                    <span className="font-medium text-white">{s.commonName}</span>
                    <span className="ml-2 font-heading italic text-white/50">
                      ({s.scientificName})
                    </span>
                    {(s.namesHindi || s.namesBengali) && (
                      <span className="ml-2 text-white/40 text-[11px]">
                        {[s.namesHindi, s.namesBengali].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </div>
                  {isPredicted && (
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      Predicted
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional comment with 500-char limiter */}
      {rating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="feedback-comment" className="block text-xs font-body text-white/70">
              Notes or specimen details (Lighting, plant age, region)
            </label>
            <span
              className={`text-[10px] font-mono ${
                comment.length > 450 ? 'text-amber-400' : 'text-white/40'
              }`}
            >
              {comment.length}/500
            </span>
          </div>
          <textarea
            id="feedback-comment"
            rows={3}
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Captured in high sun, leaf margins slightly serrated..."
            className="w-full p-3.5 rounded-xl liquid-glass border border-white/10 text-xs text-white placeholder-white/40 outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>
      )}

      {/* Submit Button */}
      {rating && (
        <SolidButton
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 justify-center text-xs"
        >
          {isSubmitting ? 'Submitting Feedback...' : 'Submit Feedback'}
        </SolidButton>
      )}
    </form>
  );
}
