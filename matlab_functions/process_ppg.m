function [processed_ppg, filtered_signal] = process_ppg(raw_ppg, fs)
% PROCESS_PPG Filters and conditions raw optical photoplethysmogram data.
%
% Inputs:
%   raw_ppg          - 1D vector of raw sensor ADC readings
%   fs               - Sampling frequency in Hz (default: 100)
%
% Outputs:
%   processed_ppg    - Normalized clean PPG waveform in [0, 1] range
%   filtered_signal  - Bandpass-filtered intermediate waveform

if nargin < 2 || isempty(fs), fs = 100; end

N = length(raw_ppg);
if N < 4
    processed_ppg = raw_ppg;
    filtered_signal = raw_ppg;
    return;
end

% 1. Detrend: Remove DC baseline offset
signal_ac = raw_ppg - mean(raw_ppg);

% 2. Digital Bandpass Filter (0.5 Hz to 5.0 Hz for heart rate spectrum)
% Approximate digital IIR bandpass or zero-phase filtering
low_cutoff = 0.5 / (fs / 2);
high_cutoff = 5.0 / (fs / 2);
high_cutoff = min(high_cutoff, 0.95);

if exist('butter', 'file') == 2 && exist('filtfilt', 'file') == 2
    [b, a] = butter(2, [low_cutoff, high_cutoff], 'bandpass');
    filtered_signal = filtfilt(b, a, signal_ac);
else
    % Fallback standard recursive difference filter for standalone MATLAB without toolboxes
    % Low-pass exponential moving average + high-pass baseline subtract
    alpha_hp = 0.98;
    alpha_lp = 0.35;
    
    hp_filtered = zeros(1, N);
    prev_x = signal_ac(1);
    prev_y = 0;
    for k = 2:N
        prev_y = alpha_hp * (prev_y + signal_ac(k) - prev_x);
        prev_x = signal_ac(k);
        hp_filtered(k) = prev_y;
    end
    
    filtered_signal = zeros(1, N);
    smooth = hp_filtered(1);
    for k = 1:N
        smooth = smooth + alpha_lp * (hp_filtered(k) - smooth);
        filtered_signal(k) = smooth;
    end
end

% 3. Normalize clean signal to [0, 1] scale with outlier clamping
sig_min = prctile_custom(filtered_signal, 2);
sig_max = prctile_custom(filtered_signal, 98);
span = sig_max - sig_min;

if span > 1e-6
    normalized = (filtered_signal - sig_min) / span;
    processed_ppg = min(max(normalized, 0.0), 1.0);
else
    processed_ppg = 0.5 * ones(1, N);
end

end

function p = prctile_custom(x, q)
    % Custom percentile helper independent of Statistics toolbox
    sx = sort(x);
    idx = max(1, min(length(sx), round(q / 100 * length(sx))));
    p = sx(idx);
end
