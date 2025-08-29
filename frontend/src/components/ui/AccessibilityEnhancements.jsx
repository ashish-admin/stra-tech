import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Keyboard, Eye, Volume2, Focus, ArrowUp } from 'lucide-react';

/**
 * Professional Accessibility Enhancement Suite
 * WCAG 2.1 AA compliant components for LokDarpan political intelligence dashboard
 * Optimized for keyboard navigation and screen reader accessibility
 */

// Skip Navigation Links for Professional Accessibility
export const SkipNavigation = ({ links = [] }) => {
  const defaultLinks = [
    { href: '#main-content', label: 'Skip to main content' },
    { href: '#navigation', label: 'Skip to navigation' },
    { href: '#search', label: 'Skip to search' },
    { href: '#ward-selection', label: 'Skip to ward selection' },
    { href: '#executive-summary', label: 'Skip to executive summary' }
  ];

  const allLinks = links.length > 0 ? links : defaultLinks;

  return (
    <nav className="skip-navigation sr-only focus-within:not-sr-only" aria-label="Skip navigation">
      <div className="absolute top-0 left-0 z-[9999] bg-blue-600 text-white p-2 space-x-2 transform -translate-y-full focus-within:translate-y-0 transition-transform duration-200">
        {allLinks.map((link, index) => (
          <a
            key={index}
            href={link.href}
            className="inline-block px-3 py-1 bg-blue-700 rounded text-sm font-medium hover:bg-blue-800 focus:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
};

// Professional Focus Management System
export const FocusManager = ({ children, trapFocus = false, restoreFocus = true }) => {
  const containerRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  
  useEffect(() => {
    if (restoreFocus) {
      previousActiveElementRef.current = document.activeElement;
    }
    
    if (trapFocus && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]'
      );
      
      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const handleTabKey = (e) => {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
              }
            } else {
              if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
              }
            }
          }
        };
        
        containerRef.current.addEventListener('keydown', handleTabKey);
        firstElement.focus();
        
        return () => {
          containerRef.current?.removeEventListener('keydown', handleTabKey);
          if (restoreFocus && previousActiveElementRef.current) {
            previousActiveElementRef.current.focus();
          }
        };
      }
    }
  }, [trapFocus, restoreFocus]);
  
  return (
    <div ref={containerRef} tabIndex={-1}>
      {children}
    </div>
  );
};

// Professional Live Region for Screen Reader Announcements
export const LiveRegion = ({ 
  message, 
  politeness = 'polite', 
  atomic = true,
  clearAfter = 5000,
  className = ''
}) => {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef(null);
  
  useEffect(() => {
    if (message) {
      setAnnouncement(message);
      
      if (clearAfter > 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          setAnnouncement('');
        }, clearAfter);
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);
  
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className={`sr-only ${className}`}
      role="status"
    >
      {announcement}
    </div>
  );
};

