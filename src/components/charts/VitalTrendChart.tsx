import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { GlassCard } from '../common/GlassCard';
import type { HistoricalVitalPoint, VitalSummaryStats } from '../../services/dataService';

interface VitalTrendChartProps {
  title: string;
  data: HistoricalVitalPoint[];
  dataKey: 'heartRate' | 'spo2' | 'temperature';
  color: 'rose' | 'cyan' | 'green';
  stats?: VitalSummaryStats;
  unit: string;
  minLimit?: number;
  maxLimit?: number;
  timeRangeLabel?: string;
  className?: string;
  showStatsHeader?: boolean;
}

export const VitalTrendChart: React.FC<VitalTrendChartProps> = ({
  title,
  data,
  dataKey,
  color,
  stats,
  unit,
  minLimit,
  maxLimit,
  timeRangeLabel = '1H',
  className = '',
  showStatsHeader = true,
}) => {
  const colorThemes = {
    rose: {
      stroke: '#f43f5e',
      fillStart: 'rgba(244, 63, 94, 0.35)',
      fillEnd: 'rgba(244, 63, 94, 0.0)',
      glow: 'rgba(244, 63, 94, 0.4)',
      text: 'text-rose-400',
    },
    cyan: {
      stroke: '#38bdf8',
      fillStart: 'rgba(56, 189, 248, 0.35)',
      fillEnd: 'rgba(56, 189, 248, 0.0)',
      glow: 'rgba(56, 189, 248, 0.4)',
      text: 'text-cyan-400',
    },
    green: {
      stroke: '#10b981',
      fillStart: 'rgba(16, 185, 129, 0.35)',
      fillEnd: 'rgba(16, 185, 129, 0.0)',
      glow: 'rgba(16, 185, 129, 0.4)',
      text: 'text-emerald-400',
    },
  };

  const theme = colorThemes[color];
  const gradientId = `gradient-${dataKey}-${Math.random().toString(36).substr(2, 9)}`;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 px-3 py-2 rounded-xl shadow-xl backdrop-blur-md">
          <div className="text-[11px] text-slate-400 font-mono mb-1">{label}</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.stroke }} />
            <span className="text-xs font-bold text-white">
              {payload[0].value} {unit}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <GlassCard className={`p-4 sm:p-5 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
            {title} ({timeRangeLabel})
          </h4>
        </div>

        {/* Stats indicators */}
        {showStatsHeader && stats && (
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>
              Avg: <strong className="text-slate-200">{stats.average}</strong>
            </span>
            <span>
              Min: <strong className="text-slate-200">{stats.min}</strong>
            </span>
            <span>
              Max: <strong className="text-slate-200">{stats.max}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Chart container */}
      <div className="w-full h-36 sm:h-44 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.stroke} stopOpacity={0.4} />
                <stop offset="95%" stopColor={theme.stroke} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(56, 189, 248, 0.1)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(56, 189, 248, 0.1)' }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />

            {minLimit !== undefined && (
              <ReferenceLine y={minLimit} stroke="rgba(244, 63, 94, 0.3)" strokeDasharray="3 3" />
            )}
            {maxLimit !== undefined && (
              <ReferenceLine y={maxLimit} stroke="rgba(244, 63, 94, 0.3)" strokeDasharray="3 3" />
            )}

            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={theme.stroke}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: '#fff', stroke: theme.stroke, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
};
