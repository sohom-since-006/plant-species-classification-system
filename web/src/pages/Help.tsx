import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '@/components/layout/PageHero';
import {
  Search,
  Lightbulb,
  X,
  ChevronDown,
  Info,
  ArrowUpRight,
} from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

interface FaqItem {
  id: string;
  category: string;
  q: string;
  a: string;
  badge?: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'good-photo',
    category: 'Photography',
    badge: 'Field Technique',
    q: 'How do I take a good botanical photo for the highest classification accuracy?',
    a: 'For best results: 1) Fill 70% of the frame with a single healthy, mature plant organ (leaf venation, open blossom, or bark texture). 2) Use natural, diffused daylight—avoid harsh flash or heavy backlighting. 3) Keep the camera steady to prevent motion blur. 4) Place your hand or a neutral surface behind thin foliage to eliminate background clutter such as lawn grass or garden furniture.',
  },
  {
    id: 'why-not-confident',
    category: 'Diagnostics',
    badge: 'Rejection Gate',
    q: 'Why does the app say "We\'re not sure" or mark a specimen as "Unknown / Rejected"?',
    a: 'PlantAI employs dual out-of-distribution (OOD) rejection gates: maximum probability below 0.57 or cosine distance to genus embedding centroids exceeding τ=0.31. When an image is blurry, captures a non-plant object (like a pebble, fabric, or food), or depicts a plant not present in our 112 cataloged species, the model refuses to guess and safely marks it as rejected.',
  },
  {
    id: 'confidence-tiers',
    category: 'Model Telemetry',
    badge: 'Calibration',
    q: 'What do the confidence tiers (High, Medium, Low, Unknown) mean?',
    a: '• High (> 85%): Strong taxonomic alignment. On our held-out test split, High-tier classifications achieve 97.4% empirical accuracy.\n• Medium (60% – 85%): Likely match (74.1% test accuracy). Review similar look-alikes to verify distinguishing petal counts or margins.\n• Low (< 60%): Ambiguous or degraded specimen (37.7% test accuracy). Genus-level fallback is recommended.\n• Unknown / Rejected: Image failed confidence or centroid thresholds. Retake photo with clearer focus.',
  },
  {
    id: 'supported-formats',
    category: 'Compatibility',
    badge: 'File Types',
    q: 'What image formats, sizes, and camera inputs are supported?',
    a: 'PlantAI supports standard web image formats: JPEG (.jpg, .jpeg), PNG (.png), and WebP (.webp). Photos taken with smartphones (including HEIC on iOS browsers that automatically decode it) are processed. Giant images (> 2048px) are automatically resized on the browser main thread before tensor generation. You can also use live webcam/phone camera capture directly via the camera button.',
  },
  {
    id: 'privacy-guarantee',
    category: 'Security',
    badge: 'Zero-Cloud',
    q: 'Are my photographs uploaded to any remote server or third-party cloud?',
    a: 'Never. PlantAI executes the entire neural vision network locally on your device via ONNX Runtime Web using WebAssembly and WebGPU. Your photos never leave your device memory and are discarded immediately after classification. If you sign in and click "Save to Field History", only the prediction metadata (species id, confidence, date) is saved. Specimen thumbnail storage requires an explicit checkbox opt-in per scan.',
  },
  {
    id: 'supported-species',
    category: 'Taxonomy',
    badge: '112 Taxa',
    q: 'Which plant species are currently supported by the model?',
    a: 'The system recognizes 112 botanical species across more than 50 families, focusing on prevalent medicinal, culinary, ornamental, and native plants of South Asia and worldwide flora (including Tulsi, Neem, Peepal, Aloe vera, Lemongrass, Hibiscus, Mint, Banyan, and Ashoka). You can browse the complete interactive herbarium on the Explore page.',
  },
];

