import React from 'react';
import { useSession } from './useSession';
import { SolidButton } from '@/components/ui/SolidButton';
import { Leaf, ArrowUpRight } from '@/components/icons';
import { Link } from 'react-router-dom';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  featureName?: string;
}

export function ProtectedRoute({ children, featureName = 'this feature' }: ProtectedRouteProps) {
  const { user, loading, openAuthModal } = useSession();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" aria-live="polite">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full liquid-glass-strong rounded-3xl p-8 border border-white/15 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-[var(--accent)]">
            <Leaf className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-heading italic text-2xl text-[var(--fg)]">
              Sign In to Access {featureName}
            </h2>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              Your botanical scans, private history, and analytical metrics are securely isolated per user account with PostgreSQL Row Level Security (RLS).
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <SolidButton
              onClick={openAuthModal}
              className="w-full py-3 justify-center text-xs"
            >
              Sign In or Create Account
            </SolidButton>

            <Link to="/classify" className="block">
              <button
                type="button"
                className="w-full py-2.5 rounded-full text-xs font-mono text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Continue as Guest on Classifier</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>

          <div className="pt-4 border-t border-white/10 text-[10px] text-[var(--fg-subtle)] leading-normal">
            Privacy First: On-device classification and local offline mode never require an account.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
