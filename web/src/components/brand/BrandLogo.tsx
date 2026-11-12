import type { SVGProps } from 'react';

export interface BrandLogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * BrandLogo — The official emblem for the Plant Species Classification System.
 * Combines an organic botanical sprout, leaf venation, and neural aperture
 * into an iconic, bioluminescent 'P' monogram.
 */
export function BrandLogo({
  size = 32,
  showText = false,
  className = '',
  ...props
}: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Plant AI Brand Logo"
        {...props}
      >
        <defs>
          {/* Main Leaf Gradient (Mint to Deep Emerald) */}
          <linearGradient
            id="brandGradPrimary"
            x1="6"
            y1="34"
            x2="34"
            y2="6"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#059669" />
            <stop offset="45%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#6EE7A8" />
          </linearGradient>

          {/* Luminous Inner Vein Gradient */}
          <linearGradient
            id="brandGradInner"
            x1="12"
            y1="24"
            x2="28"
            y2="10"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#6EE7A8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#D1FAE5" stopOpacity="1" />
          </linearGradient>

          {/* Golden Pollen Spore Gradient */}
          <linearGradient
            id="brandGradPollen"
            x1="22"
            y1="13"
            x2="26"
            y2="17"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Bioluminescent Glow */}
          <filter id="logoGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Halo / Vision Aperture Orbit */}
        <circle
          cx="20"
          cy="20"
          r="18"
          stroke="url(#brandGradPrimary)"
          strokeWidth="1"
          strokeDasharray="2 4"
          strokeOpacity="0.3"
        />

        {/* Botanical Stem & Leaf Loop (Stylized 'P') */}
        {/* Main curved stem rising into outer leaf apex */}
        <path
          d="M 14 34 L 14 13 C 14 8.5 18 6 23 6 C 29.5 6 33.5 10.5 33.5 16.5 C 33.5 22.5 29.5 25.5 22.5 25.5 L 14 25.5"
          stroke="url(#brandGradPrimary)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Internal Living Vein / Neural Synapse */}
        <path
          d="M 14 24 C 18 23 21 21 24 16.5 C 26 13.5 26 9.5 23 8"
          stroke="url(#brandGradInner)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="0.5 0"
        />

        {/* Lower organic leaflet offset */}
        <path
          d="M 14 29 C 17.5 29 20 31 21 33"
          stroke="url(#brandGradPrimary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />

        {/* Neural Seed / Spore Nodes */}
        {/* Primary Radiant Spore */}
        <circle
          cx="24"
          cy="16.5"
          r="2.2"
          fill="url(#brandGradPollen)"
          filter="url(#logoGlow)"
        />
        <circle cx="24" cy="16.5" r="1" fill="#FFFFFF" />

        {/* Terminal apex glow */}
        <circle
          cx="23"
          cy="6"
          r="1.4"
          fill="#6EE7A8"
          filter="url(#logoGlow)"
        />

        {/* Root Node */}
        <circle cx="14" cy="34" r="1.6" fill="#10B981" />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="font-heading italic text-xl font-normal tracking-tight text-[var(--fg)] leading-none">
            Phyto<span className="text-[var(--accent)] font-semibold not-italic">Lens</span>
          </span>
          <span className="font-mono text-[9px] tracking-widest uppercase text-[var(--fg-subtle)] mt-0.5">
            Botanical Intelligence
          </span>
        </div>
      )}
    </div>
  );
}

