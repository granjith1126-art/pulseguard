/**
 * Medical Monitor Audio Synthesizer
 * Uses Web Audio API to create authentic, pleasant patient monitor beeps
 * Frequency scales with SpO2 (higher pitch = higher O2, standard medical equipment behavior)
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = false;

  private initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isEnabled = !this.isEnabled;
    if (this.isEnabled) {
      this.initContext();
      this.playPulseBeep(98);
    }
    return this.isEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (this.isEnabled) {
      this.initContext();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Plays a short subtle pulse beep. Standard ICU tone pitch varies with SpO2 saturation:
   * 100% SpO2 -> 880 Hz (A5)
   * 90% SpO2  -> 660 Hz (E5)
   */
  public playPulseBeep(spo2: number = 98): void {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Pitch calculation based on oxygen saturation
      const clampedSpo2 = Math.max(80, Math.min(100, spo2));
      const freq = 440 + (clampedSpo2 - 80) * 22; // ~440Hz to ~880Hz

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      // Smooth attack and decay envelope to avoid clicking
      const now = this.audioCtx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.015); // gentle soft volume
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Audio context might fail on un-interacted browser policies
    }
  }

  public playAlarmBeep(isCritical: boolean = false): void {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      const freq = isCritical ? 980 : 660;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      const now = this.audioCtx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore audio policy errors
    }
  }
}

export const soundService = new SoundService();
