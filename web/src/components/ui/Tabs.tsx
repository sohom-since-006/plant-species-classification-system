import { useState, type ReactNode } from 'react';

export type TabItem = {
  label: string;
  content: ReactNode;
};

export type TabsProps = {
  tabs: TabItem[];
  defaultIndex?: number;
  className?: string;
};

export function Tabs({ tabs, defaultIndex = 0, className = '' }: TabsProps) {
  const [activeIdx, setActiveIdx] = useState(defaultIndex);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div
        className="liquid-glass rounded-full p-1.5 inline-flex items-center gap-1 self-start"
        role="tablist"
      >
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIdx;
          return (
            <button
              key={tab.label}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveIdx(idx)}
              className={`rounded-full px-4 py-1.5 text-xs font-body font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--cta-bg)] text-[var(--cta-fg)]'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-2">
        {tabs[activeIdx]?.content}
      </div>
    </div>
  );
}

