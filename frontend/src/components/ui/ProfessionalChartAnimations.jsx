import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis, Legend, BarChart, Bar, Cell } from 'recharts';

/**
 * Professional Chart Animation Suite for LokDarpan
 * High-performance animated charts with accessibility and smooth transitions
 * Optimized for political intelligence data visualization
 */

// Professional Chart Wrapper with Animation State Management
export const AnimatedChartContainer = ({ 
  children, 
  loading = false,
  error = null,
  className = '',
  animationDuration = 800,
  staggerDelay = 50,
  onAnimationComplete,
  ...props 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('idle');
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Intersection Observer for performance optimization
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          setAnimationPhase('entering');
          setIsAnimating(true);
          
          // Start animation sequence
          setTimeout(() => {
            setAnimationPhase('active');
            setTimeout(() => {
              setIsAnimating(false);
              setAnimationPhase('complete');
              onAnimationComplete?.();
            }, animationDuration);
          }, 100);
        }
      },
      { threshold: 0.1, rootMargin: '20px' }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [animationDuration, isVisible, onAnimationComplete]);
  
  const containerClasses = useMemo(() => {
    const baseClasses = `chart-professional-container transition-all duration-${animationDuration} ease-out ${className}`;
    
    switch (animationPhase) {
      case 'entering':
        return `${baseClasses} opacity-0 scale-95 translate-y-4`;
      case 'active':
      case 'complete':
        return `${baseClasses} opacity-100 scale-100 translate-y-0`;
      default:
        return `${baseClasses} opacity-0 scale-95 translate-y-4`;
    }
  }, [animationPhase, animationDuration, className]);
  
  return (
    <div
      ref={containerRef}
      className={containerClasses}
      data-animation-phase={animationPhase}
      data-animating={isAnimating}
      {...props}
    >
      {isVisible && children}
    </div>
  );
};

// Professional Animated Line Chart
export const ProfessionalLineChart = ({
  data = [],
  lines = [],
  loading = false,
  animationDuration = 800,
  staggerDelay = 100,
  className = '',
  height = 300,
  margin = { top: 5, right: 20, left: 10, bottom: 5 },
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  responsive = true,
  ...props
}) => {
  const [animatedLines, setAnimatedLines] = useState([]);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const animationTimeoutRef = useRef(null);
  
  // Staggered line animation
  useEffect(() => {
    if (!data.length || !lines.length) return;
    
    setAnimatedLines([]);
    setActiveLineIndex(0);
    
    const animateNextLine = (index) => {
      if (index < lines.length) {
        setAnimatedLines(prev => [...prev, lines[index]]);
        setActiveLineIndex(index);
        
        animationTimeoutRef.current = setTimeout(() => {
          animateNextLine(index + 1);
        }, staggerDelay);
      }
    };
    
    // Start animation after a brief delay
    animationTimeoutRef.current = setTimeout(() => {
      animateNextLine(0);
    }, 200);
    
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [data, lines, staggerDelay]);
  
  const ChartComponent = responsive ? ResponsiveContainer : 'div';
  const chartProps = responsive 
    ? { width: '100%', height: '100%' }
    : { width: '100%', height };
  
  return (
    <AnimatedChartContainer 
      className={`h-${height === 300 ? '72' : '64'} ${className}`}
      animationDuration={animationDuration}
    >
      <ChartComponent {...chartProps}>
        <LineChart data={data} margin={margin} {...props}>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb" 
              strokeOpacity={0.5}
              className="animate-fade-in-scale"
            />
          )}
          
          <XAxis 
            dataKey="date" 
            minTickGap={20}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={{ stroke: '#d1d5db' }}
            className="animate-slide-in-up"
            style={{ animationDelay: '200ms' }}
          />
          
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={{ stroke: '#d1d5db' }}
            className="animate-slide-in-right"
            style={{ animationDelay: '300ms' }}
          />
          
          <YAxis 
            yAxisId="right" 
            orientation="right"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={{ stroke: '#d1d5db' }}
            className="animate-slide-in-right"
            style={{ animationDelay: '350ms' }}
          />
          
          {showTooltip && (
            <Tooltip 
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#374151', fontWeight: '500' }}
            />
          )}
          
          {showLegend && (
            <Legend 
              wrapperStyle={{ 
                fontSize: '12px',
                color: '#6b7280',
                paddingTop: '10px'
              }}
              className="animate-fade-in-scale"
              style={{ animationDelay: '600ms' }}
            />
          )}
          
          {animatedLines.map((line, index) => (
            <Line
              key={`${line.dataKey}-${index}`}
              yAxisId={line.yAxisId || 'left'}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={line.strokeWidth || 2}
              dot={line.showDots ? { r: 3, strokeWidth: 2, fill: line.color } : false}
              activeDot={{ 
                r: 6, 
                strokeWidth: 2, 
                fill: line.color,
                className: 'animate-pulse-enhanced'
              }}
              name={line.name}
              strokeDasharray={index === activeLineIndex ? '1000' : undefined}
              strokeDashoffset={index === activeLineIndex ? '1000' : undefined}
              className="chart-line-professional"
              style={{
                animation: index <= activeLineIndex 
                  ? `line-draw ${animationDuration}ms ease-out forwards`
                  : 'none',
                animationDelay: `${index * staggerDelay}ms`
              }}
            />
          ))}
        </LineChart>
      </ChartComponent>
    </AnimatedChartContainer>
  );
};

