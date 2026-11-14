import { PageHero } from '@/components/layout/PageHero';
import {
  Globe,
  Leaf,
  Lightbulb,
  ShieldCheck,
  Cpu,
  ExternalLink,
  AlertTriangle,
} from '@/components/icons';

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export function About() {
  useDocumentTitle('About');
  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge="BOTANICAL INTELLIGENCE & OPEN SCIENCE"
        title="About PlantAI"
        italicSubtitle="Private On-Device Botanical Intelligence"
        description="PlantAI is an open-source, client-side biodiversity platform designed to deliver private, real-time plant species classification directly inside modern web browsers without sending images to remote clouds."
      />

      <div className="max-w-5xl mx-auto px-6 md:px-12 space-y-16">
        {/* Project Purpose */}
        <section aria-labelledby="purpose-heading" className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-xs uppercase tracking-wider">
            <Leaf className="w-4 h-4" />
            <span>Mission &amp; Purpose</span>
          </div>
          <h2 id="purpose-heading" className="font-heading italic text-3xl sm:text-4xl text-[var(--fg)]">
            Democratizing Botanical Knowledge With Complete Privacy
          </h2>
          <p className="text-sm md:text-base text-[var(--fg-muted)] leading-relaxed font-body">
            Plant identification is critical for ecology, agriculture, conservation, and education. Traditional identification applications transmit every user photograph across remote commercial servers, creating privacy risks, requiring constant high-bandwidth internet connectivity, and operating as opaque black boxes. 
          </p>
          <p className="text-sm md:text-base text-[var(--fg-muted)] leading-relaxed font-body">
            <strong>PlantAI</strong> reimagines plant classification as a local utility. By combining compact modern neural vision architectures with WebAssembly SIMD and WebGPU acceleration, PlantAI executes full convolutional inference entirely within your browser memory. Your images never leave your computer or phone.
          </p>
        </section>

        {/* How It Works - 4 Steps */}
        <section aria-labelledby="how-it-works-heading" className="space-y-6">
          <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>Architecture &amp; Pipeline</span>
          </div>
          <h2 id="how-it-works-heading" className="font-heading italic text-2xl sm:text-3xl text-[var(--fg)]">
            How It Works: 4-Stage Edge Pipeline
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="liquid-glass-strong rounded-3xl p-6 md:p-8 space-y-3 border border-white/10" data-glow="">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                01
              </div>
              <h3 className="font-heading italic text-xl text-[var(--fg)]">Specimen Capture</h3>
              <p className="text-xs md:text-sm text-[var(--fg-muted)] leading-relaxed">
                Upload or capture 1 to 3 photos of leaf venation, blossoms, fruit, or tree bark. Multi-view aggregation averages embeddings to overcome single-angle occlusion.
              </p>
            </div>

            <div className="liquid-glass-strong rounded-3xl p-6 md:p-8 space-y-3 border border-white/10" data-glow="">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-bold text-sm">
                02
              </div>
              <h3 className="font-heading italic text-xl text-[var(--fg)]">Edge Preprocessing</h3>
              <p className="text-xs md:text-sm text-[var(--fg-muted)] leading-relaxed">
                Images are read, downscaled, EXIF-oriented, and normalized to ImageNet color distributions ($224 \times 224$ pixels) locally on the browser main thread without any server transfer.
              </p>
            </div>

            <div className="liquid-glass-strong rounded-3xl p-6 md:p-8 space-y-3 border border-white/10" data-glow="">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-mono font-bold text-sm">
                03
              </div>
              <h3 className="font-heading italic text-xl text-[var(--fg)]">Off-Thread Neural Inference</h3>
              <p className="text-xs md:text-sm text-[var(--fg-muted)] leading-relaxed">
                A dedicated Web Worker invokes ONNX Runtime Web with SIMD acceleration to execute the MobileNetV4 vision model, generating class logits and genus embeddings in under 2 seconds.
              </p>
            </div>

            <div className="liquid-glass-strong rounded-3xl p-6 md:p-8 space-y-3 border border-white/10" data-glow="">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-sm">
                04
              </div>
              <h3 className="font-heading italic text-xl text-[var(--fg)]">Calibrated Taxonomy &amp; Safety</h3>
              <p className="text-xs md:text-sm text-[var(--fg-muted)] leading-relaxed">
                Raw logits are scaled with temperature calibration ($T=0.7181$). Outcomes are mapped into High (&gt; 85%), Medium (60% to 85%), and Low (&lt; 60%). If top-1 confidence is below 57% or centroid distance exceeds $\tau=0.32$, the system reports &quot;Not confident&quot; and displays the Top-3 candidates below the rejection threshold.
              </p>
            </div>
          </div>
        </section>

        {/* Dataset & Credits */}
        <section aria-labelledby="dataset-heading" className="liquid-glass rounded-3xl p-6 md:p-10 border border-white/10 space-y-6">
          <div className="flex items-center gap-2 text-[var(--accent)] font-mono text-xs uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            <span>Open Biodiversity Data</span>
          </div>
          <h2 id="dataset-heading" className="font-heading italic text-2xl sm:text-3xl text-[var(--fg)]">
            Open Scientific Datasets &amp; Community Credits
          </h2>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed font-body">
            Our training and reference imagery are sourced exclusively from scientific biodiversity archives, primarily <strong>iNaturalist</strong> research-grade observations mediated via the <strong>Global Biodiversity Information Facility (GBIF)</strong>. All photos are published under open Creative Commons licenses:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="liquid-glass-subtle p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="font-mono text-xs text-emerald-400 font-semibold">CC0 1.0</span>
              <p className="text-xs text-[var(--fg)] font-medium">Public Domain Dedication</p>
              <p className="text-[11px] text-[var(--fg-subtle)]">Free worldwide dedication with no restrictions.</p>
            </div>
            <div className="liquid-glass-subtle p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="font-mono text-xs text-sky-400 font-semibold">CC-BY 4.0</span>
              <p className="text-xs text-[var(--fg)] font-medium">Attribution Required</p>
              <p className="text-[11px] text-[var(--fg-subtle)]">Free usage with explicit credit to naturalist observers.</p>
            </div>
            <div className="liquid-glass-subtle p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="font-mono text-xs text-amber-400 font-semibold">CC-BY-NC 4.0</span>
              <p className="text-xs text-[var(--fg)] font-medium">Non-Commercial ShareAlike</p>
              <p className="text-[11px] text-[var(--fg-subtle)]">Open educational and academic research access.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
            <p className="text-xs text-[var(--fg-muted)]">
              Every specimen image displayed in PlantAI contains explicit naturalist attribution.
            </p>
            <a
              href="/species/credits.json"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] hover:underline"
            >
              <span>View Raw Dataset Credits JSON</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* Model Summary & Privacy */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model Summary */}
          <div className="liquid-glass rounded-3xl p-6 md:p-8 space-y-4 border border-white/10">
            <div className="flex items-center gap-2 text-teal-400 font-mono text-xs uppercase">
              <Lightbulb className="w-4 h-4" />
              <span>Model Summary</span>
            </div>
            <h3 className="font-heading italic text-xl text-[var(--fg)]">
              EfficientNet-B0 Neural Architecture
            </h3>
            <ul className="space-y-2 text-xs font-mono text-[var(--fg-muted)]">
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span>Architecture</span>
                <span className="text-[var(--fg)]">EfficientNet-B0</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span>Cataloged Species</span>
                <span className="text-[var(--fg)]">150 Classes</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span>Botanical Families</span>
                <span className="text-[var(--fg)]">50+ Families</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span>Quantization &amp; Format</span>
                <span className="text-[var(--fg)]">FP32 ONNX Web</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-1">
                <span>Test-Set Top-1</span>
                <span className="text-emerald-400 font-bold">83.88%</span>
              </li>
              <li className="flex justify-between">
                <span>Test-Set Top-5</span>
                <span className="text-emerald-400 font-bold">94.39%</span>
              </li>
            </ul>
          </div>

          {/* Privacy Guarantee */}
          <div className="liquid-glass rounded-3xl p-6 md:p-8 space-y-4 border border-white/10 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero-Data Privacy Guarantee</span>
              </div>
              <h3 className="font-heading italic text-xl text-[var(--fg)]">
                Images Stay In Your Browser
              </h3>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed font-body">
                PlantAI operates entirely client-side. When you take or upload a photo, it is loaded into your browser's private canvas memory, transformed into WebGL/WASM tensor buffers, and evaluated on your local CPU or GPU.
              </p>
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed font-body">
                We never store, log, or send your photos to remote servers. No accounts or sign-ins exist. Your identification history is temporary and stored only in your browser's session storage, clearing completely when you close the tab.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-mono">
              ✓ Compliant with strict client privacy principles.
            </div>
          </div>
        </section>

        {/* Limitations & Botanical Safety Disclaimer */}
        <section aria-label="System Limitations and Safety" className="rounded-3xl p-6 md:p-8 bg-rose-500/10 border border-rose-500/30 space-y-3">
          <div className="flex items-center gap-2 text-rose-300 font-mono text-xs uppercase">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Strict Botanical &amp; Medical Disclaimer</span>
          </div>
          <h3 className="font-heading italic text-xl text-rose-200">
            System Limitations &amp; Safety Protocol
          </h3>
          <p className="text-xs text-rose-100/90 leading-relaxed font-body">
            <strong>1. Scope:</strong> PlantAI is currently trained on 150 specific botanical species. Non-plant photos, uncataloged wild flora, or cultivars will be flagged as &quot;Not confident&quot; with Top-3 candidates below the threshold or rejected by the out-of-distribution distance filter.
          </p>
          <p className="text-xs text-rose-100/90 leading-relaxed font-body">
            <strong>2. Photo Composition &amp; Real-World Limitations:</strong> Classification accuracy depends heavily on the photo. Plants photographed out of flower, unusual angles, poor lighting, or heavily cultivated varieties can be misidentified. Always check the confidence tier and review the Top-3 candidates before drawing conclusions. Published performance metrics reflect benchmark test-set evaluations.
          </p>
          <p className="text-xs text-rose-100/90 leading-relaxed font-body">
            <strong>3. Not an Edibility or Medical Tool:</strong> NEVER ingest, prepare teas from, or apply any wild plant or berry based on automated computer vision identification. Deadly poisonous plants (such as Water Hemlock) frequently mimic harmless culinary or medicinal herbs. Always consult a certified botanist or medical professional.
          </p>
        </section>
      </div>
    </div>
  );
}
