export type BlurTextProps = {
  text: string;
  className?: string;
};

/** Phase 1 shell — renders the text cleanly. Word-by-word blur animation added in Phase 2. */
export function BlurText({ text, className = '' }: BlurTextProps) {
  return <span className={className}>{text}</span>;
}
