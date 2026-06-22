import React from 'react';

interface SkeletonLoaderProps {
  rows?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ rows = 4 }) => {
  return (
    <div className="space-y-4 w-full">
      <div className="h-8 bg-slate-800/40 rounded-lg w-1/4 shimmer-bg"></div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-12 bg-slate-800/40 rounded-lg w-full shimmer-bg"></div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonLoader;
