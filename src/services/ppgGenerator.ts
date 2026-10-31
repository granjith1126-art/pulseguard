/**
 * Physiological MAX30102 PPG Waveform Generator (Clinical Fallback Model)
 * Generates genuine optical photoplethysmogram waveforms with:
 * - Sharp anacrotic upward rise (systolic upstroke ~90-120 ms)
 * - Rounded systolic apex
 * - Gradual catacrotic downward curve
 * - Visible aortic valve dicrotic notch (incisura)
 * - Secondary diastolic reflection wave
 * - Non-linear diastolic decay runoff
 * - Respiratory Sinus Arrhythmia (natural beat-to-beat pulse interval variation)
 * - Respiratory-Induced Intensity Variation (stroke volume amplitude changes)
 * - Beat-to-beat contour micro-variations (every heartbeat is unique)
 * - Isoelectric smooth decay to baseline when heartRate <= 0
 */

export interface PPGPointData {
  timeIndex: number;
  timeLabel: string;
  value: number; // Amplitude normalized in visual range approx -1.8 to +2.4
  isPeak: boolean;
  isSimulated?: boolean;
}

export class PPGWaveformGenerator {
  private sampleRate: number = 100; // Hz
  private phase: number = 0; // 0 to 1 in current cardiac cycle
  private timeSeconds: number = 0;
  private respiratoryPhase: number = 0;
  private baseHR: number = 78;
  private currentHR: number = 78;
  private currentValue: number = 0;
  private noiseAmplitude: number = 0.025;
  private buffer: PPGPointData[] = [];
  private maxBufferSize: number = 1000; // 10 seconds at 100Hz

  // Beat-to-beat dynamic parameters (randomized per cardiac cycle)
  private currentBeatVariation: number = 1.0;
  private currentNotchDepth: number = 0.45;
  private currentDiasWaveAmp: number = 0.95;
  private currentUpstrokeSteepness: number = 0.055;

  constructor(initialHR: number = 78, sampleRate: number = 100) {
    this.baseHR = initialHR;
    this.currentHR = initialHR;
    this.sampleRate = sampleRate;
    this.initializeBuffer();
  }

  public setHeartRate(hr: number): void {
    this.baseHR = hr;
  }

  public setSampleRate(hz: number): void {
    this.sampleRate = hz;
  }

  private initializeBuffer(): void {
    const pointsNeeded = this.sampleRate * 10; // 10 seconds initial buffer
    const now = Date.now();
    for (let i = 0; i < pointsNeeded; i++) {
      const pointTime = new Date(now - (pointsNeeded - i) * (1000 / this.sampleRate));
      const pt = this.generateNextPoint(pointTime);
      this.buffer.push(pt);
    }
  }

  /**
   * Generates next PPG sample point with genuine optical morphology
   */
  public generateNextPoint(timestamp?: Date): PPGPointData {
    const dt = 1 / this.sampleRate;
    this.timeSeconds += dt;

    const timeObj = timestamp || new Date();
    const timeLabel = timeObj.toTimeString().split(' ')[0];

    // If heart rate is <= 0 (device offline / disconnected / sensor detached),
    // decay smoothly to isoelectric flatline at 0.0 baseline with no cliff drop.
    if (this.baseHR <= 0) {
      this.currentHR = 0;
      this.phase = 0;
      this.currentValue = this.currentValue * 0.92;
      const flatlineVal = Math.abs(this.currentValue) < 0.005 ? 0 : this.currentValue;
      return {
        timeIndex: this.timeSeconds,
        timeLabel,
        value: flatlineVal,
        isPeak: false,
        isSimulated: true,
      };
    }

    // 1. Natural HRV: Respiratory Sinus Arrhythmia (~14 breaths/min = 0.23 Hz)
    this.respiratoryPhase += dt * 0.23 * 2 * Math.PI;
    const rsa = Math.sin(this.respiratoryPhase) * 1.8 + Math.sin(this.timeSeconds * 0.06) * 0.8;
    this.currentHR = Math.max(35, Math.min(210, this.baseHR + rsa));

    const beatPeriod = 60 / this.currentHR; // Seconds per beat
    const phaseIncrement = dt / beatPeriod;

    // Detect transition to a new cardiac cycle -> update beat-to-beat variations
    const prevPhase = this.phase;
    this.phase = (this.phase + phaseIncrement) % 1.0;
    if (this.phase < prevPhase) {
      // New heartbeat started! Randomize subtle physiological parameters
      this.currentBeatVariation = 1.0 + (Math.random() - 0.5) * 0.12; // 12% stroke volume jitter
      this.currentNotchDepth = 0.40 + (Math.random() - 0.5) * 0.10;
      this.currentDiasWaveAmp = 0.90 + (Math.random() - 0.5) * 0.15;
      this.currentUpstrokeSteepness = 0.050 + (Math.random() - 0.5) * 0.010;
    }

    const phi = this.phase;

    // 2. Respiratory-Induced Intensity Variation (RIIV) on pulse height
    const riiv = 1.0 + 0.10 * Math.sin(this.respiratoryPhase + 0.35);
    const amplitudeScale = riiv * this.currentBeatVariation;

    // 3. Genuine Optical PPG Morphology Formulation:
    // (A) Systolic Upstroke: Sharp anacrotic rise peaking at phi = 0.14
    const w1 = phi < 0.14 ? this.currentUpstrokeSteepness : 0.075;
    const p1 = 2.45 * Math.exp(-Math.pow((phi - 0.14) / w1, 2));

    // (B) Dicrotic Notch (Incisura): Aortic valve snap closure at phi = 0.32
    const wNotch = 0.040;
    const pNotch = -this.currentNotchDepth * Math.exp(-Math.pow((phi - 0.32) / wNotch, 2));

    // (C) Secondary Diastolic Wave: Peripheral reflection peaking at phi = 0.40
    const w2 = 0.072;
    const p2 = this.currentDiasWaveAmp * Math.exp(-Math.pow((phi - 0.40) / w2, 2));

    // (D) Non-linear Diastolic Runoff: Exponential decay from phi = 0.45 down to baseline
    let diastolicRunoff = 0;
    if (phi > 0.45) {
      const decay = Math.exp(-(phi - 0.45) * 3.8);
      diastolicRunoff = 0.65 * decay - 0.85;
    } else {
      // Pre-dicrotic baseline connection
      diastolicRunoff = -0.20 * Math.cos(Math.PI * (phi / 0.45));
    }

    // (E) Slow respiratory baseline wander
    const baselineWander = 0.08 * Math.sin(this.respiratoryPhase);

    // (F) High-frequency optical photodiode noise
    const noise = (Math.random() - 0.5) * this.noiseAmplitude;

    // Combine pulse waveform
    const ppgValue = (p1 + pNotch + p2 + diastolicRunoff) * amplitudeScale + baselineWander + noise;
    this.currentValue = ppgValue;

    // Systolic peak detector for synchronous pulse beep
    const isPeak = Math.abs(phi - 0.14) < phaseIncrement * 0.85;

    return {
      timeIndex: this.timeSeconds,
      timeLabel,
      value: ppgValue,
      isPeak,
      isSimulated: true,
    };
  }

  /**
   * Produce new batch of points since last update
   */
  public getNewSamples(count: number): PPGPointData[] {
    const newPoints: PPGPointData[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const pt = this.generateNextPoint(now);
      this.buffer.push(pt);
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.shift();
      }
      newPoints.push(pt);
    }
    return newPoints;
  }

  public getBuffer(): PPGPointData[] {
    return [...this.buffer];
  }
}
