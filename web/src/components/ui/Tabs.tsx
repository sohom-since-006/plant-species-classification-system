import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabCrossfade, usePrefersReducedMotion } from '@/lib/motion';

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
  const reduced = usePrefersReducedMotion();

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div
        className="liquid-glass rounded-full p-1.5 inline-flex items-center gap-1 self-start"
        role="tablist"
        data-glow=""
      >
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIdx;
          return (
            <button
              key={tab.label}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveIdx(idx)}
              data-glow=""
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
      <div role="tabpanel" className="pt-2 overflow-hidden">
        {reduced ? (
          <div>{tabs[activeIdx]?.content}</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              variants={tabCrossfade}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {tabs[activeIdx]?.content}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
