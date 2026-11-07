import { PageHero } from '@/components/layout/PageHero';
import { Globe, Leaf, Lightbulb, Info } from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

export function About() {
  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge="OPEN SCIENCE & EDGE AI"
        title="About The System"
        italicSubtitle="Private Botanical Intelligence"
        description="A modern, high-precision plant species classification platform engineered to run entirely within your web browser using on-device neural networks."
      />

      <div className="max-w-5xl mx-auto px-6 md:px-12 space-y-12">
        {/* Core Pillars */}
        <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StaggerItem>
            <div className="liquid-glass-strong rounded-3xl p-8 space-y-4 h-full" data-glow="">
              <Leaf className="w-8 h-8 text-[var(--accent)]" />
              <h2 className="font-heading italic text-2xl text-[var(--fg)]">
                Uncompromising Privacy
              </h2>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                Traditional plant identification apps send every photo you take to remote cloud servers for analysis. Our system executes the entire convolutional neural vision model directly on your device via ONNX Runtime Web. Your photos never leave your device.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="liquid-glass-strong rounded-3xl p-8 space-y-4 h-full" data-glow="">
              <Lightbulb className="w-8 h-8 text-[var(--accent)]" />
              <h2 className="font-heading italic text-2xl text-[var(--fg)]">
                Zero-latency Edge Inference
              </h2>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                By utilizing WebAssembly SIMD and WebGL/WebGPU acceleration, models execute in a background Web Worker without freezing your UI thread, delivering instant classifications in under two seconds even on weak mobile connections or offline.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="liquid-glass-strong rounded-3xl p-8 space-y-4 h-full" data-glow="">
              <Globe className="w-8 h-8 text-[var(--accent)]" />
              <h2 className="font-heading italic text-2xl text-[var(--fg)]">
                Open Biodiversity Data
              </h2>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                Our taxonomy hierarchies and training samples originate from open scientific biodiversity networks, including GBIF (Global Biodiversity Information Facility) and iNaturalist community research grade observations.
              </p>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="liquid-glass-strong rounded-3xl p-8 space-y-4 h-full" data-glow="">
              <Leaf className="w-8 h-8 text-[var(--accent)]" />
              <h2 className="font-heading italic text-2xl text-[var(--fg)]">
                Honest Calibrated Confidence
              </h2>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                Instead of overconfident black-box answers, the system presents temperature-calibrated probabilities, highlights close look-alikes, and explicitly informs you when an image is ambiguous or out of distribution.
              </p>
            </div>
          </StaggerItem>
        </Stagger>

        {/* Botanical Safety Notice */}
        <div className="liquid-glass rounded-2xl p-6 flex items-start gap-4 text-xs font-body text-[var(--fg-muted)]">
          <Info className="w-5 h-5 text-[var(--warn)] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[var(--fg)]">Botanical &amp; Medicinal Safety:</strong>{' '}
            Automated visual recognition cannot replace an expert botanist or toxicologist. Never consume, prepare teas, or apply any wild plant based on automated identification. Certain toxic look-alikes (e.g. hemlock vs wild carrot) require microscopic inspection.
          </p>
        </div>

        {/* Open Source Credits */}
        <div className="liquid-glass rounded-3xl p-8 text-center space-y-4">
          <h3 className="font-heading italic text-2xl text-[var(--fg)]">
            Built on Open Tools
          </h3>
          <p className="text-xs text-[var(--fg-muted)] max-w-xl mx-auto">
            Powered by PyTorch, ONNX Runtime Web, Vite, React, Tailwind CSS, and Framer Motion. Distributed under the MIT Open Source license.
          </p>
        </div>
      </div>
    </div>
  );
}
