import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { POSTGRESQL_USERS } from '../services/authService';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState<'admin' | 'operator' | 'viewer'>('admin');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSelectRolePreset = (roleKey: 'admin' | 'operator' | 'viewer') => {
    setSelectedRoleTab(roleKey);
    const seed = POSTGRESQL_USERS[roleKey];
    if (seed) {
      setUsername(roleKey);
      setPassword(seed.hashCheck);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const res = await login(username, password);
    setIsSubmitting(false);

    if (res.success) {
      navigate('/surveillance');
    } else {
      setError(res.error || 'Authentication failed: Invalid credentials against PostgreSQL database.');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 font-body select-none relative overflow-hidden">
      {/* Tactical Radar Background Grid */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#8c909f_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(173,198,255,0.06)_0,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-lg bg-surface-container-low border border-surface-container-high/70 rounded-2xl p-6 sm:p-8 shadow-tactical-extruded flex flex-col gap-5">
        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center gap-2 pb-3 border-b border-surface-container-high/60">
          <div className="relative">
            <img
              src="/logo.svg"
              alt="TRINETRA Logo"
              className="h-12 w-12 object-contain filter drop-shadow-[0_0_14px_rgba(173,198,255,0.5)]"
            />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-secondary rounded-full border-2 border-surface animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline text-2xl font-black uppercase tracking-wider text-on-surface">
              TRINETRA · CONSOLE
            </span>
            <span className="font-mono text-[11px] text-primary font-bold tracking-widest uppercase mt-0.5">
              POSTGRESQL RBAC AUTHENTICATION GATEWAY
            </span>
          </div>

          {/* Database Connection Status Banner */}
          <div className="mt-1 flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest border border-secondary/40 text-[10px] font-mono text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
            <span className="font-bold">PostgreSQL: 127.0.0.1:5432 / antigravity.db</span>
            <span className="text-outline">·</span>
            <span className="text-on-surface-variant">[ONLINE]</span>
          </div>
        </div>

        {/* Role-Based Access Control (RBAC) Selector Cards */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-outline uppercase tracking-wider font-semibold">
            Select Role-Based Identity (PostgreSQL Seeded Accounts):
          </span>
          <div className="grid grid-cols-3 gap-2">
            {/* Admin Role */}
            <button
              type="button"
              onClick={() => handleSelectRolePreset('admin')}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                selectedRoleTab === 'admin'
                  ? 'bg-error-container/20 border-error shadow-[0_0_12px_rgba(255,180,171,0.25)] ring-1 ring-error/50'
                  : 'bg-surface-container-lowest/80 border-surface-container-high hover:border-outline'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.2 rounded bg-error/20 text-error text-[8px] font-mono font-black border border-error/40">
                  ADMIN
                </span>
                <span className="material-symbols-outlined text-error text-[14px]">shield_person</span>
              </div>
              <span className="font-headline text-xs font-bold text-on-surface">Commander</span>
              <span className="font-mono text-[9px] text-outline">Col. Sharma</span>
            </button>

            {/* Operator Role */}
            <button
              type="button"
              onClick={() => handleSelectRolePreset('operator')}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                selectedRoleTab === 'operator'
                  ? 'bg-secondary/15 border-secondary shadow-[0_0_12px_rgba(149,212,176,0.25)] ring-1 ring-secondary/50'
                  : 'bg-surface-container-lowest/80 border-surface-container-high hover:border-outline'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.2 rounded bg-secondary/20 text-secondary text-[8px] font-mono font-black border border-secondary/40">
                  OPERATOR
                </span>
                <span className="material-symbols-outlined text-secondary text-[14px]">military_tech</span>
              </div>
              <span className="font-headline text-xs font-bold text-on-surface">Tactical Lead</span>
              <span className="font-mono text-[9px] text-outline">Capt. Verma</span>
            </button>

            {/* Viewer Role */}
            <button
              type="button"
              onClick={() => handleSelectRolePreset('viewer')}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                selectedRoleTab === 'viewer'
                  ? 'bg-primary/15 border-primary shadow-[0_0_12px_rgba(173,198,255,0.25)] ring-1 ring-primary/50'
                  : 'bg-surface-container-lowest/80 border-surface-container-high hover:border-outline'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[8px] font-mono font-black border border-primary/40">
                  VIEWER
                </span>
                <span className="material-symbols-outlined text-primary text-[14px]">visibility</span>
              </div>
              <span className="font-headline text-xs font-bold text-on-surface">Intel Analyst</span>
              <span className="font-mono text-[9px] text-outline">Lt. Kulkarni</span>
            </button>
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 font-mono text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-outline uppercase font-semibold text-[11px] flex items-center justify-between">
              <span>PostgreSQL Username / Callsign</span>
              <span className="text-secondary font-mono text-[9px] font-normal">
                [Seed: admin | operator | viewer]
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin, operator, or viewer"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-on-surface placeholder:text-outline font-mono text-xs shadow-tactical-inset focus:outline-none focus:border-primary transition-all"
              />
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-outline text-[18px]">
                badge
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-outline uppercase font-semibold text-[11px] flex items-center justify-between">
              <span>PostgreSQL Password</span>
              <span className="text-secondary font-mono text-[9px] font-normal">
                [Seed: admin123 | operator123 | viewer123]
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-3 pr-10 py-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-on-surface placeholder:text-outline font-mono text-xs shadow-tactical-inset focus:outline-none focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Hide security passkey' : 'Show security passkey'}
                className="absolute right-2.5 top-2.5 p-0.5 rounded text-outline hover:text-primary transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Active Identity Details Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high/50 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="text-outline">Assigned Clearance:</span>
              <span className="text-primary font-bold">
                {POSTGRESQL_USERS[selectedRoleTab]?.securityClearance || 'SECRET'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-outline">Sector:</span>
              <span className="text-secondary font-bold">SECTOR 07 (LEH)</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-primary text-on-primary font-headline text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(173,198,255,0.35)] flex items-center justify-center gap-2 mt-1"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>VERIFYING AGAINST POSTGRESQL...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>AUTHORIZE {selectedRoleTab.toUpperCase()} SESSION</span>
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="text-center font-mono text-[9px] text-outline border-t border-surface-container-high/40 pt-2.5 flex items-center justify-between">
          <span>CLASSIFICATION: RESTRICTED</span>
          <span className="text-primary font-bold">MIL-STD-810H & SHA-256 RBAC</span>
        </div>
      </div>
    </div>
  );
};
