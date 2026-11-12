import { useState, useEffect } from 'react';
import { useSession } from './useSession';
import { SolidButton } from '@/components/ui/SolidButton';
import { X, ArrowUpRight } from '@/components/icons';

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithEmail,
    signUpWithEmail,
    continueAsGuest,
  } = useSession();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessSignup, setIsSuccessSignup] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    if (mode === 'signin') {
      const { error } = await signInWithEmail(email, password);
      setIsSubmitting(false);
      if (error) {
        setErrorMsg(error);
      } else {
        closeAuthModal();
      }
    } else {
      const { error } = await signUpWithEmail(email, password, displayName);
      setIsSubmitting(false);
      if (error) {
        setErrorMsg(error);
      } else {
        setIsSuccessSignup(true);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md liquid-glass-strong rounded-3xl p-7 border border-white/20 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-white/10 transition-colors"
          aria-label="Close authentication modal"
          type="button"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/30 mb-1">
            <span className="font-heading italic font-bold text-lg">P</span>
          </div>
          <h2 id="auth-modal-title" className="font-heading italic text-2xl text-[var(--fg)]">
            {mode === 'signin' ? 'Welcome Back' : 'Create Botanical Profile'}
          </h2>
          <p className="text-xs text-[var(--fg-muted)] font-body">
            {mode === 'signin'
              ? 'Sign in to access your cloud history and analytical metrics.'
              : 'Sign up to sync your plant field scans across all devices.'}
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex rounded-full liquid-glass p-1 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-body font-medium rounded-full transition-all ${
              mode === 'signin'
                ? 'bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-sm'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-body font-medium rounded-full transition-all ${
              mode === 'signup'
                ? 'bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-sm'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Success Screen after Signup */}
        {isSuccessSignup ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-[var(--accent)] flex items-center justify-center mx-auto border border-emerald-500/40">
              ✓
            </div>
            <h3 className="font-heading italic text-lg text-[var(--fg)]">Confirmation Email Sent</h3>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              We have sent a verification link to <strong className="text-[var(--fg)]">{email}</strong>.
              Click the link to activate your profile, then sign in.
            </p>
            <SolidButton
              onClick={() => {
                setIsSuccessSignup(false);
                setMode('signin');
              }}
              className="w-full py-2.5 justify-center text-xs"
            >
              Return to Sign In
            </SolidButton>
          </div>
        ) : (
          /* Auth Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed"
                role="alert"
              >
                {errorMsg}
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--fg-muted)]">
                  Your Name / Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Dr. Jane Botanist"
                  className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/10 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--fg-muted)]">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="botanist@herbarium.org"
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/10 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--fg-muted)]">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl liquid-glass border border-white/10 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <SolidButton
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 justify-center text-xs mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </SolidButton>
          </form>
        )}

        {/* Optional Guest Mode Footer */}
        <div className="pt-2 border-t border-white/10 text-center space-y-2">
          <button
            type="button"
            onClick={continueAsGuest}
            className="text-xs font-mono text-[var(--fg-muted)] hover:text-[var(--fg)] underline transition-colors"
          >
            Continue as Guest (No Cloud Sync)
          </button>
          <div className="text-[10px] text-[var(--fg-subtle)] leading-normal">
            Privacy First: On-device classification works completely offline without an account.
          </div>
        </div>
      </div>
    </div>
  );
}
