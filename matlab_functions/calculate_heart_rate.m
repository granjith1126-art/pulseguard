function [heart_rate, peak_indices, ibi_ms] = calculate_heart_rate(processed_ppg, fs, fallback_hr)
% CALCULATE_HEART_RATE Derives instantaneous heart rate from processed PPG peaks.
%
% Inputs:
%   processed_ppg - 1D vector of normalized PPG samples in [0, 1] range
%   fs            - Sampling rate in Hz (default: 100)
%   fallback_hr   - Fallback HR if insufficient peaks are detected (default: 75)
%
% Outputs:
%   heart_rate    - Estimated heart rate in Beats Per Minute (BPM)
%   peak_indices  - 1-based sample indices of detected systolic peaks
%   ibi_ms        - Average inter-beat interval in milliseconds

if nargin < 2 || isempty(fs), fs = 100; end
if nargin < 3 || isempty(fallback_hr), fallback_hr = 75; end

N = length(processed_ppg);
if N < fs * 0.8
    heart_rate = fallback_hr;
    peak_indices = [];
    ibi_ms = 60000.0 / fallback_hr;
    return;
end

% Peak detection parameters
min_distance_samples = round(0.35 * fs); % Minimum 350ms between peaks (max 170 BPM)
threshold = mean(processed_ppg) + 0.15 * std(processed_ppg);
threshold = max(threshold, 0.45);

peak_indices = [];

for i = 2:(N - 1)
    if processed_ppg(i) > threshold && ...
       processed_ppg(i) > processed_ppg(i - 1) && ...
       processed_ppg(i) >= processed_ppg(i + 1)
   
        if isempty(peak_indices) || (i - peak_indices(end)) >= min_distance_samples
            peak_indices(end + 1) = i; %#ok<AGROW>
        elseif processed_ppg(i) > processed_ppg(peak_indices(end))
            % Replace previous peak if current is taller within refractory window
            peak_indices(end) = i;
        end
    end
end

if length(peak_indices) >= 2
    intervals_samples = diff(peak_indices);
    avg_interval_samples = median(intervals_samples);
    ibi_sec = avg_interval_samples / fs;
    ibi_ms = ibi_sec * 1000.0;
    
    calculated_hr = 60.0 / ibi_sec;
    % Clamp to physiological human boundaries (30 - 220 BPM)
    heart_rate = round(min(max(calculated_hr, 35), 210));
else
    heart_rate = fallback_hr;
    ibi_ms = 60000.0 / fallback_hr;
end

end
