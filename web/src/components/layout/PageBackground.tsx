export type PageBackgroundProps = {
  className?: string;
};

/**
 * Animated aurora gradient background for app pages.
 * Slowly drifting green/teal/emerald glows using CSS keyframe animations.
 * Respects prefers-reduced-motion by showing a static gradient.
 */
export function PageBackground({ className = '' }: PageBackgroundProps) {
  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Base dark/light canvas */}
      <div className="absolute inset-0 bg-[var(--bg)]" />

      {/* Aurora blob 1 */}
      <div
        className="aurora-blob absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #6EE7A8 0%, transparent 70%)',
          top: '-10%',
          left: '20%',
          animation: 'aurora-drift-1 25s ease-in-out infinite alternate',
        }}
      />
      {/* Aurora blob 2 */}
      <div
        className="aurora-blob absolute w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[100px]"
        style={{
          background: 'radial-gradient(circle, #2DD4BF 0%, transparent 70%)',
          bottom: '10%',
          right: '15%',
          animation: 'aurora-drift-2 30s ease-in-out infinite alternate',
        }}
      />
      {/* Aurora blob 3 */}
      <div
        className="aurora-blob absolute w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[80px]"
        style={{
          background: 'radial-gradient(circle, #34D399 0%, transparent 70%)',
          top: '40%',
          left: '50%',
          animation: 'aurora-drift-3 35s ease-in-out infinite alternate',
        }}
      />

      {/* CSS keyframe animations are defined in index.css */}
    </div>
  );
}

