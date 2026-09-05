import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [callsign, setCallsign] = useState<string>('SIH-UNIT-ALPHA');
  const [passkey, setPasskey] = useState<string>('TRINETRA-SEC-07');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const res = await login(callsign, passkey);
    setIsSubmitting(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Authentication failed. Verify callsign and tactical credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 font-body select-none">
      {/* Background Raster Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#8c909f_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 w-full max-w-md bg-surface-container-low border border-surface-container-high/60 rounded-2xl p-6 sm:p-8 shadow-tactical-extruded flex flex-col gap-6">
        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center gap-3 pb-4 border-b border-surface-container-high/50">
          <img
            src="/logo.svg"
            alt="TRINETRA Logo"
            className="h-14 w-14 object-contain filter drop-shadow-[0_0_12px_rgba(173,198,255,0.4)]"
          />
          <div className="flex flex-col">
            <span className="font-headline text-2xl font-extrabold uppercase tracking-wider text-on-surface">
              TRINETRA
            </span>
            <span className="font-mono text-xs text-primary font-semibold tracking-widest uppercase mt-0.5">
              COMMAND CONSOLE AUTHENTICATION
            </span>
            <span className="font-mono text-[10px] text-outline mt-1">
              NORTHERN BORDER SECTOR 07 · LEH
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-error-container/20 border border-error/40 font-mono text-xs text-error flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="text-outline uppercase font-semibold">
              Operator Callsign / Unit ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="e.g. SIH-UNIT-ALPHA"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-on-surface placeholder:text-outline font-mono text-xs shadow-tactical-inset focus:outline-none focus:border-primary transition-all"
              />
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-outline text-[18px]">
                badge
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-outline uppercase font-semibold">
              Tactical Security Passkey
            </label>
            <div className="relative">
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-on-surface placeholder:text-outline font-mono text-xs shadow-tactical-inset focus:outline-none focus:border-primary transition-all"
              />
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-outline text-[18px]">
                lock
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high/40 text-[11px]">
            <span className="text-outline">Assigned Sector:</span>
            <span className="text-primary font-bold">SECTOR 07 (NORTHERN LEH)</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-primary text-on-primary font-headline text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(173,198,255,0.35)] flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>VERIFYING PASSKEY...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>AUTHORIZE OPERATOR ACCESS</span>
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="text-center font-mono text-[10px] text-outline border-t border-surface-container-high/40 pt-3">
          <span>CLASSIFICATION: RESTRICTED · AUTHORIZED DEFENSE PERSONNEL ONLY</span>
        </div>
      </div>
    </div>
  );
};
