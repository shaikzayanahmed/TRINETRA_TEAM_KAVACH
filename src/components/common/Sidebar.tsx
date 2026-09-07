import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: string;
  badgeType?: 'primary' | 'secondary' | 'error' | 'outline';
  requiredRole?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

export const Sidebar: React.FC = () => {
  const { user, role, isAdmin, isOperator, quickSwitchRole, logout } = useAuth();
  const { isFenceBreached, activeAlert } = useDemo();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState<boolean>(false);
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { name: 'Command Center', path: '/dashboard', icon: 'dashboard', requiredRole: 'VIEWER' },
    { name: 'Live Surveillance', path: '/surveillance', icon: 'videocam', badge: '1 LIVE', badgeType: 'secondary', requiredRole: 'VIEWER' },
    {
      name: 'Alerts & Intercept',
      path: '/alerts',
      icon: 'notifications_active',
      badge: isFenceBreached || activeAlert ? '1 CRIT' : undefined,
      badgeType: 'error',
      requiredRole: 'OPERATOR',
    },
    { name: 'Targets Tracking', path: '/targets', icon: 'person_search', badge: '1 ACT', badgeType: 'primary', requiredRole: 'OPERATOR' },
    { name: 'Tactical Map', path: '/map', icon: 'map', requiredRole: 'VIEWER' },
    {
      name: 'Virtual Fence',
      path: '/virtual-fence',
      icon: 'fence',
      badge: isFenceBreached ? 'BREACH' : 'ACTIVE',
      badgeType: isFenceBreached ? 'error' : 'secondary',
      requiredRole: 'OPERATOR',
    },
    {
      name: 'Edge Node Mgmt',
      path: '/edge-node',
      icon: 'router',
      badge: 'ONLINE',
      badgeType: 'secondary',
      requiredRole: 'ADMIN',
    },
    { name: 'Evidence Vault', path: '/evidence', icon: 'fingerprint', requiredRole: 'VIEWER' },
    { name: 'Environment', path: '/environment', icon: 'thermostat', requiredRole: 'VIEWER' },
    { name: 'AI Analytics', path: '/analytics', icon: 'insights', requiredRole: 'VIEWER' },
    {
      name: 'Data Pipeline',
      path: '/data-flow',
      icon: 'account_tree',
      requiredRole: 'ADMIN',
    },
    { name: 'Reports & Audit', path: '/reports', icon: 'description', requiredRole: 'VIEWER' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeStyle = () => {
    switch (role) {
      case 'ADMIN':
      case 'SYSTEM_ADMIN':
      case 'TACTICAL_COMMANDER':
        return 'bg-error/20 text-error border-error/40';
      case 'OPERATOR':
      case 'SECTOR_OPERATOR':
        return 'bg-secondary/20 text-secondary border-secondary/40';
      default:
        return 'bg-primary/20 text-primary border-primary/40';
    }
  };

  const isRoleRestricted = (reqRole?: 'ADMIN' | 'OPERATOR' | 'VIEWER') => {
    if (!reqRole || reqRole === 'VIEWER') return false;
    if (reqRole === 'OPERATOR') return !isOperator;
    if (reqRole === 'ADMIN') return !isAdmin;
    return false;
  };

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col justify-between bg-surface-container-low border border-surface-container-high/60 rounded-xl p-3 sm:p-4 shadow-[-3px_-3px_7px_rgba(255,255,255,0.03),4px_4px_10px_rgba(0,0,0,0.55)] select-none">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-surface-container-high/50">
          <img
            src="/logo.svg"
            alt="TRINETRA Logo"
            className="h-8 w-8 object-contain filter drop-shadow-[0_0_6px_rgba(173,198,255,0.3)]"
          />
          <div className="flex flex-col">
            <span className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface leading-none">
              TRINETRA
            </span>
            <span className="font-mono text-[10px] text-primary tracking-widest uppercase font-semibold mt-0.5">
              BORDER SURVEILLANCE
            </span>
            <span className="font-mono text-[9px] text-outline mt-0.5">
              SEC-07 · DEFENSE AI
            </span>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between px-1 font-mono text-[10px] text-outline uppercase tracking-wider">
          <span>OPERATIONAL MODULES</span>
          <div className="flex items-center gap-1.5">
            <span className={`px-1 py-0.2 rounded text-[8px] font-bold border ${getRoleBadgeStyle()}`}>
              {role}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-1 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {navItems.map((item) => {
            const isRestricted = isRoleRestricted(item.requiredRole);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg font-mono text-xs uppercase tracking-wider font-semibold flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-surface-container-high text-primary border border-primary/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]'
                      : isRestricted
                      ? 'text-outline/60 hover:text-outline hover:bg-surface-container-highest/30 border border-transparent opacity-75'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/60 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className={`material-symbols-outlined text-[18px] ${
                        isActive
                          ? 'text-primary'
                          : isRestricted
                          ? 'text-outline/50'
                          : 'text-outline'
                      }`}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>

                    {isRestricted ? (
                      <span className="px-1.5 py-0.2 rounded bg-surface-container text-[8px] font-bold text-outline border border-surface-container-highest flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">lock</span>
                        <span>{item.requiredRole}</span>
                      </span>
                    ) : item.badge ? (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.badgeType === 'error'
                            ? 'bg-error-container text-error border border-error/30 animate-pulse'
                            : item.badgeType === 'secondary'
                            ? 'bg-surface-container text-secondary border border-secondary/30'
                            : 'bg-surface-container text-primary border border-primary/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & RBAC Live Role Switcher */}
      <div className="flex flex-col gap-2 pt-3 border-t border-surface-container-high/50 mt-3">
        {/* Quick Role Switcher Panel */}
        {showRoleSwitcher && (
          <div className="p-2 rounded-lg bg-surface-container-lowest border border-primary/40 shadow-xl flex flex-col gap-1.5 text-[10px] font-mono animate-in fade-in slide-in-from-bottom-2 duration-150">
            <span className="text-outline uppercase text-[9px] font-bold px-1">
              Switch PostgreSQL Identity:
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={async () => {
                  await quickSwitchRole('admin');
                  setShowRoleSwitcher(false);
                }}
                className={`px-1.5 py-1 rounded text-center font-bold border transition-colors ${
                  isAdmin ? 'bg-error text-on-error border-error' : 'bg-surface-container hover:bg-surface-container-high text-error border-error/30'
                }`}
              >
                ADMIN
              </button>
              <button
                onClick={async () => {
                  await quickSwitchRole('operator');
                  setShowRoleSwitcher(false);
                }}
                className={`px-1.5 py-1 rounded text-center font-bold border transition-colors ${
                  role === 'OPERATOR' ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface-container hover:bg-surface-container-high text-secondary border-secondary/30'
                }`}
              >
                OPERATOR
              </button>
              <button
                onClick={async () => {
                  await quickSwitchRole('viewer');
                  setShowRoleSwitcher(false);
                }}
                className={`px-1.5 py-1 rounded text-center font-bold border transition-colors ${
                  role === 'VIEWER' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container hover:bg-surface-container-high text-primary border-primary/30'
                }`}
              >
                VIEWER
              </button>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="p-2.5 rounded-lg bg-surface-container-lowest shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] flex items-center justify-between">
          <div
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-2.5 overflow-hidden cursor-pointer group"
            title="Click to switch PostgreSQL RBAC Role"
          >
            <div className="w-8 h-8 rounded bg-surface-container-high border border-surface-container-highest flex items-center justify-center text-primary font-mono text-xs font-bold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] flex-shrink-0 group-hover:border-primary transition-colors">
              {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-on-surface font-bold truncate">
                  {user?.username || 'admin'}
                </span>
                <span className={`px-1 py-0.2 rounded text-[8px] font-mono font-black border ${getRoleBadgeStyle()}`}>
                  {role}
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[9px] text-outline">
                <span className="w-1 h-1 rounded-full bg-secondary" />
                <span className="truncate">{user?.name || 'Commander'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              title="Switch RBAC Role"
              className="p-1.5 rounded text-outline hover:text-primary hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded text-outline hover:text-error hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>

        {/* Database Footer Status */}
        <div className="flex items-center justify-between px-1 font-mono text-[9px] text-outline">
          <span className="flex items-center gap-1 text-secondary">
            <span className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
            PostgreSQL 5432
          </span>
          <span className="text-primary font-semibold">{user?.securityClearance || 'TOP_SECRET'}</span>
        </div>
      </div>
    </aside>
  );
};
