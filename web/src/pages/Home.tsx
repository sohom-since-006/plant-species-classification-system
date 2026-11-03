import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

import { FadingVideo } from '@/components/motion/FadingVideo';
import { BlurText } from '@/components/motion/BlurText';
import { Reveal } from '@/components/motion/Reveal';
import { SolidButton } from '@/components/ui/SolidButton';
import { UploadZone } from '@/components/ui/UploadZone';
import { ConfidenceRing } from '@/components/ui/ConfidenceRing';
import { MatchBar } from '@/components/ui/MatchBar';
import { MEDIA } from '@/config/media';
import {
  ArrowUpRight,
  Play,
  Clock,
  Globe,
  ImageIcon,
  Lightbulb,
  Leaf,
} from '@/components/icons';

export function Home() {
  const navigate = useNavigate();
  const [speciesCount, setSpeciesCount] = useState('120+');
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Attempt to read real species count from model_meta.json
  useEffect(() => {
    fetch('/models/model_meta.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.num_classes === 'number') {
          setSpeciesCount(`${data.num_classes}+`);
        }
      })
      .catch(() => {
        // Fallback already set to 120+
      });
  }, []);

  // Parallax refs
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroVideoY = useTransform(heroScroll, [0, 1], ['0%', '25%']);
  const heroOpacity = useTransform(heroScroll, [0, 0.75], [1, 0]);
  const heroY = useTransform(heroScroll, [0, 0.75], [0, -50]);
  const heroFilter = useTransform(heroScroll, [0, 0.75], ['blur(0px)', 'blur(8px)']);

  const capRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: capScroll } = useScroll({
    target: capRef,
    offset: ['start end', 'end start'],
  });
  const capVideoY = useTransform(capScroll, [0, 1], ['-10%', '10%']);

  const handleMiniUpload = (file: File) => {
    navigate('/classify', { state: { initialFile: file } });
  };

  return (
    <div className="relative w-full overflow-hidden text-[var(--fg)]">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION (h-screen, full-bleed, parallax)
      ───────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative h-screen min-h-[700px] w-full flex items-center justify-center overflow-hidden"
      >
        {/* Background video at 120% scale with 0.3x parallax drift */}
        <motion.div
          className="absolute left-1/2 top-0 -translate-x-1/2 w-[120%] h-[120%] pointer-events-none"
          style={{ y: prefersReducedMotion ? '0%' : heroVideoY }}
        >
          <FadingVideo
            src={MEDIA.hero}
            className="w-full h-full object-cover object-top"
          />
        </motion.div>

        {/* Contrast overlay — tuned to keep video lively & visible while protecting text */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/70 pointer-events-none" />

        {/* Hero Content Container */}
        <motion.div
          className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center text-center pt-16 md:pt-12 drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]"
          style={{
            opacity: prefersReducedMotion ? 1 : heroOpacity,
            y: prefersReducedMotion ? 0 : heroY,
            filter: prefersReducedMotion ? 'none' : heroFilter,
          }}
        >
          {/* Badge (delay 0.4) */}
          <Reveal delay={0.4} className="mb-6">
            <div className="liquid-glass rounded-full px-4 py-1.5 inline-flex items-center gap-2.5 text-xs text-white/90 shadow-lg border border-white/10">
              <span className="px-2 py-0.5 rounded-full bg-white text-black font-semibold text-[10px] tracking-wider uppercase">
                New
              </span>
              <span>120+ species identified instantly, right in your browser</span>
            </div>
          </Reveal>

          {/* Headline (BlurText, max-w-5xl, 2 lines desktop) */}
          <div className="max-w-5xl mx-auto">
            <BlurText
              text="Plant Species Classification System"
              className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic leading-[0.85] tracking-[-3px] md:tracking-[-4px] text-white"
            />
          </div>

          {/* Tagline directly under it */}
          <Reveal delay={0.3} className="mt-4">
            <p className="font-heading italic text-2xl md:text-3xl text-emerald-300">
              Know Every Plant You Meet
            </p>
          </Reveal>

          {/* Subtitle (delay 0.8) */}
          <Reveal delay={0.8} className="mt-5 max-w-2xl">
            <p className="text-sm md:text-base font-body font-light text-white/80 leading-relaxed">
              Upload a photo of a leaf, flower, or whole plant. Get the species, an honest
              confidence score, look-alike matches, and everything worth knowing, with no sign-up
              and no photo ever leaving your device.
            </p>
          </Reveal>

          {/* CTAs (delay 1.1) */}
          <Reveal delay={1.1} className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/classify">
              <SolidButton className="px-6 py-3 text-sm rounded-full shadow-lg hover:scale-105 transition-transform">
                Start Identifying <ArrowUpRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
              </SolidButton>
            </Link>
            <a
              href="#how-it-works"
              className="liquid-glass rounded-full px-5 py-3 text-sm font-medium text-white/90 flex items-center gap-2 hover:bg-white/10 transition-colors border border-white/10"
            >
              <Play className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>See How It Works</span>
            </a>
          </Reveal>

          {/* Stat Cards & Trust Bar (delay 1.3 - 1.4) */}
          <div className="mt-12 flex flex-col items-center gap-6 w-full max-w-3xl">
            {/* Two Stat Cards */}
            <Reveal delay={1.3} className="flex flex-wrap justify-center gap-4 w-full">
              <div className="liquid-glass p-5 w-full sm:w-[220px] rounded-[1.25rem] text-left border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2 text-white/70 mb-1">
                  <Clock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/60">
                    Speed
                  </span>
                </div>
                <div className="text-4xl font-heading italic tracking-[-1px] text-white">
                  &lt; 2 s
                </div>
                <div className="text-xs text-white/70 font-light mt-1">
                  Average time to identify a plant
                </div>
              </div>

              <div className="liquid-glass p-5 w-full sm:w-[220px] rounded-[1.25rem] text-left border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2 text-white/70 mb-1">
                  <Globe className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/60">
                    Catalog
                  </span>
                </div>
                <div className="text-4xl font-heading italic tracking-[-1px] text-white">
                  {speciesCount}
                </div>
                <div className="text-xs text-white/70 font-light mt-1">
                  Species, from Indian herbs to global garden favorites
                </div>
              </div>
            </Reveal>

            {/* Trust Bar (delay 1.4) */}
            <Reveal delay={1.4} className="w-full">
              <div className="liquid-glass rounded-full px-6 py-3 flex flex-wrap items-center justify-center gap-3 md:gap-5 border border-white/10 text-center">
                <span className="text-xs text-white/70 font-light">
                  Built on open biodiversity data and open tools
                </span>
                <span className="hidden sm:inline text-white/30">&middot;</span>
                <div className="flex items-center gap-3 md:gap-4 font-heading italic text-xl md:text-2xl text-white/90">
                  <span>GBIF</span>
                  <span className="text-white/30 text-base">&middot;</span>
                  <span>iNaturalist</span>
                  <span className="text-white/30 text-base">&middot;</span>
                  <span>PyTorch</span>
                  <span className="text-white/30 text-base">&middot;</span>
                  <span>ONNX</span>
                  <span className="text-white/30 text-base">&middot;</span>
                  <span>Supabase</span>
                </div>
              </div>
            </Reveal>
          </div>
        </motion.div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. CAPABILITIES SECTION (min-h-screen, parallax video)
      ───────────────────────────────────────────────────────────── */}
      <section
        ref={capRef}
        className="relative min-h-screen w-full py-28 px-6 md:px-12 lg:px-16 flex flex-col justify-center overflow-hidden"
      >
        {/* Background video with subtle 0.2x parallax */}
        <motion.div
          className="absolute inset-0 w-full h-[120%] pointer-events-none -top-[10%]"
          style={{ y: prefersReducedMotion ? '0%' : capVideoY }}
        >
          <FadingVideo
            src={MEDIA.capabilities}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Contrast overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/75 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <Reveal>
            <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
              // Capabilities
            </div>
            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-[6rem] font-heading italic leading-[0.9] tracking-[-3px] text-white whitespace-pre-line">
              Plant science,{"\n"}made effortless
            </h2>
          </Reveal>

          {/* 3 Capability Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            {/* Card 1: Identify */}
            <Reveal delay={0.1}>
              <div className="liquid-glass rounded-[1.25rem] p-7 min-h-[360px] flex flex-col justify-between border border-white/10 backdrop-blur-lg hover:border-emerald-500/30 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="liquid-glass h-11 w-11 rounded-[0.75rem] flex items-center justify-center text-emerald-400 border border-white/10 group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5 max-w-[180px]">
                    {['Leaf', 'Flower', 'Fruit', 'Whole Plant'].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] font-light rounded-full bg-white/5 border border-white/10 text-white/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-12">
                  <h3 className="font-heading italic text-3xl md:text-4xl tracking-[-1px] text-white">
                    Identify
                  </h3>
                  <p className="mt-2 text-sm font-light leading-snug max-w-[32ch] text-white/75">
                    Snap or upload any part of a plant. Our model recognizes species across Indian
                    and global flora in seconds.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Card 2: Explain */}
            <Reveal delay={0.25}>
              <div className="liquid-glass rounded-[1.25rem] p-7 min-h-[360px] flex flex-col justify-between border border-white/10 backdrop-blur-lg hover:border-emerald-500/30 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="liquid-glass h-11 w-11 rounded-[0.75rem] flex items-center justify-center text-emerald-400 border border-white/10 group-hover:scale-105 transition-transform">
                    <Lightbulb className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5 max-w-[180px]">
                    {['Confidence', 'Heatmap', 'Look-alikes', 'Match %'].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] font-light rounded-full bg-white/5 border border-white/10 text-white/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-12">
                  <h3 className="font-heading italic text-3xl md:text-4xl tracking-[-1px] text-white">
                    Explain
                  </h3>
                  <p className="mt-2 text-sm font-light leading-snug max-w-[32ch] text-white/75">
                    See why the model decided: calibrated confidence, an attention heatmap, and the
                    species it is most often confused with.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Card 3: Explore */}
            <Reveal delay={0.4}>
              <div className="liquid-glass rounded-[1.25rem] p-7 min-h-[360px] flex flex-col justify-between border border-white/10 backdrop-blur-lg hover:border-emerald-500/30 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="liquid-glass h-11 w-11 rounded-[0.75rem] flex items-center justify-center text-emerald-400 border border-white/10 group-hover:scale-105 transition-transform">
                    <Leaf className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5 max-w-[180px]">
                    {['Uses', 'Habitat', 'Care', 'Names'].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] font-light rounded-full bg-white/5 border border-white/10 text-white/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-12">
                  <h3 className="font-heading italic text-3xl md:text-4xl tracking-[-1px] text-white">
                    Explore
                  </h3>
                  <p className="mt-2 text-sm font-light leading-snug max-w-[32ch] text-white/75">
                    Every species comes with names in English, Hindi and Bengali, identifying
                    features, uses, habitat and care tips.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. HOW IT WORKS (min-h-screen, sticky stacking parallax)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="relative min-h-screen w-full py-28 px-6 md:px-12 lg:px-16 overflow-hidden"
      >
        {/* Floating leaf silhouettes drifting at 0.2x, 0.5x, 0.8x depths */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Depth 1: 0.2x */}
          <div className="absolute top-[15%] left-[5%] text-emerald-500/10 w-32 h-32 transform -rotate-12">
            <Leaf className="w-full h-full" aria-hidden="true" />
          </div>
          {/* Depth 2: 0.5x */}
          <div className="absolute top-[45%] right-[8%] text-emerald-400/15 w-48 h-48 transform rotate-45">
            <Leaf className="w-full h-full" aria-hidden="true" />
          </div>
          {/* Depth 3: 0.8x */}
          <div className="absolute bottom-[10%] left-[12%] text-emerald-300/10 w-40 h-40 transform -rotate-45">
            <Leaf className="w-full h-full" aria-hidden="true" />
          </div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Section Heading */}
          <div className="text-center mb-16">
            <Reveal>
              <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
                // Workflow
              </div>
              <h2 className="text-5xl sm:text-6xl font-heading italic tracking-[-2px] text-white">
                Three steps from leaf to insight
              </h2>
            </Reveal>
          </div>

          {/* Sticky Stacking Cards */}
          <div className="space-y-12">
            {/* Step 1: Upload */}
            <div className="sticky top-28 liquid-glass-strong rounded-[2rem] p-8 md:p-12 border border-white/15 backdrop-blur-2xl shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="max-w-md">
                  <div className="text-5xl md:text-6xl font-heading italic text-emerald-400/80 mb-2">
                    01
                  </div>
                  <h3 className="font-heading italic text-3xl md:text-4xl text-white mb-3">
                    Upload
                  </h3>
                  <p className="text-base font-light text-white/80 leading-relaxed">
                    Drop a photo or use your camera. We support close-ups of leaves, flowers, bark,
                    or entire garden specimens.
                  </p>
                </div>
                <div className="liquid-glass rounded-xl p-6 border border-white/10 md:w-80 flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <ImageIcon className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <div className="text-xs font-medium text-white/90">Single leaf, flower or tree</div>
                  <div className="text-[11px] text-white/60">Processed locally in browser memory</div>
                </div>
              </div>
            </div>

            {/* Step 2: Analyze */}
            <div className="sticky top-32 liquid-glass-strong rounded-[2rem] p-8 md:p-12 border border-white/15 backdrop-blur-2xl shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="max-w-md">
                  <div className="text-5xl md:text-6xl font-heading italic text-emerald-400/80 mb-2">
                    02
                  </div>
                  <h3 className="font-heading italic text-3xl md:text-4xl text-white mb-3">
                    Analyze
                  </h3>
                  <p className="text-base font-light text-white/80 leading-relaxed">
                    A compact neural network runs entirely on your device using WebGL acceleration.
                    Zero cloud latency and complete visual privacy.
                  </p>
                </div>
                <div className="liquid-glass rounded-xl p-6 border border-white/10 md:w-80 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-white/80">
                    <span className="font-mono text-emerald-400">ONNX WebGL</span>
                    <span className="text-[10px] text-emerald-300 font-medium">Hardware Accel</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-4/5 animate-pulse" />
                  </div>
                  <div className="text-[11px] text-white/60 mt-1">
                    Preprocess &rarr; Tensor Inference &rarr; Calibration
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Understand */}
            <div className="sticky top-36 liquid-glass-strong rounded-[2rem] p-8 md:p-12 border border-white/15 backdrop-blur-2xl shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="max-w-md">
                  <div className="text-5xl md:text-6xl font-heading italic text-emerald-400/80 mb-2">
                    03
                  </div>
                  <h3 className="font-heading italic text-3xl md:text-4xl text-white mb-3">
                    Understand
                  </h3>
                  <p className="text-base font-light text-white/80 leading-relaxed">
                    Get the species, confidence, look-alikes and care notes. Inspect attention
                    heatmaps to see which leaf vein or petal led to the prediction.
                  </p>
                </div>

                {/* Looping mini-demo mockup of the result card */}
                <div className="liquid-glass rounded-2xl p-5 border border-white/15 md:w-80 flex flex-col gap-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-emerald-400 uppercase">Top Prediction</div>
                      <div className="font-heading italic text-xl text-white leading-tight">
                        Tulsi (Holy Basil)
                      </div>
                      <div className="text-[11px] text-white/60 italic">Ocimum tenuiflorum</div>
                    </div>
                    <ConfidenceRing value={0.96} tier="high" size={54} strokeWidth={4} />
                  </div>
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <div className="text-[10px] text-white/60 font-mono uppercase">Top Candidates</div>
                    <MatchBar label="Ocimum tenuiflorum" value={0.96} />
                    <MatchBar label="Ocimum basilicum" value={0.03} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. TRY IT (CTA) SECTION (drag & drop mini zone)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 md:px-12 lg:px-16 flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Background CTA video atmosphere */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <FadingVideo
            src={MEDIA.cta}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Contrast overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/40 to-black/75 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
          <Reveal>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-heading italic text-white tracking-[-2px]">
              Ready to meet your plants?
            </h2>
            <p className="mt-4 text-base md:text-lg font-light text-white/80 max-w-xl mx-auto">
              Identify species instantly in your browser with private, on-device machine learning.
            </p>
          </Reveal>

          <Reveal delay={0.2} className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/classify">
              <SolidButton className="px-8 py-3.5 text-base rounded-full shadow-xl hover:scale-105 transition-transform">
                Start Identifying <ArrowUpRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </SolidButton>
            </Link>
          </Reveal>

          {/* Drag-and-drop mini zone */}
          <Reveal delay={0.35} className="mt-10 w-full max-w-lg">
            <div className="liquid-glass rounded-2xl p-2 border border-white/15 shadow-2xl">
              <UploadZone
                onFileSelect={handleMiniUpload}
                className="py-10 border-white/20 hover:border-emerald-400"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