// Keyboard Navigation Indicator
export const KeyboardNavigationIndicator = ({ isActive }) => {
  return (
    <div 
      className={`fixed top-4 right-4 z-[9998] transition-all duration-300 ${
        isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}
      aria-hidden="true"
    >
      <div className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
        <Keyboard className="h-4 w-4" />
        <span>Keyboard Navigation Active</span>
      </div>
    </div>
  );
};

// Professional Roving Tabindex Component
export const RovingTabIndex = ({ 
  children, 
  orientation = 'horizontal',
  wrap = true,
  className = '',
  onNavigate,
  ...props 
}) => {
  const containerRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = useCallback((e) => {
    const focusableChildren = Array.from(
      containerRef.current?.querySelectorAll('[data-roving-item]') || []
    );
    
    if (focusableChildren.length === 0) return;
    
    let newIndex = focusedIndex;
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        if (orientation === 'horizontal' && e.key === 'ArrowDown') return;
        if (orientation === 'vertical' && e.key === 'ArrowRight') return;
        
        e.preventDefault();
        newIndex = focusedIndex < focusableChildren.length - 1 ? focusedIndex + 1 : (wrap ? 0 : focusedIndex);
        break;
        
      case 'ArrowLeft':
      case 'ArrowUp':
        if (orientation === 'horizontal' && e.key === 'ArrowUp') return;
        if (orientation === 'vertical' && e.key === 'ArrowLeft') return;
        
        e.preventDefault();
        newIndex = focusedIndex > 0 ? focusedIndex - 1 : (wrap ? focusableChildren.length - 1 : focusedIndex);
        break;
        
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
        
      case 'End':
        e.preventDefault();
        newIndex = focusableChildren.length - 1;
        break;
        
      default:
        return;
    }
    
    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      focusableChildren[newIndex]?.focus();
      onNavigate?.(newIndex, focusableChildren[newIndex]);
    }
  }, [focusedIndex, orientation, wrap, onNavigate]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const focusableChildren = container.querySelectorAll('[data-roving-item]');
      
      // Set initial tabindex values
      focusableChildren.forEach((child, index) => {
        child.tabIndex = index === focusedIndex ? 0 : -1;
      });
    }
  }, [focusedIndex, children]);
  
  return (
    <div
      ref={containerRef}
      className={className}
      onKeyDown={handleKeyDown}
      role="toolbar"
      aria-orientation={orientation}
      {...props}
    >
      {React.Children.map(children, (child, index) =>
        React.cloneElement(child, {
          'data-roving-item': true,
          tabIndex: index === focusedIndex ? 0 : -1,
          onFocus: () => setFocusedIndex(index)
        })
      )}
    </div>
  );
};

// Accessible Modal Dialog
export const AccessibleModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '',
  closeOnBackdrop = true,
  closeOnEscape = true,
  ...props 
}) => {
  const modalRef = useRef(null);
  const [announcement, setAnnouncement] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      setAnnouncement(`${title} dialog opened`);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, title]);
  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && closeOnEscape && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[9999] animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <FocusManager trapFocus restoreFocus>
        <div
          ref={modalRef}
          className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          aria-describedby="modal-content"
          {...props}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto animate-fade-in-scale">
            <div className="p-6">
              {title && (
                <h2 id="modal-title" className="text-xl font-semibold mb-4 text-gray-900">
                  {title}
                </h2>
              )}
              <div id="modal-content">
                {children}
              </div>
            </div>
          </div>
        </div>
      </FocusManager>
      <LiveRegion message={announcement} />
    </>
  );
};

// Accessibility Settings Panel
export const AccessibilityPanel = ({ 
  isOpen, 
  onClose,
  settings = {},
  onSettingChange = () => {}
}) => {
  const [localSettings, setLocalSettings] = useState({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    keyboardNavigation: true,
    screenReaderOptimized: false,
    ...settings
  });
  
  const handleSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingChange(key, value, newSettings);
    
    // Apply settings to document
    if (key === 'reduceMotion') {
      document.documentElement.style.setProperty('--motion-reduce', value ? 'reduce' : 'no-preference');
    }
    if (key === 'highContrast') {
      document.documentElement.classList.toggle('high-contrast', value);
    }
    if (key === 'largeText') {
      document.documentElement.classList.toggle('large-text', value);
    }
  };
  
  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Accessibility Settings"
      className="accessibility-panel"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="reduce-motion" className="flex items-center space-x-3">
            <Volume2 className="h-5 w-5 text-gray-600" />
            <div>
              <div className="font-medium">Reduce Motion</div>
              <div className="text-sm text-gray-600">Minimize animations and transitions</div>
            </div>
          </label>
          <input
            id="reduce-motion"
            type="checkbox"
            checked={localSettings.reduceMotion}
            onChange={(e) => handleSettingChange('reduceMotion', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <label htmlFor="high-contrast" className="flex items-center space-x-3">
            <Eye className="h-5 w-5 text-gray-600" />
            <div>
              <div className="font-medium">High Contrast</div>
              <div className="text-sm text-gray-600">Increase color contrast</div>
            </div>
          </label>
          <input
            id="high-contrast"
            type="checkbox"
            checked={localSettings.highContrast}
            onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <label htmlFor="large-text" className="flex items-center space-x-3">
            <ArrowUp className="h-5 w-5 text-gray-600" />
            <div>
              <div className="font-medium">Large Text</div>
              <div className="text-sm text-gray-600">Increase text size</div>
            </div>
          </label>
          <input
            id="large-text"
            type="checkbox"
            checked={localSettings.largeText}
            onChange={(e) => handleSettingChange('largeText', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <label htmlFor="keyboard-nav" className="flex items-center space-x-3">
            <Keyboard className="h-5 w-5 text-gray-600" />
            <div>
              <div className="font-medium">Enhanced Keyboard Navigation</div>
              <div className="text-sm text-gray-600">Show keyboard focus indicators</div>
            </div>
          </label>
          <input
            id="keyboard-nav"
            type="checkbox"
            checked={localSettings.keyboardNavigation}
            onChange={(e) => handleSettingChange('keyboardNavigation', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <label htmlFor="screen-reader" className="flex items-center space-x-3">
            <Focus className="h-5 w-5 text-gray-600" />
            <div>
              <div className="font-medium">Screen Reader Optimization</div>
              <div className="text-sm text-gray-600">Enhanced announcements</div>
            </div>
          </label>
          <input
            id="screen-reader"
            type="checkbox"
            checked={localSettings.screenReaderOptimized}
            onChange={(e) => handleSettingChange('screenReaderOptimized', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Apply Settings
        </button>
      </div>
    </AccessibleModal>
  );
};

// Landmark Navigation Component
export const LandmarkNavigation = ({ landmarks = [] }) => {
  const defaultLandmarks = [
    { id: 'main-content', label: 'Main Content', role: 'main' },
    { id: 'navigation', label: 'Navigation', role: 'navigation' },
    { id: 'executive-summary', label: 'Executive Summary', role: 'region' },
    { id: 'ward-selection', label: 'Ward Selection', role: 'region' },
    { id: 'charts-section', label: 'Charts & Analytics', role: 'region' }
  ];
  
  const allLandmarks = landmarks.length > 0 ? landmarks : defaultLandmarks;
  
  return (
    <nav 
      aria-label="Page landmarks"
      className="sr-only focus-within:not-sr-only fixed top-16 right-4 z-[9998] bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs"
    >
      <h3 className="font-medium text-sm mb-2">Jump to section:</h3>
      <ul className="space-y-1">
        {allLandmarks.map((landmark) => (
          <li key={landmark.id}>
            <a
              href={`#${landmark.id}`}
              className="block px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded focus:outline-none focus:bg-blue-100 focus:ring-2 focus:ring-blue-500"
            >
              {landmark.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Export all components
export default {
  SkipNavigation,
  FocusManager,
  LiveRegion,
  KeyboardNavigationIndicator,
  RovingTabIndex,
  AccessibleModal,
  AccessibilityPanel,
  LandmarkNavigation
};