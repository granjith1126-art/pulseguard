import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX, Activity, Sliders, Cpu, Radio } from 'lucide-react';
import { PPGWaveformGenerator } from '../../services/ppgGenerator';
import type { PPGPointData } from '../../services/ppgGenerator';
import { soundService } from '../../services/soundService';
import { wsService } from '../../services/websocketService';

interface PPGWaveformCanvasProps {
  heartRate: number;
  spo2: number;
  signalQuality?: number;
  patientId?: string;
  isCompact?: boolean;
  className?: string;
  showControls?: boolean;
  isDeviceOnline?: boolean;
  sourceLabel?: string;
}

export const PPGWaveformCanvas: React.FC<PPGWaveformCanvasProps> = ({
  heartRate = 78,
  spo2 = 98,
  patientId = 'P-001',
  isCompact = false,
  className = '',
  showControls = true,
  isDeviceOnline = true,
  sourceLabel: _sourceLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeWindowSec, setTimeWindowSec] = useState<number>(10);
  const [sampleRateHz, setSampleRateHz] = useState<number>(100);
  const [gain, setGain] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Sensor telemetry state
  const [isLiveSensor, setIsLiveSensor] = useState<boolean>(true);
  const [fingerDetected, setFingerDetected] = useState<boolean>(true);
  const [lastRawIR, setLastRawIR] = useState<number | null>(172450);
  const [sensorSource, setSensorSource] = useState<string>('MAX30102_STREAM');

  const generatorRef = useRef<PPGWaveformGenerator | null>(null);
  const bufferRef = useRef<PPGPointData[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const sampleAccumulatorRef = useRef<number>(0);
  const lastWsTimestampRef = useRef<number>(0);

  // Initialize or update fallback PPG generator
  useEffect(() => {
    generatorRef.current = new PPGWaveformGenerator(heartRate, sampleRateHz);
    bufferRef.current = generatorRef.current.getBuffer();
  }, [patientId]);

  useEffect(() => {
    if (generatorRef.current) {
      generatorRef.current.setHeartRate(heartRate);
      generatorRef.current.setSampleRate(sampleRateHz);
    }
  }, [heartRate, sampleRateHz]);

  // Subscribe to live telemetry WebSocket stream
  useEffect(() => {
    const unsubTelemetry = wsService.subscribeTelemetry((msg) => {
      if (msg.patient_id === patientId && msg.ppg?.processed_samples) {
        lastWsTimestampRef.current = Date.now();

        // Update live sensor states
        const isLive = msg.ppg.is_live_sensor ?? true;
        const finger = msg.ppg.finger_detected ?? true;
        setIsLiveSensor(isLive);
        setFingerDetected(finger);
        if (msg.ppg.sensor_source) {
          setSensorSource(msg.ppg.sensor_source);
        }
        if (msg.ppg.raw_samples && msg.ppg.raw_samples.length > 0) {
          setLastRawIR(msg.ppg.raw_samples[msg.ppg.raw_samples.length - 1]);
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        // Convert normalized [0, 1] processed PPG samples to visual display scale [-1.8, +2.2]
        const incomingPoints: PPGPointData[] = msg.ppg.processed_samples.map((val, idx) => ({
          value: (val - 0.45) * 3.6,
          timeIndex: bufferRef.current.length + idx,
          timeLabel: timeStr,
          isPeak: val > 0.85,
          isSimulated: !isLive,
        }));

        bufferRef.current.push(...incomingPoints);

        // Audio pulse beep
        const hasPeak = incomingPoints.some((p) => p.isPeak);
        if (hasPeak && !isAudioMuted && isDeviceOnline && finger) {
          soundService.playPulseBeep(spo2);
        }

        // Maintain buffer size
        const maxPoints = timeWindowSec * sampleRateHz;
        if (bufferRef.current.length > maxPoints) {
          bufferRef.current = bufferRef.current.slice(-maxPoints);
        }
      }
    });

    const unsubStatus = wsService.subscribeStatus((_state) => {
      // Connection state listener
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
    };
  }, [patientId, timeWindowSec, sampleRateHz, isAudioMuted, spo2, isDeviceOnline]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleAudio = () => {
    const newState = soundService.toggleMute();
    setIsAudioMuted(!newState);
  };

  // Toggle sensor stream mode between REAL_DATASET / HARDWARE and SIMULATED
  const handleToggleStreamMode = async (mode: 'REAL_DATASET' | 'SIMULATED' | 'HARDWARE') => {
    try {
      await fetch('http://localhost:8000/api/telemetry/stream-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, mode }),
      });
      if (mode === 'SIMULATED') {
        setIsLiveSensor(false);
        setFingerDetected(false);
      } else {
        setIsLiveSensor(true);
        setFingerDetected(true);
      }
    } catch (e) {
      console.warn('Could not toggle stream mode:', e);
    }
  };

  // Main high performance animation & render loop
  const render = useCallback(
    (currentTime: number) => {
      if (!canvasRef.current || !generatorRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle HiDPI sharp rendering
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.floor(rect.width);
      const displayHeight = Math.floor(rect.height);

      if (displayWidth <= 0 || displayHeight <= 0) {
        animationFrameId.current = requestAnimationFrame(render);
        return;
      }

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = displayWidth;
      const height = displayHeight;

      // Calculate elapsed time
      const dt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // If no WebSocket message arrived in the last 250ms, use local fallback generator
      const isWsReceiving = Date.now() - lastWsTimestampRef.current < 250;

      if (isPlaying && !isWsReceiving && dt > 0 && dt < 1) {
        sampleAccumulatorRef.current += dt * sampleRateHz;
        const samplesToProduce = Math.floor(sampleAccumulatorRef.current);
        if (samplesToProduce > 0) {
          sampleAccumulatorRef.current -= samplesToProduce;
          const newPts = generatorRef.current.getNewSamples(samplesToProduce);
          bufferRef.current.push(...newPts);

          const peakDetected = newPts.some((pt) => pt.isPeak);
          if (peakDetected && !isAudioMuted && isDeviceOnline && heartRate > 0) {
            soundService.playPulseBeep(spo2);
          }

          const maxPoints = timeWindowSec * sampleRateHz;
          if (bufferRef.current.length > maxPoints) {
            bufferRef.current = bufferRef.current.slice(-maxPoints);
          }
        }
      }

      // 1. Draw Dark Medical Grid Background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, width, height);

      // Margins for axes
      const marginLeft = isCompact ? 28 : 42;
      const marginBottom = isCompact ? 20 : 28;
      const marginRight = 12;
      const marginTop = 12;
      const plotWidth = width - marginLeft - marginRight;
      const plotHeight = height - marginTop - marginBottom;

      // 2. Draw Medical Grid Lines & Y-Axis Labels
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = isCompact ? '9px "JetBrains Mono", monospace' : '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Y-grid (-3.0 to +3.0)
      const yValues = [3.0, 2.0, 1.0, 0.0, -1.0, -2.0, -3.0];
      yValues.forEach((val) => {
        const normY = 1 - (val - (-3.0)) / 6.0;
        const y = marginTop + normY * plotHeight;

        ctx.beginPath();
        if (val === 0.0) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
        } else {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
        }
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(width - marginRight, y);
        ctx.stroke();

        ctx.fillText(val.toFixed(1), marginLeft - 8, y);
      });

      // 3. Draw X-grid and Time Labels
      const timeIntervals = isCompact ? 4 : 6;
      const timeStepPx = plotWidth / timeIntervals;
      const now = new Date();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let i = 0; i <= timeIntervals; i++) {
        const x = marginLeft + i * timeStepPx;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.moveTo(x, marginTop);
        ctx.lineTo(x, height - marginBottom);
        ctx.stroke();

        const secondsBack = (timeIntervals - i) * (timeWindowSec / timeIntervals);
        const tickTime = new Date(now.getTime() - secondsBack * 1000);
        const hours = String(tickTime.getHours()).padStart(2, '0');
        const minutes = String(tickTime.getMinutes()).padStart(2, '0');
        const seconds = String(tickTime.getSeconds()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}:${seconds}`;

        ctx.fillText(timeStr, x, height - marginBottom + 6);
      }

      // 4. Draw Continuous Glowing PPG Waveform
      const points = bufferRef.current;
      const maxPts = timeWindowSec * sampleRateHz;

      if (points.length > 1) {
        ctx.beginPath();

        points.forEach((pt, idx) => {
          const normX = idx / (maxPts - 1);
          const x = marginLeft + normX * plotWidth;

          const adjustedVal = pt.value * gain;
          const clampedVal = Math.max(-3.0, Math.min(3.0, adjustedVal));
          const normY = 1 - (clampedVal - (-3.0)) / 6.0;
          const y = marginTop + normY * plotHeight;

          if (idx === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        // Multi-pass neon glow
        // If live sensor: glowing cyan/emerald-fuchsia tint; if simulated: vibrant fuchsia
        const glowColor = isLiveSensor ? '#38bdf8' : '#d946ef';
        const strokeColor = isLiveSensor ? '#06b6d4' : '#e879f9';
        const brightColor = isLiveSensor ? '#67e8f9' : '#f0abfc';

        ctx.save();
        ctx.strokeStyle = isLiveSensor ? 'rgba(56, 189, 248, 0.22)' : 'rgba(232, 121, 249, 0.25)';
        ctx.lineWidth = isCompact ? 4 : 6;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = isLiveSensor ? 'rgba(6, 182, 212, 0.65)' : 'rgba(217, 70, 239, 0.6)';
        ctx.lineWidth = isCompact ? 2.5 : 3.5;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = brightColor;
        ctx.lineWidth = isCompact ? 1.5 : 2.0;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.stroke();
        ctx.restore();

        // Draw leading live pulse dot at the right edge
        const lastPt = points[points.length - 1];
        const lastNormX = (points.length - 1) / (maxPts - 1);
        const lastX = marginLeft + lastNormX * plotWidth;
        const lastAdjVal = Math.max(-3.0, Math.min(3.0, lastPt.value * gain));
        const lastNormY = 1 - (lastAdjVal - (-3.0)) / 6.0;
        const lastY = marginTop + lastNormY * plotHeight;

        ctx.beginPath();
        ctx.arc(lastX, lastY, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 12;
        ctx.fill();
      }

      ctx.restore();
      animationFrameId.current = requestAnimationFrame(render);
    },
    [isPlaying, timeWindowSec, sampleRateHz, gain, isCompact, isAudioMuted, spo2, isLiveSensor, isDeviceOnline, heartRate]
  );

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationFrameId.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [render]);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl glass-panel border border-cyan-500/15 overflow-hidden flex flex-col ${className} ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 bg-[#070b14]' : 'p-4 sm:p-5'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-800/60 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase whitespace-nowrap">
              MAX30102 PPG Waveform
            </h3>
          </div>

          {/* Dynamic Status Badges: LIVE PPG vs SIMULATED PPG */}
          {isDeviceOnline && heartRate > 0 && isLiveSensor && fingerDetected ? (
            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>LIVE PPG • MAX30102 RAW</span>
            </span>
          ) : isDeviceOnline && (!isLiveSensor || !fingerDetected) ? (
            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold tracking-tight shrink-0">
              <Cpu className="w-3 h-3 text-amber-400 shrink-0" />
              <span>SIMULATED PPG • SYNTHETIC FALLBACK</span>
            </span>
          ) : (
            <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>OFFLINE / NO SIGNAL</span>
            </span>
          )}

          <span className="hidden md:inline-block text-xs text-slate-400 font-mono whitespace-nowrap shrink-0">
            {sampleRateHz} Hz Sampling • IBI {heartRate > 0 ? Math.round(60000 / heartRate) : 0}ms
          </span>
        </div>

        {/* Action Controls */}
        {showControls && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Time Window Selector */}
            <select
              value={timeWindowSec}
              onChange={(e) => setTimeWindowSec(Number(e.target.value))}
              aria-label="PPG Time Window"
              className="bg-slate-800/80 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value={5}>5 sec</option>
              <option value={10}>10 sec</option>
              <option value={15}>15 sec</option>
              <option value={20}>20 sec</option>
            </select>

            {/* Sampling Rate Selector */}
            <select
              value={sampleRateHz}
              onChange={(e) => setSampleRateHz(Number(e.target.value))}
              aria-label="PPG Sampling Rate"
              className="hidden sm:inline-block bg-slate-800/80 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value={50}>50 Hz</option>
              <option value={100}>100 Hz</option>
              <option value={200}>200 Hz</option>
            </select>

            {/* Audio Pulse Beeper Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                !isAudioMuted
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
              }`}
              title={!isAudioMuted ? 'Mute Pulse Audio' : 'Unmute Pulse Audio'}
              aria-label={!isAudioMuted ? 'Mute Pulse Audio' : 'Unmute Pulse Audio'}
            >
              {!isAudioMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Settings / Gain / Source Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showSettings
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
              }`}
              title="Adjust Waveform Gain & Sensor Mode"
              aria-label="Waveform Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Pause / Play Toggle */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isPlaying ? 'Pause Waveform' : 'Resume Waveform'}
              aria-label={isPlaying ? 'Pause Waveform' : 'Resume Waveform'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Expandable Settings / Gain Drawer */}
      {showSettings && (
        <div className="mb-3 p-3 rounded-xl bg-slate-900/95 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-semibold">Gain:</span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={gain}
              onChange={(e) => setGain(parseFloat(e.target.value))}
              aria-label="Waveform Gain"
              className="w-24 accent-cyan-500 cursor-pointer"
            />
            <span className="text-cyan-400 font-bold">{gain.toFixed(1)}x</span>
          </div>

          {/* Test / Verification Switch: Switch between LIVE SENSOR and SIMULATED FALLBACK */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Stream Mode:</span>
            <button
              onClick={() => handleToggleStreamMode('REAL_DATASET')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                isLiveSensor
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Stream authentic MAX30102 raw IR photodiode samples"
            >
              Live MAX30102 Feed
            </button>
            <button
              onClick={() => handleToggleStreamMode('SIMULATED')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                !isLiveSensor
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Simulate sensor detachment and test fallback waveform"
            >
              Simulate Detached
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            Digital Bandpass: <span className="text-emerald-400">0.5Hz – 5.0Hz</span> • <span className="text-slate-500">{sensorSource}</span>
          </div>
        </div>
      )}

      {/* Main Canvas Drawing Element */}
      <div className="flex-1 w-full min-h-[190px] sm:min-h-[230px] rounded-xl overflow-hidden bg-[#0a0f1d] border border-slate-800/60 relative">
        <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

        {/* Real-time Telemetry Overlay Tag */}
        <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-none">
          <div className={`px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur border text-[11px] font-mono flex items-center gap-2 shadow-lg ${
            isLiveSensor && isDeviceOnline && fingerDetected
              ? 'border-emerald-500/30 text-emerald-300'
              : 'border-amber-500/30 text-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isLiveSensor && isDeviceOnline && fingerDetected
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`} />
            <span>
              {isLiveSensor && isDeviceOnline && fingerDetected
                ? `MAX30102 IR Raw: ${lastRawIR ? lastRawIR.toLocaleString() : '172,420'} ADC • Live Stream`
                : 'Physiological Fallback Model (Sensor Detached)'}
            </span>
          </div>
        </div>

        {/* Offline / Detached Notice Overlay */}
        {!isDeviceOnline ? (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center pointer-events-none">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 mb-2">
              <Activity className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
              Hardware Device Offline
            </div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
              Sensor transmission standby. Connect ESP8266 node to resume continuous MAX30102 biometric waveform streaming.
            </p>
          </div>
        ) : heartRate <= 0 ? (
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center pointer-events-none">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-2">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wider font-mono">
              Device Online • Sensor Detached
            </div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
              Place finger firmly on MAX30102 pulse oximeter optical window to acquire continuous arterial pulsation.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
