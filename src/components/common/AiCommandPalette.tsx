import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { commandService, CommandItem, SYSTEM_COMMANDS, LearnedMemory } from '../../services/commandPromptService';
import { useDemo } from '../../context/DemoContext';

interface AiCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiCommandPalette: React.FC<AiCommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState<string>('');
  const [filteredCommands, setFilteredCommands] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [memoryStats, setMemoryStats] = useState<LearnedMemory>(commandService.getMemoryStats());

  // Interactive teaching form state
  const [newAliasPhrase, setNewAliasPhrase] = useState<string>('');
  const [newAliasTargetId, setNewAliasTargetId] = useState<string>('nav-surveillance');
  const [teachSuccessMsg, setTeachSuccessMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { startDemo, nextStep, resetDemo, triggerBreach } = useDemo();

  // Refresh commands and memory
  const refreshData = () => {
    let results = commandService.searchCommands(query);
    if (activeCategory !== 'ALL' && activeCategory !== 'LEARNING') {
      results = results.filter((c) => c.category === activeCategory);
    }
    setFilteredCommands(results);
    setMemoryStats(commandService.getMemoryStats());
  };

  // Filter commands on query or category change
  useEffect(() => {
    refreshData();
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setAiOutput(null);
      setTeachSuccessMsg(null);
      setMemoryStats(commandService.getMemoryStats());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const executeCommand = (cmd: CommandItem) => {
    // Record execution for frequency ranking & auto-association learning
    commandService.recordCommandExecution(cmd.id, query);
    setMemoryStats(commandService.getMemoryStats());

    if (cmd.aiResponse) {
      setAiOutput(cmd.aiResponse);
    }

    if (cmd.action === 'NAVIGATE' && cmd.route) {
      navigate(cmd.route);
      onClose();
    } else if (cmd.action === 'TRIGGER_BREACH') {
      triggerBreach();
      navigate('/alerts');
      onClose();
    } else if (cmd.action === 'DEMO_START') {
      startDemo();
      onClose();
    } else if (cmd.action === 'DEMO_NEXT') {
      nextStep();
      onClose();
    } else if (cmd.action === 'DEMO_RESET') {
      resetDemo();
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        // Natural language prompt query & self-learning
        const res = commandService.parseNaturalPrompt(query);
        setMemoryStats(commandService.getMemoryStats());

        if (res.matchedCommand) {
          executeCommand(res.matchedCommand);
        } else if (res.aiDirectAnswer) {
          setAiOutput(res.aiDirectAnswer);
        }
      } else if (filteredCommands.length > 0) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleTeachAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAliasPhrase.trim()) return;

    const ok = commandService.learnAlias(newAliasPhrase, newAliasTargetId);
    if (ok) {
      const target = SYSTEM_COMMANDS.find((c) => c.id === newAliasTargetId);
      setTeachSuccessMsg(`Learned alias "${newAliasPhrase.trim().toLowerCase()}" -> [${target?.title}].`);
      setNewAliasPhrase('');
      refreshData();
      setTimeout(() => setTeachSuccessMsg(null), 4000);
    }
  };

  const handleClearMemory = () => {
    if (window.confirm('Reset all learned AI phrases and frequency memory to defaults?')) {
      commandService.clearMemory();
      refreshData();
      setAiOutput('AI Memory wiped and reset to factory baseline.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 font-body select-none animate-fade-in">
      <div className="w-full max-w-2xl bg-surface-container-low border border-surface-container-high/80 rounded-2xl shadow-tactical-extruded flex flex-col overflow-hidden">
        {/* Terminal Command Header / Prompt Bar */}
        <div className="p-4 border-b border-surface-container-high/60 bg-surface-container-lowest/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
            <span className="material-symbols-outlined text-[20px] animate-pulse">psychology</span>
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAiOutput(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type tactical command or ask AI (e.g. 'cams', 'who is operator?', 'simulate breach')..."
              className="w-full bg-transparent font-mono text-xs text-on-surface placeholder:text-outline focus:outline-none tracking-wide"
            />
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] text-outline">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high border border-surface-container-highest">ESC</kbd>
            <span>TO CLOSE</span>
          </div>
        </div>

        {/* Category Filter & Learning Tabs */}
        <div className="px-4 py-2 bg-surface-container-lowest/50 border-b border-surface-container-high/40 flex items-center justify-between gap-1.5 overflow-x-auto font-mono text-[10px]">
          <div className="flex items-center gap-1.5">
            {['ALL', 'NAVIGATION', 'SIMULATION', 'AI_INTEL'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md border transition-all ${
                  activeCategory === cat
                    ? 'bg-primary/20 border-primary text-primary font-bold shadow-[0_0_8px_rgba(173,198,255,0.3)]'
                    : 'bg-surface-container-high/50 border-surface-container-highest text-outline hover:text-on-surface'
                }`}
              >
                {cat === 'AI_INTEL' ? 'AI INTEL / Q&A' : cat}
              </button>
            ))}
          </div>

          {/* AI Learning Mode Button */}
          <button
            onClick={() => setActiveCategory('LEARNING')}
            className={`px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
              activeCategory === 'LEARNING'
                ? 'bg-secondary/20 border-secondary text-secondary font-bold shadow-[0_0_8px_rgba(149,212,176,0.3)]'
                : 'bg-surface-container-high/40 border-secondary/30 text-secondary hover:bg-secondary/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span>AI LEARNING & STATS ({Object.keys(memoryStats.aliases).length})</span>
          </button>
        </div>

        {/* Interactive AI Answer Banner */}
        {aiOutput && (
          <div className="p-3.5 mx-4 mt-3 rounded-xl bg-surface-container-lowest border border-secondary/40 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] flex items-start gap-2.5 font-mono text-xs text-secondary animate-fade-in">
            <span className="material-symbols-outlined text-[18px] text-secondary flex-shrink-0 mt-0.5">
              smart_toy
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-outline uppercase font-bold">Trinetra Tactical AI Core:</span>
              <p className="text-on-surface font-semibold leading-relaxed">{aiOutput}</p>
            </div>
          </div>
        )}

        {/* Main Content: Normal Commands or AI Learning Hub */}
        {activeCategory === 'LEARNING' ? (
          <div className="p-4 flex flex-col gap-4 font-mono text-xs max-h-[340px] overflow-y-auto">
            {/* Learning Engine Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 flex flex-col items-center text-center">
                <span className="text-outline text-[10px]">TOTAL INTERACTIONS</span>
                <span className="text-xl font-bold text-primary">{memoryStats.totalInteractions}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 flex flex-col items-center text-center">
                <span className="text-outline text-[10px]">LEARNED PHRASES</span>
                <span className="text-xl font-bold text-secondary">{Object.keys(memoryStats.aliases).length}</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high/60 flex flex-col items-center text-center">
                <span className="text-outline text-[10px]">ADAPTIVE STATE</span>
                <span className="text-xs font-bold text-secondary mt-1">ONLINE / ACTIVE</span>
              </div>
            </div>

            {/* Teach New Alias Form */}
            <form onSubmit={handleTeachAlias} className="p-3.5 rounded-xl bg-surface-container-lowest border border-primary/30 flex flex-col gap-2.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <span className="text-primary font-bold text-xs uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">school</span>
                  <span>Teach AI Custom Command Alias</span>
                </span>
                <span className="text-[10px] text-outline">or type: learn "phrase" = "command"</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={newAliasPhrase}
                  onChange={(e) => setNewAliasPhrase(e.target.value)}
                  placeholder="When I type (e.g. 'cams', 'red alert')..."
                  className="w-full sm:flex-1 px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-container-highest text-on-surface font-mono text-xs focus:outline-none focus:border-primary"
                />
                <select
                  value={newAliasTargetId}
                  onChange={(e) => setNewAliasTargetId(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-surface-container-high border border-surface-container-highest text-on-surface font-mono text-xs focus:outline-none focus:border-primary"
                >
                  {SYSTEM_COMMANDS.map((c) => (
                    <option key={c.id} value={c.id}>
                      → {c.title}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-primary text-on-primary font-bold uppercase tracking-wider hover:bg-primary/90 transition-all text-xs"
                >
                  TEACH
                </button>
              </div>

              {teachSuccessMsg && (
                <span className="text-secondary text-[11px] font-semibold">{teachSuccessMsg}</span>
              )}
            </form>

            {/* List of Learned Aliases */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-outline text-[11px] uppercase font-bold">Active Learned Phrase Bindings:</span>
                <button
                  onClick={handleClearMemory}
                  className="text-error text-[10px] hover:underline"
                >
                  Clear Memory
                </button>
              </div>

              {Object.keys(memoryStats.aliases).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(memoryStats.aliases).map(([phrase, commandId]) => {
                    const target = SYSTEM_COMMANDS.find((c) => c.id === commandId);
                    return (
                      <div
                        key={phrase}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-high/80 border border-secondary/40 text-[11px] flex items-center gap-1.5 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]"
                      >
                        <span className="text-secondary font-bold">"{phrase}"</span>
                        <span className="text-outline">→</span>
                        <span className="text-on-surface truncate">{target?.title || commandId}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-outline text-[11px] italic">
                  No custom phrases learned yet. The AI automatically learns new phrases as you use it!
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Normal Command Results List */
          <div
            ref={listRef}
            className="max-h-[340px] overflow-y-auto p-2 flex flex-col gap-1 font-mono text-xs"
          >
            {filteredCommands.length > 0 ? (
              filteredCommands.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={cmd.id}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-surface-container-high/90 border-primary/50 text-on-surface shadow-[0_0_12px_rgba(173,198,255,0.2)] translate-x-1'
                        : 'bg-surface-container-low/60 border-transparent text-on-surface-variant hover:border-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          cmd.category === 'SIMULATION'
                            ? 'text-error'
                            : cmd.category === 'AI_INTEL'
                            ? 'text-secondary'
                            : 'text-primary'
                        }`}
                      >
                        {cmd.category === 'SIMULATION'
                          ? 'warning'
                          : cmd.category === 'AI_INTEL'
                          ? 'psychology'
                          : 'arrow_forward'}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface truncate">{cmd.title}</span>
                          {cmd.isLearned && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-secondary-container/30 border border-secondary/50 text-secondary font-bold animate-pulse">
                              LEARNED
                            </span>
                          )}
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded border ${
                              cmd.category === 'SIMULATION'
                                ? 'bg-error-container/20 border-error/30 text-error'
                                : cmd.category === 'AI_INTEL'
                                ? 'bg-secondary-container/20 border-secondary/30 text-secondary'
                                : 'bg-surface-container border-surface-container-highest text-outline'
                            }`}
                          >
                            {cmd.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-outline truncate">{cmd.description}</span>
                      </div>
                    </div>

                    {cmd.shortcut && (
                      <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-surface-container-lowest border border-surface-container-highest text-[10px] text-primary font-mono">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-outline text-3xl">search_off</span>
                <span className="text-outline text-xs">No direct commands found for "{query}"</span>
                <span className="text-[11px] text-primary">Press Enter to ask AI or type: learn "{query}" = "surveillance"</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Quick Reference */}
        <div className="p-3 bg-surface-container-lowest border-t border-surface-container-high/60 flex items-center justify-between font-mono text-[10px] text-outline">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Execute / Ask AI</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span>SELF-LEARNING CORE: ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
