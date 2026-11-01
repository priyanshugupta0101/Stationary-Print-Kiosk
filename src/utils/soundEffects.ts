/**
 * Web Audio API Sound Effects Engine for Customer Upload Panel
 * Zero external asset dependencies, instant response, works reliably offline.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('printshop_customer_sound_muted');
      this.muted = stored === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (typeof window !== 'undefined') {
      localStorage.setItem('printshop_customer_sound_muted', mute ? 'true' : 'false');
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Friendly pop sound when customer adds/drops documents
   */
  public playFileAdd() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // safe fallback
    }
  }

  /**
   * Soft descending tone when removing a file
   */
  public playFileRemove() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // safe fallback
    }
  }

  /**
   * Subtle tactile click when customer toggles options (B/W, Color, Duplex, copies)
   */
  public playOptionTick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.03);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // safe fallback
    }
  }

  /**
   * Celebratory multi-tone chime played when document upload succeeds
   * and 4-digit pickup OTP is generated!
   */
  public playSuccessChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Chime notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.35, vol: 0.22 },
        { freq: 659.25, time: 0.1, dur: 0.38, vol: 0.22 },
        { freq: 783.99, time: 0.2, dur: 0.45, vol: 0.25 },
        { freq: 1046.5, time: 0.32, dur: 0.65, vol: 0.28 },
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(vol, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * Satisfying pop & cheerful harmonic bell chime played when the
   * successful document upload pop-up animation triggers.
   */
  public playUploadSuccessPop() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Stage 1: Tactile bubble pop
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(300, now);
      popOsc.frequency.exponentialRampToValueAtTime(820, now + 0.05);

      popGain.gain.setValueAtTime(0.3, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      popOsc.connect(popGain);
      popGain.connect(ctx.destination);
      popOsc.start(now);
      popOsc.stop(now + 0.09);

      // Stage 2: Cheerful ascending major chime (E5 -> G#5 -> B5 -> E6)
      const chimeNotes = [
        { freq: 659.25, time: 0.07, dur: 0.28, vol: 0.2 },
        { freq: 830.61, time: 0.15, dur: 0.32, vol: 0.22 },
        { freq: 987.77, time: 0.23, dur: 0.36, vol: 0.24 },
        { freq: 1318.51, time: 0.32, dur: 0.55, vol: 0.28 },
      ];

      chimeNotes.forEach(({ freq, time, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(vol, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * Triumphant digital print pass & 4-digit OTP slip generation fanfare.
   * Features a tactile receipt dispenser click sequence followed by an iconic 4-tone
   * ascending slip chime (one chime corresponding to each of the 4 OTP digits).
   */
  public playOtpSlipSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Tactile ticket dispenser micro-clicks
      [0.0, 0.05].forEach((offset) => {
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(1400, now + offset);
        clickOsc.frequency.exponentialRampToValueAtTime(300, now + offset + 0.025);

        clickGain.gain.setValueAtTime(0.18, now + offset);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.03);

        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);

        clickOsc.start(now + offset);
        clickOsc.stop(now + offset + 0.03);
      });

      // 2. 4-Digit Pass Chime Fanfare: 4 distinctive ascending chimes
      // (Digit 1: 523.25 C5, Digit 2: 659.25 E5, Digit 3: 783.99 G5, Digit 4: 1046.50 C6)
      const digitChimes = [
        { freq: 523.25, time: 0.1, dur: 0.35, vol: 0.24 },
        { freq: 659.25, time: 0.22, dur: 0.38, vol: 0.26 },
        { freq: 783.99, time: 0.34, dur: 0.45, vol: 0.28 },
        { freq: 1046.5, time: 0.48, dur: 0.8, vol: 0.32 },
      ];

      digitChimes.forEach(({ freq, time, dur, vol }) => {
        // Main melodic bell
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(vol, now + time + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);

        // Harmonic shimmer overtone
        const shimmerOsc = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmerOsc.type = 'triangle';
        shimmerOsc.frequency.setValueAtTime(freq * 2, now + time);

        shimmerGain.gain.setValueAtTime(0.001, now + time);
        shimmerGain.gain.linearRampToValueAtTime(vol * 0.3, now + time + 0.02);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + time + dur * 0.6);

        shimmerOsc.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);

        shimmerOsc.start(now + time);
        shimmerOsc.stop(now + time + dur * 0.6);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * Crisp confirmation ping when OTP is copied
   */
  public playCopyPing() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // safe fallback
    }
  }

  /**
   * Sparkling magical chime played when switching Dark/Light theme mode
   */
  public playThemeToggle(isDark: boolean = true) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // If switching to dark mode: warm cosmic descending/ascending chime (F#5 -> A#5 -> C#6)
      // If switching to light mode: bright sunny ascending chime (E5 -> G#5 -> B5 -> E6)
      const freqs = isDark ? [740, 932, 1108] : [659, 830, 987, 1318];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);

        gain.gain.setValueAtTime(0.001, now + idx * 0.045);
        gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.045 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.16);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * Celebratory cash register / payment confirmation chime
   */
  public playPaymentSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 1. Double coin ding (tactile chime)
      [0.0, 0.07].forEach((delay, i) => {
        const coinOsc = ctx.createOscillator();
        const coinGain = ctx.createGain();
        coinOsc.type = 'sine';
        coinOsc.frequency.setValueAtTime(i === 0 ? 1200 : 1560, now + delay);
        coinGain.gain.setValueAtTime(0.2, now + delay);
        coinGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

        coinOsc.connect(coinGain);
        coinGain.connect(ctx.destination);
        coinOsc.start(now + delay);
        coinOsc.stop(now + delay + 0.12);
      });

      // 2. Ascending celebratory chord
      const chords = [523.25, 659.25, 783.99, 1046.5];
      chords.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + 0.12 + i * 0.06);

        gain.gain.setValueAtTime(0.001, now + 0.12 + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.12 + i * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + i * 0.06 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.12 + i * 0.06);
        osc.stop(now + 0.12 + i * 0.06 + 0.4);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * Joyful printer output / document ready chime for operator & customer
   */
  public playPrintReady() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [880, 1108, 1318];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.16, now + idx * 0.07 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.22);
      });
    } catch {
      // safe fallback
    }
  }

  /**
   * Subtle modern UI haptic click
   */
  public playButtonClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.02);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // safe fallback
    }
  }

  /**
   * Sound played on order status changes in Owner Desk
   */
  public playStatusChange(status?: string) {
    if (status === 'printed' || status === 'collected') {
      this.playPrintReady();
    } else {
      this.playOptionTick();
    }
  }

  /**
   * Sonar chirp played when searching or tracking a code
   */
  public playSearchDing() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.06);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // safe fallback
    }
  }
}

export const soundEffects = new SoundEngine();
