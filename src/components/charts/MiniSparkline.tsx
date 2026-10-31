import React from 'react';

interface MiniSparklineProps {
  data: number[];
  color?: 'green' | 'cyan' | 'rose' | 'amber' | 'purple';
  width?: number;
  height?: number;
  className?: string;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color = 'green',
  width = 64,
  height = 20,
  className = '',
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate SVG path coordinates
  const padding = 2;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * usableWidth;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  const colorMap = {
    green: {
      stroke: '#10b981',
      shadow: 'rgba(16, 185, 129, 0.4)',
    },
    cyan: {
      stroke: '#38bdf8',
      shadow: 'rgba(56, 189, 248, 0.4)',
    },
    rose: {
      stroke: '#f43f5e',
      shadow: 'rgba(244, 63, 94, 0.5)',
    },
    amber: {
      stroke: '#fbbf24',
      shadow: 'rgba(251, 191, 36, 0.4)',
    },
    purple: {
      stroke: '#c084fc',
      shadow: 'rgba(192, 132, 252, 0.4)',
    },
  };

  const selected = colorMap[color];

  return (
    <svg
      width={width}
      height={height}
      className={`inline-block overflow-visible ${className}`}
      style={{ filter: `drop-shadow(0 0 3px ${selected.shadow})` }}
    >
      <path
        d={pathD}
        fill="none"
        stroke={selected.stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
