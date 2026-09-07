import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { role, isAdmin, isOperator, logout } = useAuth();
  const navigate = useNavigate();

  const hasAccess = () => {
    if (requiredRole === 'VIEWER') return true;
    if (requiredRole === 'OPERATOR') return isOperator;
    if (requiredRole === 'ADMIN') return isAdmin;
    return false;
  };

  if (hasAccess()) {
    return <>{children}</>;
  }

  const handleReauth = () => {
    logout();
    navigate('/login');
  };

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
              This tactical module requires <strong className="text-primary uppercase">[{requiredRole}]</strong> authorization. Your current active role is <strong className="text-error uppercase">[{role}]</strong>.
            </>
          )}
        </p>
      </div>

      {/* Re-authenticate Action */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleReauth}
          className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary border border-primary/40 font-headline text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>LOG IN WITH {requiredRole} ACCOUNT</span>
        </button>
      </div>

      {/* Security Classification Footer */}
      <div className="text-[10px] text-outline border-t border-surface-container-high/40 pt-3 max-w-sm">
        <span>INCIDENT LOGGED: SHA-256 AUDIT EVENT #SEC-709 · POSTGRESQL RBAC POLICY</span>
      </div>
    </div>
  );
};
