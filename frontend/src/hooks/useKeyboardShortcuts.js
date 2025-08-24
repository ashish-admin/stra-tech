import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard Shortcuts Hook for LokDarpan Dashboard
 * Provides campaign-focused navigation and action shortcuts
 */
export const useKeyboardShortcuts = ({
  onWardSelect,
  onTabChange,
  wardOptions = [],
  currentWard,
  currentTab = 'overview',
  isEnabled = true,
  shortcuts = {}
}) => {
  const shortcutRefs = useRef({});
  const lastActionRef = useRef(null);
  
  // Default keyboard shortcuts
  const defaultShortcuts = {
    // Tab navigation
    '1': () => onTabChange?.('overview'),
    '2': () => onTabChange?.('sentiment'), 
    '3': () => onTabChange?.('competitive'),
    '4': () => onTabChange?.('geographic'),
    '5': () => onTabChange?.('strategist'),
    
    // Ward navigation
    'ArrowRight': () => navigateWard('next'),
    'ArrowLeft': () => navigateWard('prev'),
    'Home': () => onWardSelect?.('All'),
    
    // Quick actions
    'r': () => refreshCurrentView(),
    'f': () => focusSearch(),
    's': () => openStrategistTab(),
    'm': () => focusMap(),
    
    // Sprint 2 Enhanced Features
    'k': (event) => event.ctrlKey ? openWardSearchModal() : null, // Ctrl+K for ward search
    'F11': () => toggleFullScreenMode(), // Alt+F for full screen
    
    // Executive Summary Navigation (Arrow keys)
    'ArrowUp': (event) => event.target.closest('[data-component="executive-summary"]') ? navigateExecutiveSummary('up') : null,
    'ArrowDown': (event) => event.target.closest('[data-component="executive-summary"]') ? navigateExecutiveSummary('down') : null,
    
    // Accessibility
    'Escape': () => closeModals(),
    '?': () => showKeyboardHelp(),
    
    // Campaign shortcuts
    'a': () => showAlerts(),
    'c': () => openCompetitiveAnalysis(),
    'p': () => openPulseView(),
    
    ...shortcuts // Allow custom shortcuts to override defaults
  };

  const navigateWard = useCallback((direction) => {
    if (!wardOptions.length || !onWardSelect) return;
    
    const currentIndex = wardOptions.findIndex(ward => 
      ward.toLowerCase() === currentWard?.toLowerCase()
    );
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = currentIndex < wardOptions.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : wardOptions.length - 1;
    }
    
    const nextWard = wardOptions[nextIndex];
    onWardSelect(nextWard);
    
    // Announce change for screen readers
    announceAction(`Switched to ${nextWard} ward`);
  }, [wardOptions, currentWard, onWardSelect]);

  const refreshCurrentView = useCallback(() => {
    // Trigger a refresh by dispatching a custom event
    window.dispatchEvent(new CustomEvent('lokdarpan:refresh', { 
      detail: { tab: currentTab, ward: currentWard } 
    }));
    announceAction('Refreshing view...');
  }, [currentTab, currentWard]);

  const focusSearch = useCallback(() => {
    // Focus the keyword search input
    const searchInput = document.querySelector('input[placeholder*="roads"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      announceAction('Search focused');
    }
  }, []);

  const openStrategistTab = useCallback(() => {
    onTabChange?.('strategist');
    announceAction('Opening Political Strategist');
  }, [onTabChange]);

  const focusMap = useCallback(() => {
    // Focus the map search input
    const mapSearch = document.querySelector('input[placeholder*="Search ward"]');
    if (mapSearch) {
      mapSearch.focus();
      announceAction('Map search focused');
    } else {
      onTabChange?.('geographic');
      announceAction('Opening map view');
    }
  }, [onTabChange]);

  const closeModals = useCallback(() => {
    // Close any open modals or dropdowns
    const activeModal = document.querySelector('[role="dialog"]');
    const activeDropdown = document.querySelector('[role="menu"][aria-expanded="true"]');
    
    if (activeModal) {
      const closeButton = activeModal.querySelector('[aria-label*="close"]');
      closeButton?.click();
    }
    
    if (activeDropdown) {
      document.activeElement?.blur();
    }
    
    announceAction('Closed modals');
  }, []);

  const showKeyboardHelp = useCallback(() => {
    // Show keyboard shortcuts help
    window.dispatchEvent(new CustomEvent('lokdarpan:show-shortcuts'));
    announceAction('Showing keyboard shortcuts help');
  }, []);

  const showAlerts = useCallback(() => {
    // Focus alerts or switch to overview tab
    onTabChange?.('overview');
    setTimeout(() => {
      const alertsPanel = document.querySelector('[data-component="alerts-panel"]');
      alertsPanel?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    announceAction('Viewing alerts');
  }, [onTabChange]);

  const openCompetitiveAnalysis = useCallback(() => {
    onTabChange?.('competitive');
    announceAction('Opening competitive analysis');
  }, [onTabChange]);

  const openPulseView = useCallback(() => {
    onTabChange?.('overview');
    setTimeout(() => {
      const pulseSection = document.querySelector('[data-component="strategic-summary"]');
      pulseSection?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    announceAction('Viewing area pulse');
  }, [onTabChange]);

  // Sprint 2 Enhanced Features
  const openWardSearchModal = useCallback(() => {
    // Dispatch event to open ward search modal
    window.dispatchEvent(new CustomEvent('lokdarpan:open-ward-search'));
    announceAction('Opening ward search');
  }, []);

  const toggleFullScreenMode = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      announceAction('Exited full screen');
    } else {
      document.documentElement.requestFullscreen?.();
      announceAction('Entered full screen');
    }
  }, []);

  const navigateExecutiveSummary = useCallback((direction) => {
    const summaryCards = document.querySelectorAll('[data-component="executive-summary"] [data-card-index]');
    const focusedCard = document.activeElement.closest('[data-card-index]');
    
    if (!summaryCards.length) return;
    
    let currentIndex = focusedCard ? 
      parseInt(focusedCard.getAttribute('data-card-index')) : 0;
    
    if (direction === 'up' && currentIndex > 0) {
      currentIndex--;
    } else if (direction === 'down' && currentIndex < summaryCards.length - 1) {
      currentIndex++;
    } else if (direction === 'up') {
      currentIndex = summaryCards.length - 1; // Wrap to last
    } else {
      currentIndex = 0; // Wrap to first
    }
    
    const targetCard = summaryCards[currentIndex];
    if (targetCard) {
      targetCard.focus();
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      announceAction(`Focused summary card ${currentIndex + 1} of ${summaryCards.length}`);
    }
  }, []);

  const announceAction = useCallback((message) => {
    // Create accessible announcement for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
    
    // Store last action for help system
    lastActionRef.current = { message, timestamp: Date.now() };
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (!isEnabled) return;
    
    // Don't interfere with form inputs
    const activeElement = document.activeElement;
    const isInInput = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.contentEditable === 'true'
    );
    
    if (isInInput && !['Escape', 'F1'].includes(event.key)) {
      return;
    }
    
    // Handle modifier keys
    const key = event.key;
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
    
    // Special handling for Sprint 2 enhanced shortcuts
    if (event.ctrlKey && key.toLowerCase() === 'k') {
      event.preventDefault();
      event.stopPropagation();
      openWardSearchModal();
      return;
    }
    
    if (event.altKey && key.toLowerCase() === 'f') {
      event.preventDefault();
      event.stopPropagation();
      toggleFullScreenMode();
      return;
    }
    
    // Allow other Ctrl/Cmd shortcuts to pass through (except our custom ones)
    if (hasModifier && !['Escape', 'F1', 'F11'].includes(key)) {
      return;
    }
    
    const shortcutHandler = defaultShortcuts[key];
    
    if (shortcutHandler) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        shortcutHandler();
      } catch (error) {
        console.warn('Keyboard shortcut error:', error);
      }
    }
  }, [defaultShortcuts, isEnabled]);

  // Setup keyboard event listeners
  useEffect(() => {
    if (!isEnabled) return;
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isEnabled]);

  // Provide shortcut information for help system
  const getShortcutInfo = useCallback(() => {
    return {
      navigation: {
        '1-5': 'Switch between dashboard tabs',
        '← →': 'Navigate between wards',
        'Home': 'Return to All Wards view',
      },
      actions: {
        'R': 'Refresh current view',
        'F': 'Focus keyword search',
        'S': 'Open Political Strategist',
        'M': 'Focus map search',
      },
      campaign: {
        'A': 'View alerts panel',
        'C': 'Open competitive analysis',
        'P': 'View area pulse summary',
      },
      accessibility: {
        'Esc': 'Close modals and dropdowns',
        '?': 'Show keyboard shortcuts help',
      },
      lastAction: lastActionRef.current
    };
  }, []);

  return {
    shortcuts: defaultShortcuts,
    getShortcutInfo,
    announceAction,
    isEnabled
  };
};

