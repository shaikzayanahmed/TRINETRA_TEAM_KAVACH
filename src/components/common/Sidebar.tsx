import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: string;
  badgeType?: 'primary' | 'secondary' | 'error' | 'outline';
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isFenceBreached, activeAlert } = useDemo();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { name: 'Command Center', path: '/dashboard', icon: 'dashboard' },
    { name: 'Live Surveillance', path: '/surveillance', icon: 'videocam', badge: '1 LIVE', badgeType: 'secondary' },
    {
      name: 'Alerts',
      path: '/alerts',
      icon: 'notifications_active',
      badge: isFenceBreached || activeAlert ? '1 CRIT' : undefined,
      badgeType: 'error',
    },
    { name: 'Targets', path: '/targets', icon: 'person_search', badge: '1 ACT', badgeType: 'primary' },
    { name: 'Tactical Map', path: '/map', icon: 'map' },
    { name: 'Virtual Fence', path: '/virtual-fence', icon: 'fence', badge: isFenceBreached ? 'BREACH' : 'ACTIVE', badgeType: isFenceBreached ? 'error' : 'secondary' },
    { name: 'Edge Node', path: '/edge-node', icon: 'router', badge: 'ONLINE', badgeType: 'secondary' },
    { name: 'Evidence Vault', path: '/evidence', icon: 'fingerprint' },
    { name: 'Environment', path: '/environment', icon: 'thermostat' },
    { name: 'AI Analytics', path: '/analytics', icon: 'insights' },
    { name: 'Data Flow', path: '/data-flow', icon: 'account_tree' },
    { name: 'Reports & Audit', path: '/reports', icon: 'description' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
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
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg font-mono text-xs uppercase tracking-wider font-semibold flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-surface-container-high text-primary border border-primary/40 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/60 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : 'text-outline'}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>

                  {item.badge ? (
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
          ))}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="flex flex-col gap-2 pt-3 border-t border-surface-container-high/50 mt-3">
        <div className="p-2.5 rounded-lg bg-surface-container-lowest shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded bg-surface-container-high border border-surface-container-highest flex items-center justify-center text-primary font-mono text-xs font-bold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] flex-shrink-0">
              OP
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-mono text-xs text-on-surface font-semibold truncate">
                {user?.callsign || 'SIH-UNIT-ALPHA'}
              </span>
              <div className="flex items-center gap-1 font-mono text-[10px] text-outline">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span>Sector 07 Operator</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded text-outline hover:text-error hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>

        <div className="flex items-center justify-between px-1 font-mono text-[10px] text-outline">
          <span>v2.4-TACTICAL</span>
          <span className="text-secondary font-semibold">RESTRICTED</span>
        </div>
      </div>
    </aside>
  );
};
