import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';

export type BlurTextProps = {
  text: string;
  className?: string;
  delay?: number;
};

export function BlurText({ text, className = '', delay = 0 }: BlurTextProps) {
  const words = useMemo(() => text.split(' '), [text]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: delay,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: prefersReducedMotion
      ? { opacity: 0 }
      : { filter: 'blur(10px)', opacity: 0, y: 50 },
    visible: prefersReducedMotion
      ? {
          opacity: 1,
          transition: { duration: 0.3, ease: 'easeOut' },
        }
      : {
          filter: 'blur(0px)',
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
        },
  };

  return (
    <motion.div
      className={`flex flex-wrap justify-center ${className}`}
      style={{ rowGap: '0.1em' }}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={wordVariants}
          style={{ display: 'inline-block', marginRight: '0.28em' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
