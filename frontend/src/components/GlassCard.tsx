import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel rounded-xl p-6 shadow-glass ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;
