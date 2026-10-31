import React from 'react';
import { clsx } from 'clsx';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'glow' | 'danger' | 'warning';
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  hoverEffect = false,
  ...props
}) => {
  const variantStyles = {
    default: 'glass-panel',
    subtle: 'glass-panel-subtle',
    glow: 'glass-panel glass-panel-glow',
    danger: 'glass-panel glass-panel-danger-glow',
    warning: 'glass-panel glass-panel-warning-glow',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-300 relative overflow-hidden',
        variantStyles[variant],
        hoverEffect && 'hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
