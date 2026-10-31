function vitals = generate_vitals(scenario, current_hr, current_spo2, current_temp)
% GENERATE_VITALS Generates comprehensive simulated vital signs matching the scenario.
%
% Inputs:
%   scenario      - 'NORMAL', 'WARNING', or 'CRITICAL'
%   current_hr    - Current or baseline heart rate (default: 76)
%   current_spo2  - Current or baseline SpO2 (default: 98.2)
%   current_temp  - Current or baseline temperature in °C (default: 36.8)
%
% Output:
%   vitals        - MATLAB struct with physiological telemetry parameters

if nargin < 1 || isempty(scenario), scenario = 'NORMAL'; end
if nargin < 2 || isempty(current_hr), current_hr = 76; end
if nargin < 3 || isempty(current_spo2), current_spo2 = 98.2; end
if nargin < 4 || isempty(current_temp), current_temp = 36.8; end

switch upper(scenario)
    case 'CRITICAL'
        % Severe tachycardia or bradycardia, hypoxemia, fever
        target_hr = 142 + round(randn() * 4);
        target_spo2 = 88.0 + round(randn() * 1.5 * 10) / 10;
        target_temp = 39.4 + round(randn() * 0.2 * 10) / 10;
        resp_rate = 28 + round(randn() * 2);
        pi_index = 0.8 + rand() * 0.4;
        sig_qual = 88 + round(rand() * 8);
        status = 'CRITICAL';
        
    case 'WARNING'
        % Borderline elevated heart rate, desaturation
        target_hr = 108 + round(randn() * 3);
        target_spo2 = 93.5 + round(randn() * 0.8 * 10) / 10;
        target_temp = 37.9 + round(randn() * 0.2 * 10) / 10;
        resp_rate = 22 + round(randn() * 1);
        pi_index = 1.4 + rand() * 0.5;
        sig_qual = 94 + round(rand() * 4);
        status = 'WARNING';
        
    otherwise
        % NORMAL: Baseline physiological equilibrium
        target_hr = 74 + round(randn() * 3);
        target_spo2 = 98.5 + round(randn() * 0.4 * 10) / 10;
        target_temp = 36.7 + round(randn() * 0.1 * 10) / 10;
        resp_rate = 16 + round(randn() * 1);
        pi_index = 2.4 + rand() * 0.8;
        sig_qual = 98 + round(rand() * 2);
        status = 'STABLE';
end

% Construct output struct
vitals = struct();
vitals.heart_rate = round(target_hr);
vitals.spo2 = min(100.0, max(75.0, round(target_spo2 * 10) / 10));
vitals.temperature = round(target_temp * 10) / 10;
vitals.respiration_rate = round(resp_rate);
vitals.perfusion_index = round(pi_index * 10) / 10;
vitals.signal_quality = round(sig_qual);
vitals.status = status;
vitals.scenario = upper(scenario);

end