export function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(['good-photo', 'why-not-confident']));

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenIds(new Set(FAQS.map((f) => f.id)));
  const collapseAll = () => setOpenIds(new Set());

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (item) =>
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero */}
      <PageHero
        badge="FIELD GUIDE &amp; SYSTEM DOCUMENTATION"
        title="Field Guide &amp; FAQ"
        italicSubtitle="Botanical Photography &amp; Diagnostic FAQ"
        description="Master the art of specimen field photography and understand the calibrated telemetry behind our on-device botanical neural network."
      />

      <div className="max-w-5xl mx-auto px-6 md:px-12 space-y-16">
        {/* Photography Best Practices Grid */}
        <section aria-labelledby="photography-practices">
          <h2 id="photography-practices" className="font-heading italic text-2xl md:text-3xl text-[var(--fg)] mb-6 text-center">
            How to Capture Diagnostic Botanical Photos
          </h2>

          <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DO Card */}
            <StaggerItem>
              <div
                data-glow=""
                className="liquid-glass-strong rounded-3xl p-6 md:p-8 space-y-4 border-l-4 border-l-emerald-400 h-full"
              >
                <div className="flex items-center gap-2 text-emerald-400">
                  <Lightbulb className="w-5 h-5" />
                  <h3 className="font-heading italic text-xl">Recommended Practices</h3>
                </div>
                <ul className="space-y-3 text-xs md:text-sm text-[var(--fg-muted)] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Diagnostic Close-ups:</strong> Focus sharply on a single leaf's margin/venation, an open blossom, or stem arrangement.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Diffused Natural Light:</strong> Overcast sky or morning shade reveals true pigmentation without reflective glare.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Neutral Isolation:</strong> Place a neutral card or open hand behind delicate stems to mask background vegetation.</span>
                  </li>
                </ul>
              </div>
            </StaggerItem>

            {/* DON'T Card */}
            <StaggerItem>
              <div
                data-glow=""
                className="liquid-glass-strong rounded-3xl p-6 md:p-8 space-y-4 border-l-4 border-l-rose-400 h-full"
              >
                <div className="flex items-center gap-2 text-rose-400">
                  <X className="w-5 h-5" />
                  <h3 className="font-heading italic text-xl">Avoid These Traps</h3>
                </div>
                <ul className="space-y-3 text-xs md:text-sm text-[var(--fg-muted)] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>Distant Landscape Vistas:</strong> A tree occupying 5% of a panoramic vista cannot provide identifiable leaf architecture.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>Severe Motion Blur:</strong> Wind shaking branches will destroy the high-frequency edge features needed by convolutional kernels.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span><strong>Decomposed Specimens:</strong> Severely dried, rotting, or insect-skeletonized leaves deviate significantly from training sets.</span>
                  </li>
                </ul>
              </div>
            </StaggerItem>
          </Stagger>
        </section>

        {/* Interactive FAQ Section */}
        <section aria-labelledby="faq-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 id="faq-heading" className="font-heading italic text-2xl sm:text-3xl text-[var(--fg)]">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1">
                Real search across technical, taxonomic, and privacy inquiries.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={expandAll}
                className="text-xs font-mono text-[var(--fg-subtle)] hover:text-[var(--accent)] transition-colors"
              >
                Expand all
              </button>
              <span className="text-white/20">|</span>
              <button
                onClick={collapseAll}
                className="text-xs font-mono text-[var(--fg-subtle)] hover:text-[var(--accent)] transition-colors"
              >
                Collapse all
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--fg-subtle)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions by topic (e.g., confidence, privacy, formats, lighting)..."
              aria-label="Search frequently asked questions"
              className="w-full pl-11 pr-10 py-3 rounded-2xl liquid-glass border border-white/10 text-xs md:text-sm text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* FAQ Accordion List */}
          {filteredFaqs.length === 0 ? (
            <div className="liquid-glass rounded-2xl p-8 text-center space-y-2 border border-white/10">
              <p className="text-sm font-heading italic text-[var(--fg)]">No matching answers found</p>
              <p className="text-xs text-[var(--fg-muted)]">
                Try searching for keywords like "confidence", "formats", "privacy", or "accuracy".
              </p>
            </div>
          ) : (
            <div className="space-y-4" role="region" aria-label="FAQ items list">
              {filteredFaqs.map((faq) => {
                const isOpen = openIds.has(faq.id);
                return (
                  <div
                    key={faq.id}
                    className="liquid-glass-strong rounded-2xl border border-white/10 overflow-hidden transition-colors hover:border-white/20"
                  >
                    <button
                      onClick={() => toggleItem(faq.id)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${faq.id}`}
                      className="w-full text-left p-5 md:p-6 flex items-start justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 text-[var(--accent)] border border-white/10">
                            {faq.category}
                          </span>
                          {faq.badge && (
                            <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
                              • {faq.badge}
                            </span>
                          )}
                        </div>
                        <h3 className="font-heading italic text-base md:text-lg text-[var(--fg)]">
                          {faq.q}
                        </h3>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-[var(--fg-subtle)] shrink-0 mt-1 transition-transform duration-300 ${
                          isOpen ? 'rotate-180 text-[var(--accent)]' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div
                        id={`faq-answer-${faq.id}`}
                        className="px-5 md:px-6 pb-6 pt-1 text-xs md:text-sm text-[var(--fg-muted)] leading-relaxed border-t border-white/5 space-y-3 font-body whitespace-pre-line"
                      >
                        <p>{faq.a}</p>
                        {faq.id === 'supported-species' && (
                          <div className="pt-2">
                            <Link
                              to="/explore"
                              className="inline-flex items-center gap-1 font-mono text-xs text-[var(--accent)] hover:underline"
                            >
                              <span>Browse 112 Supported Species in Explore Catalog</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Botanical Safety Bottom Card */}
        <section className="liquid-glass rounded-3xl p-6 md:p-8 flex items-start gap-4 border border-[var(--warn)]/20 bg-[var(--warn)]/5 text-xs text-[var(--fg-muted)]">
          <Info className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" />
          <div className="space-y-1 font-body">
            <h4 className="font-heading italic text-sm text-[var(--fg)]">
              Vital Safety Notice
            </h4>
            <p className="leading-relaxed">
              Automated computer vision predictions must never be used for edibility, foraging, or medicinal consumption. Visual morphology cannot detect lethal botanical toxins. If you suspect accidental poisoning, contact emergency poison control immediately.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
