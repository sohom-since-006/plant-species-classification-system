import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

import { FadingVideo } from '@/components/motion/FadingVideo';
import { BlurText } from '@/components/motion/BlurText';
import { Reveal } from '@/components/motion/Reveal';
import { ScrollBlur } from '@/components/motion/ScrollBlur';
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

  // Parallax refs for video atmosphere
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroVideoY = useTransform(heroScroll, [0, 1], ['0%', '25%']);

  const capRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: capScroll } = useScroll({
    target: capRef,
    offset: ['start end', 'end start'],
  });
  const capVideoY = useTransform(capScroll, [0, 1], ['-10%', '10%']);

  const howRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: howScroll } = useScroll({
    target: howRef,
    offset: ['start end', 'end start'],
  });
  const howVideoY = useTransform(howScroll, [0, 1], ['-10%', '10%']);

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
        {/* Background video at 120% scale with parallax drift & adjusted center-weighted crop */}
        <motion.div
          className="absolute left-1/2 top-0 -translate-x-1/2 w-[120%] h-[120%] pointer-events-none"
          style={{ y: prefersReducedMotion ? '0%' : heroVideoY }}
        >
          <FadingVideo
            src={MEDIA.hero}
            className="w-full h-full object-cover object-[68%_top]"
          />
        </motion.div>

        {/* Deep forest-green tinted overlay — no pure black anywhere in the hero */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(var(--overlay-tint-rgb), 0.45) 0%, rgba(var(--overlay-tint-rgb), 0.22) 50%, rgba(var(--overlay-tint-rgb), 0.52) 100%)',
          }}
        />

        {/* Soft emerald/teal radial glow on left side behind text area (15-20% opacity, slow drift) */}
        <div
          className="absolute top-[18%] left-[-8%] md:left-[2%] w-[580px] h-[580px] rounded-full pointer-events-none blur-[120px] will-change-transform"
          style={{
            background: 'radial-gradient(circle, #10B981 0%, #14B8A6 45%, transparent 70%)',
            animation: prefersReducedMotion ? 'none' : 'hero-glow-drift 24s ease-in-out infinite alternate',
            opacity: prefersReducedMotion ? 0.18 : undefined,
          }}
          aria-hidden="true"
        />

        {/* Hero Content Container — calibrated so it stays sharp for the first 28% of scroll, then blurs out */}
        <ScrollBlur
          isHero
          className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center text-center pt-16 md:pt-12 drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]"
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

          {/* Headline, Tagline & Subtitle with soft radial dark-green text scrim */}
          <div className="relative max-w-5xl mx-auto">
            {/* Soft text scrim: blurred radial dark-green gradient for guaranteed >= 4.5:1 contrast */}
            <div
              className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-full blur-3xl pointer-events-none opacity-85"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(var(--overlay-tint-rgb), 0.80) 0%, rgba(var(--overlay-tint-rgb), 0.50) 65%, transparent 85%)',
              }}
              aria-hidden="true"
            />

            {/* Headline (BlurText, max-w-5xl, 2 lines desktop) */}
            <BlurText
              text="Plant Species Classification System"
              className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic leading-[0.85] tracking-[-3px] md:tracking-[-4px] text-white"
            />

            {/* Tagline directly under it */}
            <Reveal delay={0.3} className="mt-4">
              <p className="font-heading italic text-2xl md:text-3xl text-emerald-300">
                Know Every Plant You Meet
              </p>
            </Reveal>

            {/* Subtitle (delay 0.8) */}
            <Reveal delay={0.8} className="mt-5 max-w-2xl mx-auto">
              <p className="text-sm md:text-base font-body font-light text-white/90 leading-relaxed">
                Upload a photo of a leaf, flower, or whole plant. Get the species, an honest
                confidence score, look-alike matches, and everything worth knowing, with no sign-up
                and no photo ever leaving your device.
              </p>
            </Reveal>
          </div>

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
            <ScrollBlur isHero className="flex flex-wrap justify-center gap-4 w-full">
              <Reveal delay={1.3} className="w-full sm:w-[220px]">
                <div className="liquid-glass p-5 w-full rounded-[1.25rem] text-left border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-white/70 mb-1">
                    <Clock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-[11px] font-body font-semibold uppercase tracking-wider text-white/60">
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
              </Reveal>

              <Reveal delay={1.3} className="w-full sm:w-[220px]">
                <div className="liquid-glass p-5 w-full rounded-[1.25rem] text-left border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-white/70 mb-1">
                    <Globe className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span className="text-[11px] font-body font-semibold uppercase tracking-wider text-white/60">
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
            </ScrollBlur>

            {/* Trust Bar (delay 1.4) */}
            <ScrollBlur isHero className="w-full">
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
            </ScrollBlur>
          </div>
        </ScrollBlur>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. CAPABILITIES SECTION (min-h-screen, parallax video)
      ───────────────────────────────────────────────────────────── */}
      <section
        ref={capRef}
        className="relative min-h-screen w-full py-28 px-6 md:px-12 lg:px-16 flex flex-col justify-center overflow-hidden"
      >
        {/* Background video with subtle 0.2x parallax and soft depth-of-field blur */}
        <motion.div
          className="absolute inset-0 w-full h-[120%] pointer-events-none -top-[10%]"
          style={{ y: prefersReducedMotion ? '0%' : capVideoY }}
        >
          <FadingVideo
            src={MEDIA.capabilities}
            className="w-full h-full object-cover scale-[1.04] filter blur-[5px]"
          />
        </motion.div>

        {/* Contrast overlay — deep forest-green tint (no pure black) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(var(--overlay-tint-rgb), 0.72) 0%, rgba(var(--overlay-tint-rgb), 0.48) 50%, rgba(var(--overlay-tint-rgb), 0.80) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          {/* Section Heading Block */}
          <ScrollBlur className="mb-14">
            <Reveal>
              <div className="text-xs font-body font-semibold uppercase tracking-widest text-emerald-400 mb-2">
                // Capabilities
              </div>
              <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-[6rem] font-heading italic leading-[0.9] tracking-[-3px] text-white whitespace-pre-line">
                Plant science,{"\n"}made effortless
              </h2>
            </Reveal>
          </ScrollBlur>

          {/* 3 Capability Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Identify */}
            <ScrollBlur className="h-full">
              <Reveal delay={0.1} className="h-full">
                <div className="liquid-glass rounded-[1.25rem] p-7 min-h-[360px] h-full flex flex-col justify-between border border-white/10 backdrop-blur-lg hover:border-emerald-500/30 transition-all group">
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
            </ScrollBlur>

            {/* Card 2: Explain */}
            <ScrollBlur className="h-full">
              <Reveal delay={0.25} className="h-full">
                <div className="liquid-glass rounded-[1.25rem] p-7 min-h-[360px] h-full flex flex-col justify-between border border-white/10 backdrop-blur-lg hover:border-emerald-500/30 transition-all group">
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
            </ScrollBlur>

            {/* Card 3: Explore */}
            <ScrollBlur className="h-full">
              <Reveal delay={0.4} className="h-full">
                <div className="liquid-glass rounded-[1.25rem] p-7 min-h-[360px] h-full flex flex-col justify-between border border-white/10 backdrop-blur-lg hover:border-emerald-500/30 transition-all group">
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
            </ScrollBlur>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. HOW IT WORKS (min-h-screen, sticky stacking parallax)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        ref={howRef}
        className="relative min-h-screen w-full pt-8 pb-20 px-6 md:px-12 lg:px-16 overflow-hidden"
      >
        {/* Background How-It-Works video atmosphere (boomerang seamless loop with soft blur) */}
        <motion.div
          className="absolute inset-0 w-full h-[120%] pointer-events-none -top-[10%]"
          style={{ y: prefersReducedMotion ? '0%' : howVideoY }}
        >
          <FadingVideo
            src={MEDIA.howItWorks}
            className="w-full h-full object-cover scale-[1.04] filter blur-[5px]"
          />
        </motion.div>

        {/* Contrast overlay — deep forest-green tint (no pure black) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(var(--overlay-tint-rgb), 0.76) 0%, rgba(var(--overlay-tint-rgb), 0.54) 50%, rgba(var(--overlay-tint-rgb), 0.84) 100%)',
          }}
        />

        {/* Floating leaf silhouettes drifting at 0.2x, 0.5x, 0.8x depths at lowered opacity */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Depth 1: 0.2x */}
          <div className="absolute top-[15%] left-[5%] text-emerald-500/5 w-32 h-32 transform -rotate-12">
            <Leaf className="w-full h-full" aria-hidden="true" />
          </div>
          {/* Depth 2: 0.5x */}
          <div className="absolute top-[45%] right-[8%] text-emerald-400/8 w-48 h-48 transform rotate-45">
            <Leaf className="w-full h-full" aria-hidden="true" />
          </div>
          {/* Depth 3: 0.8x */}
          <div className="absolute bottom-[10%] left-[12%] text-emerald-300/5 w-40 h-40 transform -rotate-45">
            <Leaf className="w-full h-full" aria-hidden="true" />
          </div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Section Heading */}
          <ScrollBlur className="text-center mb-6">
            <Reveal>
              <div className="text-xs font-body font-semibold uppercase tracking-widest text-emerald-400 mb-1.5">
                // Workflow
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading italic tracking-[-2px] text-white">
                Three steps from leaf to insight
              </h2>
            </Reveal>
          </ScrollBlur>

          {/* Sticky Stacking Cards */}
          <div className="space-y-6">
            {/* Step 1: Upload */}
            <ScrollBlur
              className="sticky top-14 md:top-16 liquid-glass-strong rounded-[2rem] p-6 md:p-8 border border-white/15 backdrop-blur-2xl shadow-2xl"
              yOffset={16}
            >
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
            </ScrollBlur>

            {/* Step 2: Analyze */}
            <ScrollBlur
              className="sticky top-18 md:top-20 liquid-glass-strong rounded-[2rem] p-6 md:p-8 border border-white/15 backdrop-blur-2xl shadow-2xl"
              yOffset={16}
            >
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
            </ScrollBlur>

            {/* Step 3: Understand */}
            <ScrollBlur
              className="sticky top-22 md:top-24 liquid-glass-strong rounded-[2rem] p-6 md:p-8 border border-white/15 backdrop-blur-2xl shadow-2xl"
              yOffset={16}
            >
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
            </ScrollBlur>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. TRY IT (CTA) SECTION (drag & drop mini zone)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 md:px-12 lg:px-16 flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Background CTA video atmosphere with soft blur */}
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
          <FadingVideo
            src={MEDIA.cta}
            className="w-full h-full object-cover scale-[1.04] filter blur-[5px]"
          />
        </div>

        {/* Contrast overlay — deep forest-green tint (no pure black) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(var(--overlay-tint-rgb), 0.70) 0%, rgba(var(--overlay-tint-rgb), 0.48) 50%, rgba(var(--overlay-tint-rgb), 0.80) 100%)',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
          <ScrollBlur className="text-center">
            <Reveal>
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-heading italic text-white tracking-[-2px]">
                Ready to meet your plants?
              </h2>
              <p className="mt-4 text-base md:text-lg font-light text-white/80 max-w-xl mx-auto">
                Identify species instantly in your browser with private, on-device machine learning.
              </p>
            </Reveal>
          </ScrollBlur>

          <ScrollBlur className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Reveal delay={0.2}>
              <Link to="/classify">
                <SolidButton className="px-8 py-3.5 text-base rounded-full shadow-xl hover:scale-105 transition-transform">
                  Start Identifying <ArrowUpRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </SolidButton>
              </Link>
            </Reveal>
          </ScrollBlur>

          {/* Drag-and-drop mini zone */}
          <ScrollBlur className="mt-10 w-full max-w-lg">
            <Reveal delay={0.35}>
              <div className="liquid-glass rounded-2xl p-2 border border-white/15 shadow-2xl">
                <UploadZone
                  onFileSelect={handleMiniUpload}
                  className="py-10 border-white/20 hover:border-emerald-400"
                />
              </div>
            </Reveal>
          </ScrollBlur>
        </div>
      </section>
    </div>
  );
}
