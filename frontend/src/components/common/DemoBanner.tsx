import React from 'react';
import { useDemo } from '../../context/DemoContext';

export const DemoBanner: React.FC = () => {
  const {
    isRunning,
    step,
    stepInfo,
    autoPlay,
    startDemo,
    nextStep,
    prevStep,
    resetDemo,
    toggleAutoPlay,
  } = useDemo();

  return (
    <div className="w-full bg-surface-container-low border-b border-surface-container-high/60 shadow-[0_2px_10px_rgba(0,0,0,0.5)] px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-2.5 font-mono text-xs select-none">
      {/* Status & Step Description */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-lowest border border-primary/30 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
          <span className="text-primary font-bold">SIH DEMO MODE:</span>
          <span className="text-on-surface font-semibold">
            {isRunning ? `STEP ${step}/5` : 'STANDBY'}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
          <span className="font-semibold text-primary truncate">
            {stepInfo.title}:
          </span>
          <span className="text-on-surface-variant text-[11px] hidden sm:inline truncate">
            {stepInfo.description}
          </span>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {!isRunning ? (
          <button
            onClick={startDemo}
            className="px-3 py-1.5 rounded bg-primary text-on-primary font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(173,198,255,0.4)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            <span>START DEMO</span>
          </button>
        ) : (
          <>
            <button
              onClick={prevStep}
              disabled={step <= 0}
              className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface hover:text-primary disabled:opacity-40 disabled:hover:text-on-surface border border-surface-container-highest transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">skip_previous</span>
              <span className="hidden lg:inline">PREV</span>
            </button>

            <button
              onClick={nextStep}
              disabled={step >= 5}
              className="px-2.5 py-1 rounded bg-surface-container-high text-primary font-bold hover:bg-surface-container-highest disabled:opacity-40 border border-primary/30 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">skip_next</span>
              <span>NEXT STEP</span>
            </button>

            <button
              onClick={toggleAutoPlay}
              className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1 ${
                autoPlay
                  ? 'bg-secondary-container text-secondary border-secondary/40'
                  : 'bg-surface-container text-outline border-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {autoPlay ? 'pause' : 'play_arrow'}
              </span>
              <span className="hidden lg:inline">{autoPlay ? 'AUTO: ON' : 'AUTO: OFF'}</span>
            </button>

            <button
              onClick={resetDemo}
              className="px-2.5 py-1 rounded bg-surface-container text-outline hover:text-error hover:bg-error-container/20 border border-surface-container-high transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>RESET</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
