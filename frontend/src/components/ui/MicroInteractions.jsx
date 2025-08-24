import React, { useState, useRef, useEffect } from 'react';

/**
 * Professional Micro-Interactions Component Library
 * Designed for LokDarpan political intelligence dashboard
 * Enhances UX with purposeful, accessible animations
 */

// Professional Hover Enhancement Wrapper
export const ProfessionalHover = ({ 
  children, 
  intensity = 'subtle',
  disabled = false,
  className = '',
  ...props 
}) => {
  const intensityClasses = {
    subtle: 'hover-professional transform transition-all duration-200 ease-out hover:scale-[1.01] hover:shadow-sm',
    moderate: 'transform transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-md hover:-translate-y-0.5',
    strong: 'transform transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:-translate-y-1'
  };
  
  if (disabled) {
    return <div className={`opacity-50 cursor-not-allowed ${className}`} {...props}>{children}</div>;
  }
  
  return (
    <div className={`${intensityClasses[intensity]} ${className}`} {...props}>
      {children}
    </div>
  );
};

// Professional Focus Management
export const FocusEnhanced = ({ 
  children, 
  focusColor = 'blue',
  className = '',
  onFocus,
  onBlur,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const focusColors = {
    blue: 'focus-visible:outline-blue-500 focus-visible:ring-blue-500',
    green: 'focus-visible:outline-green-500 focus-visible:ring-green-500',
    red: 'focus-visible:outline-red-500 focus-visible:ring-red-500',
    yellow: 'focus-visible:outline-yellow-500 focus-visible:ring-yellow-500'
  };
  
  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };
  
  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };
  
  return React.cloneElement(children, {
    className: `${children.props.className || ''} focus-professional transition-all duration-150 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-opacity-50 ${focusColors[focusColor]} ${className}`,
    onFocus: handleFocus,
    onBlur: handleBlur,
    'data-focused': isFocused,
    ...props
  });
};

// Professional Press Feedback
export const PressEffectWrapper = ({ 
  children, 
  feedbackType = 'scale',
  disabled = false,
  className = '',
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const feedbackClasses = {
    scale: 'active:scale-95 active:transform',
    push: 'active:translate-y-0.5 active:shadow-inner',
    glow: 'active:ring-2 active:ring-blue-500 active:ring-opacity-50'
  };
  
  if (disabled) {
    return <div className={`opacity-50 cursor-not-allowed ${className}`} {...props}>{children}</div>;
  }
  
  return (
    <div
      className={`transition-transform duration-100 ease-out ${feedbackClasses[feedbackType]} ${className}`}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      data-pressed={isPressed}
      {...props}
    >
      {children}
    </div>
  );
};

// Ripple Effect Component
export const RippleEffect = ({ 
  children, 
  color = 'rgba(59, 130, 246, 0.3)',
  duration = 600,
  className = '',
  disabled = false,
  ...props 
}) => {
  const [ripples, setRipples] = useState([]);
  const containerRef = useRef(null);
  
  const createRipple = (event) => {
    if (disabled) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;
    
    const newRipple = {
      x: x - size / 2,
      y: y - size / 2,
      size,
      id: Date.now() + Math.random()
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, duration);
  };
  
  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onClick={createRipple}
      {...props}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none animate-ping rounded-full opacity-30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animationDuration: `${duration}ms`,
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      ))}
    </div>
  );
};

// Professional Tooltip with Micro-Interactions
export const ProfessionalTooltip = ({ 
  children, 
  content, 
  position = 'top',
  delay = 500,
  className = '',
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const timeoutRef = useRef(null);
  
  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };
  
  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setTimeout(() => setIsReady(true), 50);
    }, delay);
  };
  
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsReady(false);
    setTimeout(() => setIsVisible(false), 100);
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
      {isVisible && (
        <div 
          className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg pointer-events-none transition-all duration-200 ease-out ${
            isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          } ${positions[position]}`}
        >
          {content}
          <div 
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1' :
              'right-full top-1/2 -translate-y-1/2 translate-x-1'
            }`}
          />
        </div>
      )}
    </div>
  );
};

// Floating Action Button with Professional Micro-Interactions
export const FloatingActionButton = ({ 
  children, 
  onClick,
  size = 'md',
  color = 'blue',
  disabled = false,
  className = '',
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  };
  
  const colors = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25',
    green: 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/25',
    red: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25'
  };
  
  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };
  
  return (
    <button
      className={`
        ${sizes[size]} ${colors[color]} ${className}
        rounded-full flex items-center justify-center
        transition-all duration-200 ease-out
        shadow-lg hover:shadow-xl
        ${isHovered ? 'scale-110 -translate-y-1' : 'scale-100'}
        ${isPressed ? 'scale-95' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus-professional
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Progressive Loading Indicator with Micro-Interactions
export const ProgressiveLoader = ({ 
  progress = 0,
  label,
  size = 'md',
  color = 'blue',
  showPercentage = true,
  animated = true,
  className = '',
  ...props 
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };
  
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600'
  };
  
  return (
    <div className={`w-full ${className}`} {...props}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700 animate-fade-in-scale">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500 tabular-nums">
              {Math.round(displayProgress)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizes[size]} overflow-hidden`}>
        <div 
          className={`
            ${sizes[size]} ${colors[color]} rounded-full
            transition-all duration-500 ease-out
            ${animated ? 'animate-shimmer' : ''}
          `}
          style={{ 
            width: `${Math.min(Math.max(displayProgress, 0), 100)}%`,
            backgroundImage: animated ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' : undefined,
            backgroundSize: animated ? '200px 100%' : undefined,
            animation: animated ? 'shimmer 2s infinite' : undefined
          }}
        />
      </div>
    </div>
  );
};

// Card Enhancement Wrapper
export const EnhancedCard = ({ 
  children,
  hoverable = true,
  clickable = false,
  glowOnHover = false,
  className = '',
  onClick,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className={`
        ${className}
        transition-all duration-200 ease-out
        ${hoverable ? 'hover-professional' : ''}
        ${clickable ? 'cursor-pointer press-professional' : ''}
        ${glowOnHover && isHovered ? 'animate-subtle-glow' : ''}
        ${clickable ? 'focus-professional' : ''}
      `}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

// Staggered Animation Container
export const StaggeredContainer = ({ 
  children, 
  staggerDelay = 100,
  animation = 'fade-up',
  className = '',
  ...props 
}) => {
  const animations = {
    'fade-up': 'progressive-load-item',
    'fade-in': 'animate-fade-in-scale',
    'slide-right': 'animate-slide-in-right'
  };
  
  return (
    <div className={`progressive-load-container ${className}`} {...props}>
      {React.Children.map(children, (child, index) => 
        React.cloneElement(child, {
          className: `${child.props.className || ''} ${animations[animation]}`,
          style: {
            ...child.props.style,
            animationDelay: `${index * staggerDelay}ms`
          }
        })
      )}
    </div>
  );
};

// Export all components
export default {
  ProfessionalHover,
  FocusEnhanced,
  PressEffectWrapper,
  RippleEffect,
  ProfessionalTooltip,
  FloatingActionButton,
  ProgressiveLoader,
  EnhancedCard,
  StaggeredContainer
};