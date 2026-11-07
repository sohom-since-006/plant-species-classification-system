import { PageHero } from '@/components/layout/PageHero';
import { Info, Lightbulb, X } from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

const FAQS = [
  {
    q: 'Why does the app run on-device instead of using a cloud API?',
    a: 'On-device execution gives you 100% privacy and works even in remote nature reserves with zero mobile reception. Your photos stay strictly in your browser memory and are discarded immediately after inference unless you save them.',
  },
  {
    q: 'Which plant part should I photograph for best results?',
    a: 'Blossoms and fresh mature leaves yield the highest accuracy. If possible, capture a focused close-up of the leaf venation or flower stamens, along with the stem arrangement.',
  },
  {
    q: 'How are confidence scores calculated?',
    a: 'Raw logits from the vision neural network are passed through a Platt-calibrated Softmax layer. A score above 85% denotes strong taxonomic alignment, while scores below 50% signal ambiguous morphology or unseen species.',
  },
  {
    q: 'Can this tool verify whether a plant or berry is edible?',
    a: 'No! Visual classification alone is strictly insufficient for edibility determination. Many edible species have nearly identical deadly poisonous look-alikes. Never consume any wild plant based on app output.',
  },
];

export function Help() {
  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge="GUIDANCE & FAQ"
        title="Field Guide &amp; FAQ"
        italicSubtitle="Photography &amp; Diagnostic Tips"
        description="Master the art of botanical field photography to get the highest confidence matches from our on-device neural vision network."
      />

      <div className="max-w-5xl mx-auto px-6 md:px-12 space-y-12">
        {/* Photography Best Practices Grid */}
        <div>
          <h2 className="font-heading italic text-3xl text-[var(--fg)] mb-6 text-center">
            How to Take Optimal Botanical Photos
          </h2>

          <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DO card */}
            <StaggerItem>
              <div
                data-glow=""
                className="liquid-glass-strong rounded-3xl p-8 space-y-4 border-l-4 border-l-[var(--accent)] h-full"
              >
                <div className="flex items-center gap-2 text-[var(--accent)]">
                  <Lightbulb className="w-5 h-5" />
                  <h3 className="font-heading italic text-xl">Recommended Practices</h3>
                </div>
                <ul className="space-y-3 text-xs text-[var(--fg-muted)] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold">•</span>
                    <span><strong>Clear focus on diagnostic organs:</strong> Center a single mature leaf, blossom petal, or seed pod clearly.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold">•</span>
                    <span><strong>Diffused natural lighting:</strong> Morning or late afternoon daylight reveals natural color and vein contours without harsh flash reflections.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold">•</span>
                    <span><strong>Isolate against neutral background:</strong> Place your hand or a neutral surface behind thin stems to eliminate background clutter.</span>
                  </li>
                </ul>
              </div>
            </StaggerItem>

            {/* DON'T card */}
            <StaggerItem>
              <div
                data-glow=""
                className="liquid-glass-strong rounded-3xl p-8 space-y-4 border-l-4 border-l-[var(--danger)] h-full"
              >
                <div className="flex items-center gap-2 text-[var(--danger)]">
                  <X className="w-5 h-5" />
                  <h3 className="font-heading italic text-xl">Avoid These Mistakes</h3>
                </div>
                <ul className="space-y-3 text-xs text-[var(--fg-muted)] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--danger)] font-bold">•</span>
                    <span><strong>Distant landscape shots:</strong> When a tree or plant occupies only a small fraction of the frame, neural networks cannot discern leaf teeth.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--danger)] font-bold">•</span>
                    <span><strong>Heavy motion blur:</strong> Shaking hands in wind causes loss of edge sharpness required for convolutional feature extraction.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--danger)] font-bold">•</span>
                    <span><strong>Extensive wilt or disease:</strong> Severely dried or decayed specimens can deviate from healthy taxonomic training distributions.</span>
                  </li>
                </ul>
              </div>
            </StaggerItem>
          </Stagger>
        </div>

        {/* FAQs */}
        <div className="space-y-6">
          <h2 className="font-heading italic text-3xl text-[var(--fg)] text-center">
            Frequently Asked Questions
          </h2>

          <Stagger className="space-y-4">
            {FAQS.map((faq, idx) => (
              <StaggerItem key={idx}>
                <div
                  data-glow=""
                  className="liquid-glass rounded-2xl p-6 space-y-2 hover:border-[var(--glass-edge-hi)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <h3 className="font-heading italic text-xl text-[var(--fg)]">
                      {faq.q}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)] leading-relaxed pl-6">
                    {faq.a}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        {/* Safety Disclaimer */}
        <div className="liquid-glass rounded-2xl p-6 flex items-start gap-4 text-xs font-body text-[var(--fg-muted)]">
          <Info className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[var(--fg)]">Strict Botanical Warning:</strong>{' '}
            Visual identification is strictly probabilistic. Never rely on this application for foraging, medical therapy, or consuming wild plants or mushrooms.
          </p>
        </div>
      </div>
    </div>
  );
}
