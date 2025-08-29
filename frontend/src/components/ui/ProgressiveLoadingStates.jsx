// frontend/src/components/ui/ProgressiveLoadingStates.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonLoader } from './LoadingSkeleton.jsx';
import { ProgressiveLoader } from './MicroInteractions.jsx';

/**
 * Progressive Loading States for LokDarpan Dashboard
 * Provides smooth loading experiences with purposeful animations
 */

// Dashboard Content Skeleton with Progressive Loading
export const DashboardSkeleton = ({ 
  loadingStage = 'initial',
  className = '' 
}) => {
  const [currentStage, setCurrentStage] = useState('initial');
  
  useEffect(() => {
    const stages = ['initial', 'layout', 'data', 'complete'];
    const currentIndex = stages.indexOf(loadingStage);
    
    if (currentIndex > stages.indexOf(currentStage)) {
      const timer = setTimeout(() => {
        setCurrentStage(loadingStage);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setCurrentStage(loadingStage);
    }
  }, [loadingStage, currentStage]);
  
  return (
    <div className={`space-y-6 animate-fade-in ${className}`}>
      {/* Header Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex space-x-4">
          <SkeletonLoader width="120px" height="40px" className="rounded-md" />
          <SkeletonLoader width="150px" height="40px" className="rounded-md" />
          <SkeletonLoader width="200px" height="40px" className="rounded-md" />
        </div>
        
        {/* Progress indicator */}
        <ProgressiveLoader
          progress={currentStage === 'initial' ? 25 : currentStage === 'layout' ? 50 : currentStage === 'data' ? 75 : 100}
          label="Loading political intelligence dashboard..."
          color="blue"
          size="sm"
          animated
        />
      </motion.div>
      
      {/* Map and Summary Skeleton */}
      <AnimatePresence mode="wait">
        {currentStage !== 'initial' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            <div className="lg:col-span-7 xl:col-span-8 bg-white border rounded-md p-4">
              <SkeletonLoader height="360px" className="rounded-md" />
              <div className="mt-2 flex justify-between">
                <SkeletonLoader width="80px" height="20px" />
                <SkeletonLoader width="60px" height="20px" />
              </div>
            </div>
            <div className="lg:col-span-5 xl:col-span-4 bg-white border rounded-md p-4">
              <SkeletonLoader height="24px" className="mb-3" />
              <div className="space-y-3">
                <SkeletonLoader height="60px" />
                <SkeletonLoader height="40px" />
                <SkeletonLoader height="50px" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Charts Skeleton */}
      <AnimatePresence mode="wait">
        {currentStage === 'data' || currentStage === 'complete' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {[1, 2, 3, 4].map((index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border rounded-md p-4"
              >
                <SkeletonLoader width="200px" height="20px" className="mb-3" />
                <SkeletonLoader height="200px" className="mb-2" />
                <div className="flex justify-between">
                  <SkeletonLoader width="60px" height="16px" />
                  <SkeletonLoader width="80px" height="16px" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="bg-white border rounded-md p-4">
                <SkeletonLoader height="240px" />
              </div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Chart Loading State with Progressive Enhancement
export const ChartLoadingState = ({ 
  type = 'line',
  title,
  className = '',
  stage = 'loading'
}) => {
  const [animationStage, setAnimationStage] = useState('preparing');
  
  useEffect(() => {
    const sequence = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      setAnimationStage('structure');
      await new Promise(resolve => setTimeout(resolve, 400));
      if (stage === 'loaded') {
        setAnimationStage('data');
      }
    };
    sequence();
  }, [stage]);
  
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      {title && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4"
        >
          <SkeletonLoader width="160px" height="20px" />
        </motion.div>
      )}
      
      <div className="relative h-64">
        {type === 'line' && (
          <LineChartSkeleton stage={animationStage} />
        )}
        {type === 'bar' && (
          <BarChartSkeleton stage={animationStage} />
        )}
        {type === 'pie' && (
          <PieChartSkeleton stage={animationStage} />
        )}
      </div>
      
      {/* Loading progress indicator */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <SkeletonLoader width="80px" height="12px" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-500"
          >
            {animationStage === 'preparing' && 'Preparing chart...'}
            {animationStage === 'structure' && 'Loading structure...'}
            {animationStage === 'data' && 'Rendering data...'}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Line Chart Skeleton Animation
const LineChartSkeleton = ({ stage }) => (
  <div className="relative w-full h-full">
    {/* Axes */}
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: stage !== 'preparing' ? 1 : 0, scaleX: stage !== 'preparing' ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="absolute bottom-8 left-8 right-4 h-0.5 bg-gray-200 origin-left"
    />
    <motion.div
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: stage !== 'preparing' ? 1 : 0, scaleY: stage !== 'preparing' ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="absolute bottom-8 left-8 top-4 w-0.5 bg-gray-200 origin-bottom"
    />
    
    {/* Data lines */}
    <AnimatePresence>
      {stage === 'data' && (
        <>
          <motion.svg
            className="absolute inset-0 w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <motion.path
              d="M40 200 Q 80 150, 120 180 Q 160 120, 200 140 Q 240 100, 280 160"
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </motion.svg>
          
          {/* Data points */}
          {[40, 80, 120, 160, 200, 240, 280].map((x, index) => (
            <motion.div
              key={index}
              className="absolute w-2 h-2 bg-blue-500 rounded-full"
              style={{ 
                left: x - 4, 
                top: [200, 150, 180, 120, 140, 100, 160][index] - 4 
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            />
          ))}
        </>
      )}
    </AnimatePresence>
    
    {/* Grid lines */}
    {stage !== 'preparing' && (
      <div className="absolute inset-0 opacity-30">
        {[1, 2, 3, 4].map((line) => (
          <motion.div
            key={line}
            className="absolute left-8 right-4 h-px bg-gray-200"
            style={{ top: `${line * 25}%` }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 0.3, scaleX: 1 }}
            transition={{ delay: 0.3 + line * 0.1 }}
          />
        ))}
      </div>
    )}
  </div>
);

// Bar Chart Skeleton Animation
const BarChartSkeleton = ({ stage }) => (
  <div className="relative w-full h-full flex items-end justify-center space-x-3 p-8">
    {[40, 70, 30, 85, 60, 45, 90].map((height, index) => (
      <motion.div
        key={index}
        className="bg-blue-500 rounded-t"
        style={{ width: '24px' }}
        initial={{ height: 0, opacity: 0 }}
        animate={{ 
          height: stage === 'data' ? `${height}%` : stage === 'structure' ? '10px' : 0,
          opacity: stage !== 'preparing' ? 1 : 0
        }}
        transition={{ 
          delay: stage === 'data' ? index * 0.1 : 0,
          duration: 0.5,
          ease: "easeOut"
        }}
      />
    ))}
  </div>
);

// Pie Chart Skeleton Animation
const PieChartSkeleton = ({ stage }) => (
  <div className="relative w-full h-full flex items-center justify-center">
    <motion.svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: stage !== 'preparing' ? 1 : 0,
        scale: stage !== 'preparing' ? 1 : 0.8
      }}
      transition={{ duration: 0.5 }}
    >
      {stage === 'data' && (
        <>
          <motion.path
            d="M100,20 A80,80 0 0,1 180,100 L100,100 Z"
            fill="rgb(59, 130, 246)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.2 }}
          />
          <motion.path
            d="M180,100 A80,80 0 0,1 100,180 L100,100 Z"
            fill="rgb(16, 185, 129)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.4 }}
          />
          <motion.path
            d="M100,180 A80,80 0 0,1 20,100 L100,100 Z"
            fill="rgb(245, 158, 11)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.6 }}
          />
          <motion.path
            d="M20,100 A80,80 0 0,1 100,20 L100,100 Z"
            fill="rgb(239, 68, 68)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.8 }}
          />
        </>
      )}
      
      {stage === 'structure' && (
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="rgb(229, 231, 235)"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      )}
    </motion.svg>
  </div>
);

// Map Loading State
export const MapLoadingSkeleton = ({ 
  className = '',
  showControls = true 
}) => {
  return (
    <div className={`relative bg-gray-50 border rounded-md overflow-hidden ${className}`}>
      <div className="relative h-full min-h-[360px]">
        {/* Map content skeleton */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Polygon shapes simulation */}
          <div className="absolute inset-0 opacity-20">
            {[1, 2, 3, 4, 5, 6].map((shape, index) => (
              <motion.div
                key={shape}
                className="absolute bg-blue-200 rounded-lg"
                style={{
                  left: `${15 + (index % 3) * 30}%`,
                  top: `${20 + Math.floor(index / 3) * 40}%`,
                  width: `${20 + (index % 2) * 15}%`,
                  height: `${25 + (index % 3) * 10}%`
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.3 }}
                transition={{ delay: index * 0.2 }}
              />
            ))}
          </div>
          
          {/* Loading overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="bg-white/90 rounded-lg p-4 shadow-lg"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-gray-700">Loading ward boundaries...</span>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Map controls skeleton */}
        {showControls && (
          <motion.div
            className="absolute top-2 right-2 flex items-center gap-2 bg-white/80 backdrop-blur px-2 py-1 rounded-lg shadow"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <SkeletonLoader width="200px" height="32px" className="rounded" />
            <SkeletonLoader width="60px" height="32px" className="rounded" />
            <SkeletonLoader width="60px" height="32px" className="rounded" />
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Data Feed Loading State
export const DataFeedSkeleton = ({ 
  itemCount = 5,
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <motion.div
          key={index}
          className="bg-white border rounded-lg p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-start space-x-3">
            <SkeletonLoader width="40px" height="40px" rounded />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-start">
                <SkeletonLoader width="120px" height="16px" />
                <SkeletonLoader width="60px" height="14px" />
              </div>
              <SkeletonLoader height="14px" />
              <SkeletonLoader width="80%" height="14px" />
              <div className="flex space-x-2 pt-1">
                <SkeletonLoader width="50px" height="20px" className="rounded-full" />
                <SkeletonLoader width="60px" height="20px" className="rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Component Loading Overlay
export const ComponentLoadingOverlay = ({ 
  message = 'Loading component...',
  progress,
  className = '' 
}) => {
  return (
    <motion.div
      className={`absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center space-y-4 max-w-sm mx-auto p-6">
        <motion.div
          className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        />
        
        <motion.p
          className="text-sm font-medium text-gray-700"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {message}
        </motion.p>
        
        {typeof progress === 'number' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <ProgressiveLoader
              progress={progress}
              size="sm"
              color="blue"
              animated
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default {
  DashboardSkeleton,
  ChartLoadingState,
  MapLoadingSkeleton,
  DataFeedSkeleton,
  ComponentLoadingOverlay
};