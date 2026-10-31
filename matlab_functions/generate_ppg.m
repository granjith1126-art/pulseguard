function [raw_ppg, time_vector] = generate_ppg(target_hr, duration_sec, fs, scenario, noise_level)
% GENERATE_PPG Synthesizes a realistic physiological photoplethysmogram (PPG) waveform.
%
% Inputs:
%   target_hr     - Target heart rate in beats per minute (e.g. 72)
%   duration_sec  - Duration of the synthesized signal in seconds (e.g. 2.0)
%   fs            - Sampling frequency in Hz (e.g. 100)
%   scenario      - Simulation scenario: 'NORMAL', 'WARNING', or 'CRITICAL'
%   noise_level   - Noise scaling factor (default: 0.05)
%
% Output:
%   raw_ppg       - 1D vector of simulated raw optical PPG sensor values
%   time_vector   - Corresponding time stamps in seconds

if nargin < 1 || isempty(target_hr), target_hr = 75; end
if nargin < 2 || isempty(duration_sec), duration_sec = 2.0; end
if nargin < 3 || isempty(fs), fs = 100; end
if nargin < 4 || isempty(scenario), scenario = 'NORMAL'; end
if nargin < 5 || isempty(noise_level), noise_level = 0.04; end

% Adjust parameters based on clinical scenario
switch upper(scenario)
    case 'CRITICAL'
        target_hr = max(135, target_hr * 1.6); % Tachycardia
        noise_level = noise_level * 2.0;       % Vasoconstriction / motion noise
    case 'WARNING'
        target_hr = target_hr * 1.25;          % Elevated HR
        noise_level = noise_level * 1.3;
    otherwise
        % NORMAL
end

N = round(duration_sec * fs);
time_vector = (0:N-1) / fs;
raw_ppg = zeros(1, N);

% Inter-beat interval (seconds per beat)
ibi = 60.0 / target_hr;

% Pulse morphology parameters (Gaussian mixture model for systolic & diastolic waves)
% Component 1: Systolic peak
a1 = 1.0;
b1 = 0.18 * ibi;
c1 = 0.08 * ibi;

% Component 2: Dicrotic notch / reflection
a2 = 0.35;
b2 = 0.38 * ibi;
c2 = 0.07 * ibi;

% Component 3: Diastolic wave
a3 = 0.45;
b3 = 0.50 * ibi;
c3 = 0.12 * ibi;

% Synthesize pulse trains across the requested time window
num_pulses = ceil(duration_sec / ibi) + 2;
pulse_centers = (0:num_pulses-1) * ibi;

% Add heart-rate variability (HRV) jitter to pulse intervals
rng_state = rng;
jitter = (rand(1, num_pulses) - 0.5) * 0.03 * ibi;
pulse_centers = pulse_centers + jitter;

for i = 1:num_pulses
    t0 = pulse_centers(i);
    tau = time_vector - t0;
    
    % Dual Gaussian pulse with dicrotic wave
    p1 = a1 * exp(-((tau - b1) ./ c1).^2);
    p2 = a2 * exp(-((tau - b2) ./ c2).^2);
    p3 = a3 * exp(-((tau - b3) ./ c3).^2);
    
    pulse = p1 + 0.5 * p2 + p3;
    raw_ppg = raw_ppg + pulse;
end

% 1. Add Respiratory Induced Intensity Variation (RIIV baseline wander at ~0.25 Hz)
respiratory_freq = 0.25; % ~15 breaths per minute
baseline_wander = 0.12 * sin(2 * pi * respiratory_freq * time_vector + 0.3);

% 2. Add realistic optical sensor high-frequency noise
gaussian_noise = noise_level * randn(1, N);

% Combine and baseline offset
raw_ppg = raw_ppg + baseline_wander + gaussian_noise + 1.2;

% Normalize to realistic optical sensor ADC units (e.g. 40000 - 65000)
raw_ppg = raw_ppg * 12000 + 40000;

end
