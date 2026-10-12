import React from 'react';

// Shimmer animation keyframes
const shimmerStyles = `
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #e5e7eb 0%,
    #f3f4f6 50%,
    #e5e7eb 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s linear infinite;
}
`;

// SkeletonCard - Wrapper card dengan shimmer background
export function SkeletonCard({ children, className = "" }) {
  return (
    <>
      <style>{shimmerStyles}</style>
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
        {children}
      </div>
    </>
  );
}

// SkeletonLine - Gray bar dengan rounded corners dan shimmer
export function SkeletonLine({ width = "100%", height = "16px", className = "" }) {
  return (
    <>
      <style>{shimmerStyles}</style>
      <div 
        className={`skeleton-shimmer rounded-md ${className}`}
        style={{ width, height }}
      />
    </>
  );
}

// SkeletonCircle - Circular skeleton untuk icon placeholder
export function SkeletonCircle({ size = "40px", className = "" }) {
  return (
    <>
      <style>{shimmerStyles}</style>
      <div 
        className={`skeleton-shimmer rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    </>
  );
}

// MetricCardSkeleton - Reusable skeleton untuk metric cards
export function MetricCardSkeleton({ borderColor = "border-blue-500" }) {
  return (
    <SkeletonCard className={`border-l-4 ${borderColor} overflow-hidden relative`}>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 rounded-full blur-xl opacity-30"></div>
      <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gray-100 rounded-full opacity-20"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Label */}
            <SkeletonLine width="50%" height="12px" />
            
            {/* Value */}
            <SkeletonLine width="70%" height="36px" className="mt-3" />
            
            {/* Description with badge */}
            <div className="flex items-center gap-2 mt-2">
              <SkeletonLine width="40%" height="14px" />
              <SkeletonLine width="20%" height="20px" className="rounded-full" />
            </div>
          </div>
          
          {/* Icon */}
          <SkeletonCircle size="48px" />
        </div>
      </div>
    </SkeletonCard>
  );
}