/**
 * Keyboard Shortcuts Help Modal Hook
 * Provides help system for keyboard shortcuts
 */
export const useKeyboardShortcutsHelp = () => {
  const modalRef = useRef(null);
  
  const showHelp = useCallback(() => {
    const helpContent = `
      <div class="keyboard-shortcuts-help" style="
        position: fixed; top: 50%; left: 50%; 
        transform: translate(-50%, -50%); 
        background: white; 
        border-radius: 8px; 
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); 
        padding: 24px; 
        max-width: 500px; 
        width: 90vw; 
        z-index: 1000;
        max-height: 80vh;
        overflow-y: auto;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h2 style="font-size: 18px; font-weight: 600; margin: 0; color: #111827;">
            Keyboard Shortcuts
          </h2>
          <button onclick="this.closest('.keyboard-shortcuts-help').remove()" 
                  style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">
            ×
          </button>
        </div>
        
        <div style="display: grid; gap: 16px;">
          <div>
            <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #374151;">Navigation</h3>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">1-5</kbd>
              <span>Switch between dashboard tabs</span>
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">← →</kbd>
              <span>Navigate between wards</span>
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">Home</kbd>
              <span>Return to All Wards view</span>
            </div>
          </div>
          
          <div>
            <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #374151;">Actions</h3>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">R</kbd>
              <span>Refresh current view</span>
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">F</kbd>
              <span>Focus keyword search</span>
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">S</kbd>
              <span>Open Political Strategist</span>
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">M</kbd>
              <span>Focus map search</span>
            </div>
          </div>
          
          <div>
            <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #374151;">Campaign Tools</h3>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">A</kbd>
              <span>View alerts panel</span>
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">C</kbd>
              <span>Open competitive analysis</span>
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">P</kbd>
              <span>View area pulse summary</span>
            </div>
          </div>
          
          <div>
            <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #374151;">Accessibility</h3>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 13px;">
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">Esc</kbd>
              <span>Close modals and dropdowns</span>
              <kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">?</kbd>
              <span>Show this help</span>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            Press <kbd style="background: #f3f4f6; padding: 1px 4px; border-radius: 2px; font-family: monospace;">Esc</kbd> 
            or click outside to close
          </p>
        </div>
      </div>
    `;
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
      background: rgba(0, 0, 0, 0.5); z-index: 999;
    `;
    backdrop.innerHTML = helpContent;
    
    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
      }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        backdrop.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    document.body.appendChild(backdrop);
    modalRef.current = backdrop;
  }, []);
  
  useEffect(() => {
    const handleShowShortcuts = () => showHelp();
    window.addEventListener('lokdarpan:show-shortcuts', handleShowShortcuts);
    
    return () => {
      window.removeEventListener('lokdarpan:show-shortcuts', handleShowShortcuts);
      modalRef.current?.remove();
    };
  }, [showHelp]);
  
  return { showHelp };
};