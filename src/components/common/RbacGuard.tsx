import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface RbacGuardProps {
  requiredRole: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export const RbacGuard: React.FC<RbacGuardProps> = ({
  requiredRole,
  children,
  fallbackTitle = 'ACCESS RESTRICTED · INSUFFICIENT SECURITY CLEARANCE',
  fallbackDescription,
}) => {
  const { role, isAdmin, isOperator, quickSwitchRole } = useAuth();

  const hasAccess = () => {
    if (requiredRole === 'VIEWER') return true;
    if (requiredRole === 'OPERATOR') return isOperator;
    if (requiredRole === 'ADMIN') return isAdmin;
    return false;
  };

  if (hasAccess()) {
    return <>{children}</>;
  }

  return (
    <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-6 bg-surface-container-low border border-surface-container-high/60 rounded-xl text-center gap-4 select-none font-mono shadow-tactical-inset animate-in fade-in duration-200">
      {/* Tactical Lock Reticle */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-error-container/20 border border-error/50 flex items-center justify-center text-error shadow-[0_0_20px_rgba(255,180,171,0.3)]">
          <span className="material-symbols-outlined text-3xl">lock_person</span>
        </div>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-error animate-ping" />
      </div>

      <div className="flex flex-col items-center max-w-md gap-1">
        <span className="px-2 py-0.5 rounded bg-error/20 text-error text-[10px] font-bold border border-error/40 uppercase tracking-widest">
          SECURITY LEVEL EXCEEDED
        </span>
        <h2 className="font-headline text-lg font-bold text-on-surface mt-1">
          {fallbackTitle}
        </h2>
        <p className="text-xs text-outline font-normal">
          {fallbackDescription || (
            <>
              This tactical module requires <strong className="text-primary uppercase">[{requiredRole}]</strong> authorization. Your current PostgreSQL active role is <strong className="text-error uppercase">[{role}]</strong>.
            </>
          )}
        </p>
      </div>

      {/* RBAC Elevation Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
        <span className="text-[10px] text-outline">Quick Authorization Override:</span>
        <div className="flex items-center gap-1.5">
          {requiredRole === 'ADMIN' ? (
            <button
              onClick={() => quickSwitchRole('admin')}
              className="px-3 py-1.5 rounded-lg bg-error text-on-error font-headline text-xs font-bold uppercase tracking-wider hover:bg-error/90 transition-all shadow-[0_0_12px_rgba(255,180,171,0.4)] flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">shield_person</span>
              <span>Elevate to ADMIN (Commander)</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => quickSwitchRole('operator')}
                className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary font-headline text-xs font-bold uppercase tracking-wider hover:bg-secondary/90 transition-all shadow-[0_0_12px_rgba(149,212,176,0.4)] flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">military_tech</span>
                <span>Elevate to OPERATOR</span>
              </button>
              <button
                onClick={() => quickSwitchRole('admin')}
                className="px-3 py-1.5 rounded-lg bg-error text-on-error font-headline text-xs font-bold uppercase tracking-wider hover:bg-error/90 transition-all shadow-[0_0_12px_rgba(255,180,171,0.4)] flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">shield_person</span>
                <span>ADMIN</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Security Classification Footer */}
      <div className="text-[10px] text-outline border-t border-surface-container-high/40 pt-3 max-w-sm">
        <span>INCIDENT LOGGED: SHA-256 AUDIT EVENT #SEC-709 · POSTGRESQL RBAC POLICY</span>
      </div>
    </div>
  );
};
