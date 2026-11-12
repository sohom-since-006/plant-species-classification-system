import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

const defaults: IconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function ArrowUpRight(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export function Play(props: IconProps) {
  return (
    <svg {...defaults} fill="currentColor" stroke="none" {...props}>
      <polygon points="6 4 20 12 6 20" />
    </svg>
  );
}

export function Clock(props: IconProps) {
  return (
    <svg {...defaults} strokeWidth={1.5} {...props}>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function Globe(props: IconProps) {
  return (
    <svg {...defaults} strokeWidth={1.5} {...props}>
      <circle cx={12} cy={12} r={9} />
      <line x1={3} y1={12} x2={21} y2={12} />
      <path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z" />
    </svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <rect x={3} y={3} width={18} height={18} rx={2} />
      <circle cx={8.5} cy={8.5} r={1.5} />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export function Movie(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <rect x={2} y={2} width={20} height={20} rx={2.18} ry={2.18} />
      <line x1={7} y1={2} x2={7} y2={22} />
      <line x1={17} y1={2} x2={17} y2={22} />
      <line x1={2} y1={12} x2={22} y2={12} />
      <line x1={2} y1={7} x2={7} y2={7} />
      <line x1={2} y1={17} x2={7} y2={17} />
      <line x1={17} y1={7} x2={22} y2={7} />
      <line x1={17} y1={17} x2={22} y2={17} />
    </svg>
  );
}

export function Lightbulb(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

export function Leaf(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.25 3.75 1.25 3.75" />
      <path d="M12 15l-1.5-4.5" />
    </svg>
  );
}

export function Camera(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx={12} cy={13} r={4} />
    </svg>
  );
}

export function Upload(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1={12} y1={3} x2={12} y2={15} />
    </svg>
  );
}

export function Sun(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx={12} cy={12} r={5} />
      <line x1={12} y1={1} x2={12} y2={3} />
      <line x1={12} y1={21} x2={12} y2={23} />
      <line x1={4.22} y1={4.22} x2={5.64} y2={5.64} />
      <line x1={18.36} y1={18.36} x2={19.78} y2={19.78} />
      <line x1={1} y1={12} x2={3} y2={12} />
      <line x1={21} y1={12} x2={23} y2={12} />
      <line x1={4.22} y1={19.78} x2={5.64} y2={18.36} />
      <line x1={18.36} y1={5.64} x2={19.78} y2={4.22} />
    </svg>
  );
}

export function Moon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function Search(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx={11} cy={11} r={8} />
      <line x1={21} y1={21} x2={16.65} y2={16.65} />
    </svg>
  );
}

export function History(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      <polyline points="12 7 12 12 16.5 14.5" />
    </svg>
  );
}

export function BarChart(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <line x1={18} y1={20} x2={18} y2={10} />
      <line x1={12} y1={20} x2={12} y2={4} />
      <line x1={6} y1={20} x2={6} y2={14} />
    </svg>
  );
}

export function Info(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx={12} cy={12} r={10} />
      <line x1={12} y1={16} x2={12} y2={12} />
      <line x1={12} y1={8} x2={12.01} y2={8} />
    </svg>
  );
}

export function ThumbsUp(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

export function ThumbsDown(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}

export function Menu(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <line x1={3} y1={6} x2={21} y2={6} />
      <line x1={3} y1={12} x2={21} y2={12} />
      <line x1={3} y1={18} x2={21} y2={18} />
    </svg>
  );
}

export function X(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <line x1={18} y1={6} x2={6} y2={18} />
      <line x1={6} y1={6} x2={18} y2={18} />
    </svg>
  );
}

export function RefreshCw(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export function AlertCircle(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx={12} cy={12} r={10} />
      <line x1={12} y1={8} x2={12} y2={12} />
      <line x1={12} y1={16} x2={12.01} y2={16} />
    </svg>
  );
}

export function User(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx={12} cy={7} r={4} />
    </svg>
  );
}

export function Trash2(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1={10} y1={11} x2={10} y2={17} />
      <line x1={14} y1={11} x2={14} y2={17} />
    </svg>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1={12} y1={9} x2={12} y2={13} />
      <line x1={12} y1={17} x2={12.01} y2={17} />
    </svg>
  );
}

export function ExternalLink(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1={10} y1={14} x2={21} y2={3} />
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function CheckCircle(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function ShieldCheck(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export function Lock(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function Cpu(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

export function HardDrive(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      <line x1="6" y1="16" x2="6.01" y2="16" />
      <line x1="10" y1="16" x2="10.01" y2="16" />
    </svg>
  );
}

export function Sparkles(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  );
}

export function Activity(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}


