// frontend/src/components/ui/EnhancedAccessibility.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced Accessibility Components for LokDarpan Dashboard
 * Ensures WCAG 2.1 AA compliance with improved user experience
 */

// Skip Link Component for Keyboard Navigation
export const SkipLink = ({ 
  href = '#main-content',
  text = 'Skip to main content',
  className = '' 
}) => {
  return (
    <a
      href={href}
      className={`
        absolute top-0 left-0 z-50 px-4 py-2 bg-blue-600 text-white font-medium
        transform -translate-y-full focus:translate-y-0
        transition-transform duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
    >
      {text}
    </a>
  );
};

// Screen Reader Only Text
export const ScreenReaderOnly = ({ 
  children,
  as: Component = 'span',
  className = '' 
}) => {
  return (
    <Component
      className={`sr-only ${className}`}
    >
      {children}
    </Component>
  );
};

// Live Region for Dynamic Content Announcements
export const LiveRegion = ({ 
  children,
  priority = 'polite',
  atomic = false,
  className = '' 
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className={`sr-only ${className}`}
    >
      {children}
    </div>
  );
};

// Enhanced Button with Full Accessibility Support
export const AccessibleButton = ({ 
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  ariaLabel,
  ariaDescribedBy,
  className = '',
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setIsPressed(true);
      onClick?.(e);
    }
  };
  
  const handleKeyUp = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      setIsPressed(false);
    }
  };
  
  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-md font-medium
        transition-all duration-200 transform
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${variants[variant]}
        ${sizes[size]}
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${isFocused ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${className}
      `}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          <ScreenReaderOnly>Loading</ScreenReaderOnly>
        </>
      )}
      {children}
    </button>
  );
};

// Enhanced Form Field with Full Accessibility
export const AccessibleFormField = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  help,
  required = false,
  disabled = false,
  placeholder,
  className = '',
  inputClassName = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  const helpId = help ? `${id}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;
  
  return (
    <div className={`space-y-1 ${className}`}>
      <label
        htmlFor={id}
        className={`
          block text-sm font-medium transition-colors duration-200
          ${error ? 'text-red-700' : isFocused ? 'text-blue-700' : 'text-gray-700'}
          ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
        `}
      >
        {label}
      </label>
      
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`
            w-full px-3 py-2 border rounded-md transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${error 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300'
            }
            ${inputClassName}
          `}
          {...props}
        />
        
        {/* Focus indicator */}
        <div
          className={`
            absolute inset-0 rounded-md pointer-events-none border-2 transition-opacity duration-200
            ${isFocused && !error ? 'border-blue-500 opacity-100' : 'opacity-0'}
          `}
        />
      </div>
      
      {help && (
        <p id={helpId} className="text-sm text-gray-600">
          {help}
        </p>
      )}
      
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

// Accessible Select Component
export const AccessibleSelect = ({
  id,
  label,
  value,
  onChange,
  options = [],
  error,
  help,
  required = false,
  disabled = false,
  placeholder = 'Select an option...',
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef(null);
  const listRef = useRef(null);
  
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectedOption = options.find(option => option.value === value);
  
  const errorId = error ? `${id}-error` : undefined;
  const helpId = help ? `${id}-help` : undefined;
  const listboxId = `${id}-listbox`;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;
  
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        } else {
          setIsOpen(true);
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          onChange(filteredOptions[focusedIndex].value);
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
        } else {
          setIsOpen(!isOpen);
        }
        break;
        
      case 'Escape':
        if (isOpen) {
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
          selectRef.current?.focus();
        }
        break;
        
      default:
        if (isOpen && e.key.length === 1) {
          setSearchTerm(prev => prev + e.key);
        }
        break;
    }
  }, [isOpen, focusedIndex, filteredOptions, onChange]);
  
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex];
      focusedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);
  
  // Clear search term when options change
  useEffect(() => {
    if (searchTerm) {
      const timer = setTimeout(() => setSearchTerm(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);
  
  return (
    <div className={`relative space-y-1 ${className}`}>
      <label
        htmlFor={id}
        className={`
          block text-sm font-medium
          ${error ? 'text-red-700' : 'text-gray-700'}
          ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
        `}
      >
        {label}
      </label>
      
      <div className="relative">
        <button
          ref={selectRef}
          id={id}
          type="button"
          className={`
            w-full px-3 py-2 text-left bg-white border rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
          `}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${id}-label`}
          aria-describedby={describedBy}
          aria-required={required}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          <svg
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden"
            >
              {searchTerm && (
                <div className="px-3 py-2 text-sm text-gray-600 border-b border-gray-200">
                  Searching for: <strong>{searchTerm}</strong>
                </div>
              )}
              
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-labelledby={`${id}-label`}
                className="max-h-48 overflow-y-auto"
              >
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    className={`
                      px-3 py-2 text-sm cursor-pointer transition-colors duration-150
                      ${option.value === value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                      ${index === focusedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    `}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm('');
                      setFocusedIndex(-1);
                    }}
                  >
                    {option.label}
                    {option.value === value && (
                      <svg
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </li>
                ))}
                
                {filteredOptions.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    No options found
                  </li>
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {help && (
        <p id={helpId} className="text-sm text-gray-600">
          {help}
        </p>
      )}
      
      {error && (
        <p
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

// Focus Trap for Modals and Overlays
export const FocusTrap = ({ 
  children, 
  active = true,
  restoreFocus = true,
  className = '' 
}) => {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);
  
  useEffect(() => {
    if (!active) return;
    
    previousActiveElement.current = document.activeElement;
    
    const container = containerRef.current;
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, restoreFocus]);
  
  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

// High Contrast Mode Toggle
export const HighContrastToggle = ({ className = '' }) => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);
    
    const handler = (e) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    document.documentElement.classList.toggle('high-contrast', newValue);
  };
  
  return (
    <AccessibleButton
      onClick={toggleHighContrast}
      variant="secondary"
      size="sm"
      ariaLabel={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
      className={`text-xs ${className}`}
    >
      {isHighContrast ? '🔆' : '🔅'} High Contrast
    </AccessibleButton>
  );
};

// Reduced Motion Toggle
export const ReducedMotionToggle = ({ className = '' }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  const toggleReducedMotion = () => {
    const newValue = !prefersReducedMotion;
    setPrefersReducedMotion(newValue);
    document.documentElement.classList.toggle('reduce-motion', newValue);
  };
  
  return (
    <AccessibleButton
      onClick={toggleReducedMotion}
      variant="secondary"
      size="sm"
      ariaLabel={`${prefersReducedMotion ? 'Enable' : 'Disable'} animations`}
      className={`text-xs ${className}`}
    >
      {prefersReducedMotion ? '🎬' : '⏸️'} Motion
    </AccessibleButton>
  );
};

// Keyboard Navigation Indicator
export const KeyboardNavigationIndicator = () => {
  const [isUsingKeyboard, setIsUsingKeyboard] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setIsUsingKeyboard(true);
      }
    };
    
    const handleMouseDown = () => {
      setIsUsingKeyboard(false);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
  
  useEffect(() => {
    if (isUsingKeyboard) {
      document.body.classList.add('using-keyboard');
    } else {
      document.body.classList.remove('using-keyboard');
    }
  }, [isUsingKeyboard]);
  
  return null; // This component only applies CSS classes
};

export default {
  SkipLink,
  ScreenReaderOnly,
  LiveRegion,
  AccessibleButton,
  AccessibleFormField,
  AccessibleSelect,
  FocusTrap,
  HighContrastToggle,
  ReducedMotionToggle,
  KeyboardNavigationIndicator
};