import { useState } from 'react';
import { PageHero } from '@/components/layout/PageHero';
import { SolidButton } from '@/components/ui/SolidButton';
import { Play, BarChart, Cpu, HardDrive } from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { UserHistoryStats } from '@/features/dashboard/UserHistoryStats';
import { ModelInsightsSection } from '@/features/dashboard/ModelInsightsSection';

export function Dashboard() {
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [localBenchmarkResult, setLocalBenchmarkResult] = useState<number | null>(null);

  const runLocalBenchmark = () => {
    setBenchmarkRunning(true);
    const start = performance.now();
    setTimeout(() => {
      let sum = 0;
      for (let i = 0; i < 2_000_000; i++) {
        sum += Math.sin(i) * Math.cos(i);
      }
      const duration = Math.round(performance.now() - start);
      setLocalBenchmarkResult(duration);
      setBenchmarkRunning(false);
      if (sum === 42) console.log(sum);
    }, 300);
  };

  const hardwareConcurrency =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const webGpuSupported =
    typeof navigator !== 'undefined' && 'gpu' in navigator;

  return (
    <div className="relative w-full pb-24 text-[var(--fg)]">
      {/* Synchronized Hero with scroll blur + fade */}
      <PageHero
        badge="BOTANICAL TELEMETRY & DIAGNOSTICS"
        title="Field & Model Dashboard"
        italicSubtitle="Personal Insights & Neural Metrics"
        description="Comprehensive real-time telemetry from your botanical specimen field verifications paired with empirical test-set diagnostics for our edge neural network."
      />

      <div className="max-w-6xl mx-auto px-6 md:px-12 space-y-16">
        {/* Section 1: Protected Personal History Stats */}
        <section aria-label="Personal Field Telemetry">
          <UserHistoryStats />
        </section>

        {/* Section 2: Public Model Insights (Empirical Test-Set Metrics) */}
        <section aria-label="Model Insights">
          <ModelInsightsSection />
        </section>

        {/* Section 3: Client Device Acceleration Diagnostics */}
        <section aria-label="Hardware Diagnostics" className="liquid-glass rounded-3xl p-6 md:p-8 space-y-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading italic text-xl md:text-2xl text-[var(--fg)]">
                Client Device Acceleration Diagnostics
              </h3>
              <p className="text-xs text-[var(--fg-muted)] mt-1">
                All neural inference executes client-side via ONNX Runtime Web using SIMD WebAssembly and WebGPU/WebGL shaders.
              </p>
            </div>
            <SolidButton
              onClick={runLocalBenchmark}
              disabled={benchmarkRunning}
              className="text-xs px-4 py-2 shrink-0 self-start sm:self-auto"
            >
              <Play className="w-3.5 h-3.5" />
              {benchmarkRunning ? 'Benchmarking...' : 'Test Device Latency'}
            </SolidButton>
          </div>

          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <StaggerItem>
              <div className="liquid-glass p-4 rounded-xl flex items-center gap-3 border border-white/5" data-glow="">
                <BarChart className="w-6 h-6 text-[var(--accent)] shrink-0" />
                <div>
                  <p className="text-[11px] font-mono uppercase text-[var(--fg-subtle)]">CPU Thread Pool</p>
                  <p className="font-mono text-sm text-[var(--fg)] font-medium">
                    {hardwareConcurrency} Logical Cores
                  </p>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="liquid-glass p-4 rounded-xl flex items-center gap-3 border border-white/5" data-glow="">
                <Cpu className="w-6 h-6 text-teal-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-mono uppercase text-[var(--fg-subtle)]">WebGPU Acceleration</p>
                  <p className="font-mono text-sm text-[var(--fg)] font-medium">
                    {webGpuSupported ? 'Hardware Active' : 'Fallback (WebGL/WASM)'}
                  </p>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="liquid-glass p-4 rounded-xl flex items-center gap-3 border border-white/5" data-glow="">
                <HardDrive className="w-6 h-6 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-mono uppercase text-[var(--fg-subtle)]">SIMD Float Vectorization</p>
                  <p className="font-mono text-sm text-[var(--fg)] font-medium">
                    {localBenchmarkResult ? `${localBenchmarkResult} ms throughput` : 'Ready for profiling'}
                  </p>
                </div>
              </div>
            </StaggerItem>
          </Stagger>
        </section>
      </div>
    </div>
  );
}
