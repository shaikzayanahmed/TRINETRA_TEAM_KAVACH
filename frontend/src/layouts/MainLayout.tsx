import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Sidebar } from '../components/common/Sidebar';
import { DemoBanner } from '../components/common/DemoBanner';
import { AiCommandPalette } from '../components/common/AiCommandPalette';

export const MainLayout: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette on Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => {
      setIsCommandPaletteOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-ai-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-ai-command-palette', handleCustomOpen);
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-body">
      {/* Pinned Tactical Top Header with AI Command Launcher */}
      <Header onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

      {/* Main Container */}
      <div className="pt-14 flex-1 flex flex-col">
        {/* Interactive SIH Demo Banner */}
        <DemoBanner />

        {/* Content Area with Pinned Sidebar */}
        <div className="flex-1 w-full max-w-[1920px] mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          <Sidebar />

          {/* Dynamic Page Stage */}
          <main className="flex-1 w-full min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Tactical AI Command Palette Modal */}
      <AiCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Tactical Footer */}
      <footer className="w-full bg-surface-container-lowest border-t border-surface-container-high/60 py-2.5 px-4 lg:px-6 select-none font-mono text-[11px] text-on-surface-variant flex flex-col sm:flex-row items-center justify-between gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-on-surface font-semibold uppercase">TRINETRA COMMAND CENTER</span>
          </div>
          <span className="text-outline-variant hidden md:inline">|</span>
          <span className="hidden md:inline text-outline">SIH PROJECT: TRINETRA EDGE SURVEILLANCE</span>
          <span className="text-outline-variant hidden md:inline">|</span>
          <span className="hidden md:inline text-outline">CRYPTO: SHA-256 VERIFIED</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-secondary font-semibold">SEC LEVEL: RESTRICTED</span>
          <span className="text-outline">TRINETRA v2.4-TACTICAL-CORE</span>
        </div>
      </footer>
    </div>
  );
};
