import React, { useState, useEffect } from 'react';
import { Keyboard, HelpCircle, X } from 'lucide-react';

/**
 * Keyboard Shortcuts Indicator Component
 * Shows available shortcuts and provides help access
 */
export const KeyboardShortcutsIndicator = ({ 
  position = 'bottom-right',
  showOnHover = true,
  compact = false,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [recentAction, setRecentAction] = useState(null);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  useEffect(() => {
    // Listen for keyboard shortcut usage
    const handleKeyboardAction = (event) => {
      if (event.detail && event.detail.action) {
        setRecentAction(event.detail.action);
        setTimeout(() => setRecentAction(null), 2000);
      }
    };

    window.addEventListener('lokdarpan:keyboard-action', handleKeyboardAction);
    return () => window.removeEventListener('lokdarpan:keyboard-action', handleKeyboardAction);
  }, []);

  const showHelp = () => {
    window.dispatchEvent(new CustomEvent('lokdarpan:show-shortcuts'));
  };

  if (compact) {
    return (
      <button
        onClick={showHelp}
        className={`fixed ${positionClasses[position]} bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-40 ${className}`}
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-40 ${className}`}>
      {/* Recent action feedback */}
      {recentAction && (
        <div className="bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg mb-2 text-sm animate-slide-up">
          ✓ {recentAction}
        </div>
      )}
      
      {/* Main indicator */}
      <div
        className={`bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-200 ${
          isVisible || showOnHover ? 'opacity-100' : 'opacity-80 hover:opacity-100'
        }`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {isVisible ? (
          <div className="p-3 w-64">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900 text-sm">Quick Shortcuts</h4>
              <button
                onClick={showHelp}
                className="text-gray-400 hover:text-gray-600"
                title="Show all shortcuts"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Navigate tabs</span>
                <kbd className="bg-gray-100 px-1 rounded font-mono">1-5</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Switch wards</span>
                <kbd className="bg-gray-100 px-1 rounded font-mono">← →</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Refresh</span>
                <kbd className="bg-gray-100 px-1 rounded font-mono">R</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Search</span>
                <kbd className="bg-gray-100 px-1 rounded font-mono">F</kbd>
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-200">
              <button
                onClick={showHelp}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Show all shortcuts (?)
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2">
            <div className="flex items-center space-x-2">
              <Keyboard className="h-4 w-4 text-gray-600" />
              <span className="text-xs text-gray-600">Shortcuts</span>
              <kbd className="bg-gray-100 text-gray-600 px-1 text-xs rounded font-mono">?</kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Floating Action Button for Keyboard Shortcuts
 */
export const KeyboardShortcutsFAB = ({ 
  className = '' 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const showHelp = () => {
    window.dispatchEvent(new CustomEvent('lokdarpan:show-shortcuts'));
  };

  return (
    <div className={`fixed bottom-4 left-4 z-40 ${className}`}>
      <button
        onClick={showHelp}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
      >
        <Keyboard className="h-5 w-5" />
      </button>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Keyboard shortcuts (?)
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

/**
 * Inline Keyboard Hint Component
 * For showing specific shortcuts within components
 */
export const KeyboardHint = ({ 
  keys, 
  description, 
  className = '',
  inline = false 
}) => {
  const keyElements = Array.isArray(keys) ? keys : [keys];
  
  const Wrapper = inline ? 'span' : 'div';
  
  return (
    <Wrapper className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-gray-600">{description}:</span>
      <div className="flex items-center space-x-1">
        {keyElements.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-xs text-gray-400">+</span>}
            <kbd className="bg-gray-100 border border-gray-300 text-gray-800 px-2 py-1 text-xs rounded font-mono">
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </Wrapper>
  );
};

/**
 * Context-Aware Shortcuts Display
 * Shows relevant shortcuts based on current context
 */
export const ContextualShortcuts = ({ 
  context = 'general',
  className = '' 
}) => {
  const shortcuts = {
    general: [
      { key: '1-5', description: 'Switch tabs' },
      { key: 'R', description: 'Refresh' },
      { key: '?', description: 'Help' }
    ],
    map: [
      { key: 'M', description: 'Focus search' },
      { key: 'Home', description: 'Reset view' },
      { key: '← →', description: 'Navigate wards' }
    ],
    chart: [
      { key: 'R', description: 'Refresh data' },
      { key: 'F', description: 'Filter' }
    ],
    strategist: [
      { key: 'S', description: 'Open strategist' },
      { key: 'A', description: 'View alerts' },
      { key: 'P', description: 'Pulse view' }
    ]
  };

  const contextShortcuts = shortcuts[context] || shortcuts.general;

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
      <h5 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
        Quick Actions
      </h5>
      <div className="space-y-1">
        {contextShortcuts.map(({ key, description }, index) => (
          <KeyboardHint
            key={index}
            keys={key}
            description={description}
            className="text-xs"
            inline={true}
          />
        ))}
      </div>
    </div>
  );
};