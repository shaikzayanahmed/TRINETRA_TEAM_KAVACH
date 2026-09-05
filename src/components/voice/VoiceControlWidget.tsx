import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { voiceService, VOICE_COMMANDS } from '../../services/voiceControlService';
import { useDemo } from '../../context/DemoContext';

export const VoiceControlWidget: React.FC = () => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  const navigate = useNavigate();
  const { startDemo, nextStep, prevStep, resetDemo, triggerBreach } = useDemo();

  const handleCommand = useCallback(
    (action: string, spokenText: string) => {
      setLastHeard(spokenText);
      setLastAction(action);
      setToastVisible(true);

      // Auto-hide toast after 4s
      setTimeout(() => setToastVisible(false), 4000);

      switch (action) {
        // Navigation routes
        case 'NAV_SURVEILLANCE':
          navigate('/surveillance');
          break;
        case 'NAV_MAP':
          navigate('/map');
          break;
        case 'NAV_DASHBOARD':
          navigate('/dashboard');
          break;
        case 'NAV_ALERTS':
          navigate('/alerts');
          break;
        case 'NAV_EVIDENCE':
          navigate('/evidence');
          break;
        case 'NAV_FENCE':
          navigate('/virtual-fence');
          break;
        case 'NAV_EDGE':
          navigate('/edge-node');
          break;
        case 'NAV_REPORTS':
          navigate('/reports');
          break;
        case 'NAV_ANALYTICS':
          navigate('/analytics');
          break;
        case 'NAV_DATA_FLOW':
          navigate('/data-flow');
          break;
        case 'NAV_ENVIRONMENT':
          navigate('/environment');
          break;

        // Tactical & Demo triggers
        case 'SIMULATE_BREACH':
          triggerBreach();
          navigate('/alerts');
          break;
        case 'DEMO_START':
          startDemo();
          break;
        case 'DEMO_NEXT':
          nextStep();
          break;
        case 'DEMO_PREV':
          prevStep();
          break;
        case 'DEMO_RESET':
          resetDemo();
          break;
        case 'SHOW_HELP':
          setShowHelp(true);
          break;
        case 'STATUS_REPORT':
          // Status response is handled via TTS in voiceControlService
          break;
        default:
          break;
      }
    },
    [navigate, startDemo, nextStep, prevStep, resetDemo, triggerBreach]
  );

  useEffect(() => {
    setIsSupported(voiceService.getIsSupported());
    setIsMuted(voiceService.getIsMuted());

    const unsubscribe = voiceService.subscribe(handleCommand);
    return () => {
      unsubscribe();
    };
  }, [handleCommand]);

  const toggleListening = () => {
    const active = voiceService.toggleListening();
    setIsListening(active);
  };

  const toggleMute = () => {
    const muted = voiceService.toggleMute();
    setIsMuted(muted);
  };

  if (!isSupported) {
    return null; // Gracefully degrade if SpeechRecognition is completely unsupported
  }

  return (
    <>
      {/* Floating Tactical AI Voice Command Bar */}
      <div className="fixed bottom-12 right-6 z-50 flex items-center gap-2 select-none font-mono">
        {/* Real-Time Transcript Toast Bubble */}
        {toastVisible && lastHeard && (
          <div className="bg-surface-container-low/95 backdrop-blur-md border border-primary/40 rounded-xl px-4 py-2.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center gap-3 animate-fade-in text-xs max-w-xs">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping flex-shrink-0" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-outline text-[10px] uppercase font-bold">Heard Command:</span>
              <span className="text-on-surface font-semibold truncate">"{lastHeard}"</span>
              {lastAction && (
                <span className="text-primary text-[10px] font-bold mt-0.5">
                  [ACTION]: {lastAction}
                </span>
              )}
            </div>
            <button
              onClick={() => setToastVisible(false)}
              className="text-outline hover:text-on-surface text-[14px] ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mute Audio Response Button */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute AI Voice Feedback' : 'Mute AI Voice Feedback'}
          className={`p-2.5 rounded-full border transition-all shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] ${
            isMuted
              ? 'bg-surface-container-high border-outline/30 text-outline'
              : 'bg-surface-container-high border-secondary/40 text-secondary hover:shadow-[0_0_10px_rgba(149,212,176,0.3)]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isMuted ? 'volume_off' : 'volume_up'}
          </span>
        </button>

        {/* Command Guide Button */}
        <button
          onClick={() => setShowHelp(true)}
          title="Open Voice Command Reference Guide"
          className="p-2.5 rounded-full bg-surface-container-high border border-primary/30 text-primary hover:bg-surface-container-highest transition-all shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] hover:shadow-[0_0_12px_rgba(173,198,255,0.3)]"
        >
          <span className="material-symbols-outlined text-[18px]">help</span>
        </button>

        {/* Main Pinned Tactical Microphone Button */}
        <button
          onClick={toggleListening}
          className={`relative px-4 py-2.5 rounded-full font-headline text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-tactical-extruded ${
            isListening
              ? 'bg-primary text-on-primary shadow-[0_0_25px_rgba(173,198,255,0.65)] ring-2 ring-primary ring-offset-2 ring-offset-surface'
              : 'bg-surface-container-high border border-primary/40 text-primary hover:bg-surface-container-highest hover:shadow-[0_0_15px_rgba(173,198,255,0.3)]'
          }`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-on-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
              </span>
              <span>AI LISTENING...</span>
              <span className="material-symbols-outlined text-[18px] animate-pulse">mic</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">mic_none</span>
              <span>VOICE CONTROL</span>
            </>
          )}
        </button>
      </div>

      {/* Voice Command Reference Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none font-body animate-fade-in">
          <div className="w-full max-w-2xl bg-surface-container-low border border-surface-container-high/80 rounded-2xl p-6 shadow-tactical-extruded flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
                  <span className="material-symbols-outlined text-xl">record_voice_over</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-headline text-base font-bold uppercase tracking-wide text-on-surface">
                    Tactical AI Voice Control Guide
                  </h3>
                  <span className="font-mono text-[11px] text-outline">
                    HANDS-FREE MILITARY COMMAND SYSTEM
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed font-body">
              Speak any of the recognized tactical instructions naturally into your microphone. The AI will parse the command, execute the route or simulation, and confirm via radio speech synthesis.
            </p>

            {/* Commands Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {VOICE_COMMANDS.map((cmd) => (
                <div
                  key={cmd.action}
                  className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 flex flex-col gap-1.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold">{cmd.label}</span>
                    <span className="text-[10px] text-outline px-2 py-0.5 rounded bg-surface-container-high">
                      {cmd.action}
                    </span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    <span className="text-outline">Say: </span>
                    <span className="text-secondary">"{cmd.keywords.slice(0, 3).join('" or "')}"</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-surface-container-high/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-outline">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span>Web Speech Recognition: Active</span>
              </div>
              <button
                onClick={() => {
                  setShowHelp(false);
                  if (!isListening) toggleListening();
                }}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-mono text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_12px_rgba(173,198,255,0.35)] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">mic</span>
                <span>START SPEAKING NOW</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
