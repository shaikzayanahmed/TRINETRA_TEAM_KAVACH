/**
 * TRINETRA Tactical Audio Alarm & Synthesizer Service
 * Uses HTML5 Web Audio API (Zero external audio file dependencies, 100% reliable offline/online)
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Load muted preference from localStorage
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('trinetra_audio_muted');
        if (stored !== null) {
          this.muted = stored === 'true';
        }
      }
    } catch (e) {}

    // Attach global breach event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('trinetra_live_breach', () => {
        this.playBreachAlarm();
      });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('trinetra_audio_muted', String(muted));
      }
    } catch (e) {}
  }

  public toggleMute(): boolean {
    const next = !this.muted;
    this.setMuted(next);
    if (!next) {
      // Play a quick confirmation beep
      this.playWarningBeep();
    }
    return next;
  }

  /**
   * Plays a high-priority military breach siren (dual-tone pulsed alarm)
   */
  public playBreachAlarm() {
    if (this.muted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Pulse 1
      this.createAlarmPulse(ctx, now, 960, 1280, 0.18);
      // Pulse 2
      this.createAlarmPulse(ctx, now + 0.22, 960, 1280, 0.18);
      // Pulse 3
      this.createAlarmPulse(ctx, now + 0.44, 960, 1280, 0.25);
    } catch (e) {
      console.warn('[SoundService] Audio playback warning:', e);
    }
  }

  private createAlarmPulse(ctx: AudioContext, startTime: number, freq1: number, freq2: number, duration: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq1, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq2, startTime + duration * 0.7);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Single subtle tactical radar / attention chirp
   */
  public playWarningBeep() {
    if (this.muted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }
}

export const soundService = new SoundService();
