import React, { useState, useRef, useEffect } from 'react';
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
  const { user, role, isAdmin, isOperator, logout } = useAuth();
  const { isFenceBreached, activeAlert } = useDemo();
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close popup if user clicks outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: NavItem[] = [
    { name: 'Command Center', path: '/dashboard', icon: 'dashboard', requiredRole: 'VIEWER' },
    { name: 'Live Surveillance', path: '/surveillance', icon: 'videocam', badge: '1 LIVE', badgeType: 'secondary', requiredRole: 'VIEWER' },
    {
      name: 'Alerts & Intercept',
      path: '/alerts',
      icon: 'notifications_active',
      badge: isFenceBreached || (activeAlert && activeAlert.status !== 'RESOLVED') ? '1 CRIT' : undefined,
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
    setShowUserMenu(false);
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

      {/* Footer Profile with Interactive Toggle Pop-up */}
      <div ref={userMenuRef} className="relative flex flex-col gap-2 pt-3 border-t border-surface-container-high/50 mt-3">
        {/* Floating User Profile & Logout Pop-up Menu */}
        {showUserMenu && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 p-3 rounded-xl bg-surface-container border border-surface-container-high/80 shadow-[0_10px_25px_rgba(0,0,0,0.85)] flex flex-col gap-2.5 text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
            {/* Pop-up Header */}
            <div className="flex items-center justify-between border-b border-surface-container-high/60 pb-2">
              <span className="font-bold text-on-surface uppercase text-[11px]">ACTIVE SESSION</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getRoleBadgeStyle()}`}>
                {role}
              </span>
            </div>

            {/* User Details */}
            <div className="flex flex-col gap-1 text-[11px] text-outline">
              <div className="flex items-center justify-between">
                <span>Identity:</span>
                <span className="text-on-surface font-semibold">{user?.name || 'Authorized User'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Callsign:</span>
                <span className="text-primary font-bold">{user?.callsign || user?.username || 'OP-01'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Clearance:</span>
                <span className="text-secondary font-bold">{user?.securityClearance || 'CONFIDENTIAL'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Database:</span>
                <span className="text-on-surface text-[10px]">trinetra_db:5432</span>
              </div>
            </div>

            {/* Logout Action Button */}
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-lg bg-error-container/20 hover:bg-error text-error hover:text-on-error border border-error/40 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm mt-1"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>LOG OUT SESSION</span>
            </button>
          </div>
        )}

        {/* Profile Card (Click to Toggle User Popup) */}
        <div
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] group ${
            showUserMenu
              ? 'bg-surface-container border-primary/50 ring-1 ring-primary/30'
              : 'bg-surface-container-lowest border-surface-container-high/40 hover:bg-surface-container hover:border-surface-container-high'
          }`}
          title="Click to view session details & Log Out"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* User Emblem Avatar */}
            <div className="relative w-8 h-8 rounded-lg bg-surface-container-high border border-surface-container-highest flex items-center justify-center text-primary font-mono text-xs font-bold shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] flex-shrink-0 group-hover:border-primary transition-colors">
              <span>{user?.username?.slice(0, 2).toUpperCase() || 'US'}</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-secondary rounded-full border border-surface-container-lowest animate-pulse" />
            </div>

            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-on-surface font-bold truncate">
                  {user?.username || 'user'}
                </span>
                <span className={`px-1 py-0.2 rounded text-[8px] font-mono font-black border ${getRoleBadgeStyle()}`}>
                  {role}
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[9px] text-outline">
                <span className="truncate">{user?.name || 'Active Officer'}</span>
              </div>
            </div>
          </div>

          {/* Toggle Chevron */}
          <span className={`material-symbols-outlined text-outline text-[18px] transition-transform duration-200 group-hover:text-primary ${
            showUserMenu ? 'rotate-180 text-primary' : ''
          }`}>
            expand_less
          </span>
        </div>

        {/* Database Footer Status */}
        <div className="flex items-center justify-between px-1 font-mono text-[9px] text-outline">
          <span className="flex items-center gap-1 text-secondary">
            <span className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
            PostgreSQL 5432
          </span>
          <span className="text-primary font-semibold">{user?.securityClearance || 'CONFIDENTIAL'}</span>
        </div>
      </div>
    </aside>
  );
};
