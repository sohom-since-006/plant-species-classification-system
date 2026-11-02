import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-8 md:px-16 lg:px-20 py-12">
      <h1 className="font-heading italic text-5xl md:text-6xl leading-[0.9] tracking-[-2px] text-[var(--fg)]">
        404
      </h1>
      <p className="mt-4 font-body font-light text-sm text-[var(--fg-muted)]">
        This page doesn&apos;t exist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block font-body text-sm text-[var(--accent)] underline underline-offset-4 hover:opacity-80"
      >
        Back to Home
      </Link>
    </div>
  );
}