// Professional Animated Bar Chart
export const ProfessionalBarChart = ({
  data = [],
  bars = [],
  loading = false,
  animationDuration = 800,
  staggerDelay = 50,
  className = '',
  height = 300,
  margin = { top: 20, right: 30, left: 20, bottom: 5 },
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  responsive = true,
  colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  ...props
}) => {
  const [animatedBars, setAnimatedBars] = useState([]);
  const [activeBarIndex, setActiveBarIndex] = useState(0);
  const animationTimeoutRef = useRef(null);
  
  // Staggered bar animation
  useEffect(() => {
    if (!data.length || !bars.length) return;
    
    setAnimatedBars([]);
    setActiveBarIndex(0);
    
    const animateNextBar = (index) => {
      if (index < bars.length) {
        setAnimatedBars(prev => [...prev, bars[index]]);
        setActiveBarIndex(index);
        
        animationTimeoutRef.current = setTimeout(() => {
          animateNextBar(index + 1);
        }, staggerDelay);
      }
    };
    
    animationTimeoutRef.current = setTimeout(() => {
      animateNextBar(0);
    }, 200);
    
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [data, bars, staggerDelay]);
  
  const ChartComponent = responsive ? ResponsiveContainer : 'div';
  const chartProps = responsive 
    ? { width: '100%', height: '100%' }
    : { width: '100%', height };
  
  return (
    <AnimatedChartContainer 
      className={`h-${height === 300 ? '72' : '64'} ${className}`}
      animationDuration={animationDuration}
    >
      <ChartComponent {...chartProps}>
        <BarChart data={data} margin={margin} {...props}>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb" 
              strokeOpacity={0.5}
              className="animate-fade-in-scale"
            />
          )}
          
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={{ stroke: '#d1d5db' }}
            className="animate-slide-in-up"
            style={{ animationDelay: '200ms' }}
          />
          
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={{ stroke: '#d1d5db' }}
            className="animate-slide-in-right"
            style={{ animationDelay: '300ms' }}
          />
          
          {showTooltip && (
            <Tooltip 
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#374151', fontWeight: '500' }}
            />
          )}
          
          {showLegend && (
            <Legend 
              wrapperStyle={{ 
                fontSize: '12px',
                color: '#6b7280',
                paddingTop: '10px'
              }}
              className="animate-fade-in-scale"
              style={{ animationDelay: '600ms' }}
            />
          )}
          
          {animatedBars.map((bar, index) => (
            <Bar
              key={`${bar.dataKey}-${index}`}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color || colorPalette[index % colorPalette.length]}
              className="chart-bar-professional"
              style={{
                animation: index <= activeBarIndex 
                  ? `bar-grow-professional ${animationDuration}ms ease-out forwards`
                  : 'none',
                animationDelay: `${(index * staggerDelay) + 400}ms`
              }}
            >
              {data.map((entry, cellIndex) => (
                <Cell 
                  key={`cell-${cellIndex}`}
                  fill={bar.color || colorPalette[index % colorPalette.length]}
                  className="hover:opacity-80 transition-opacity duration-200"
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ChartComponent>
    </AnimatedChartContainer>
  );
};

// Professional Chart Loading Placeholder
export const ChartLoadingPlaceholder = ({
  type = 'line',
  height = 300,
  className = '',
  showShimmer = true
}) => {
  return (
    <div className={`h-${height === 300 ? '72' : '64'} ${className}`}>
      <div className="w-full h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 relative overflow-hidden">
        {showShimmer && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 animate-shimmer" />
        )}
        
        {/* Chart type specific placeholder */}
        <div className="absolute inset-4">
          {type === 'line' ? (
            <div className="h-full flex items-end space-x-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div 
                  key={i}
                  className="flex-1 bg-gray-200 rounded-sm animate-pulse"
                  style={{ 
                    height: `${Math.random() * 60 + 20}%`,
                    animationDelay: `${i * 100}ms`
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex items-end justify-center space-x-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div 
                  key={i}
                  className="w-8 bg-gray-200 rounded-sm animate-pulse"
                  style={{ 
                    height: `${Math.random() * 80 + 20}%`,
                    animationDelay: `${i * 150}ms`
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Loading indicator */}
        <div className="absolute top-2 right-2">
          <div className="bg-white/90 backdrop-blur rounded px-2 py-1 text-xs text-gray-600 font-medium flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Loading chart...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memory-optimized Chart Data Manager
export const useChartDataManager = (rawData, transformFn, dependencies = []) => {
  const [processedData, setProcessedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(null);
  const cacheRef = useRef(new Map());
  
  const processData = useCallback(async () => {
    if (!rawData || rawData.length === 0) {
      setProcessedData([]);
      return;
    }
    
    // Create cache key
    const cacheKey = JSON.stringify({ rawData, dependencies });
    
    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      setProcessedData(cacheRef.current.get(cacheKey));
      return;
    }
    
    setIsProcessing(true);
    
    // Process data in chunks to prevent blocking
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < rawData.length; i += chunkSize) {
      chunks.push(rawData.slice(i, i + chunkSize));
    }
    
    let processedResult = [];\n    
    for (const chunk of chunks) {\n      const chunkResult = await new Promise(resolve => {\n        processingRef.current = setTimeout(() => {\n          const result = transformFn ? transformFn(chunk) : chunk;\n          resolve(result);\n        }, 0);\n      });\n      \n      processedResult = processedResult.concat(chunkResult);\n    }\n    \n    // Cache the result\n    cacheRef.current.set(cacheKey, processedResult);\n    \n    // Limit cache size\n    if (cacheRef.current.size > 10) {\n      const firstKey = cacheRef.current.keys().next().value;\n      cacheRef.current.delete(firstKey);\n    }\n    \n    setProcessedData(processedResult);\n    setIsProcessing(false);\n  }, [rawData, transformFn, dependencies]);\n  \n  useEffect(() => {\n    processData();\n    \n    return () => {\n      if (processingRef.current) {\n        clearTimeout(processingRef.current);\n      }\n    };\n  }, [processData]);\n  \n  return {\n    data: processedData,\n    isProcessing,\n    refresh: processData,\n    clearCache: () => cacheRef.current.clear()\n  };\n};\n\n// Export all components\nexport default {\n  AnimatedChartContainer,\n  ProfessionalLineChart,\n  ProfessionalBarChart,\n  ChartLoadingPlaceholder,\n  useChartDataManager\n};