/**
 * Timeline Keyboard Navigation Hook
 * LokDarpan Phase 4.3: Advanced Data Visualization
 * 
 * Keyboard accessibility support for timeline component
 * with focus management and screen reader support.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard navigation hook for timeline accessibility
 */
export const useTimelineKeyboard = (events, onEventSelect, onTimeRangeChange) => {
  const [focusedEventIndex, setFocusedEventIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const timelineRef = useRef(null);
  const announcementRef = useRef(null);

  // Create screen reader announcements
  const announce = useCallback((message) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      
      // Clear announcement after a delay to allow screen readers to read it
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  // Navigate to specific event
  const navigateToEvent = useCallback((index) => {
    if (!events || index < 0 || index >= events.length) return;
    
    const event = events[index];
    setFocusedEventIndex(index);
    
    // Find and focus the event element
    const eventElement = document.querySelector(`[data-event-id="${event.id}"]`);
    if (eventElement) {
      eventElement.focus();
      eventElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    }
    
    // Announce the event to screen readers
    announce(
      `Event ${index + 1} of ${events.length}: ${event.title}. ` +
      `Type: ${event.type}. ` +
      `Date: ${event.timestamp.toLocaleDateString()}. ` +
      `Importance: ${event.importance} out of 5 stars.`
    );
  }, [events, announce]);

  // Navigate to next event
  const navigateNext = useCallback(() => {
    const nextIndex = Math.min(focusedEventIndex + 1, events.length - 1);
    if (nextIndex !== focusedEventIndex) {
      navigateToEvent(nextIndex);
    } else {
      announce('Reached end of timeline');
    }
  }, [focusedEventIndex, events.length, navigateToEvent, announce]);

  // Navigate to previous event
  const navigatePrevious = useCallback(() => {
    const prevIndex = Math.max(focusedEventIndex - 1, 0);
    if (prevIndex !== focusedEventIndex) {
      navigateToEvent(prevIndex);
    } else {
      announce('Reached beginning of timeline');
    }
  }, [focusedEventIndex, navigateToEvent, announce]);

  // Navigate by time period
  const navigateByTimePeriod = useCallback((direction, period = 'day') => {
    if (!events || events.length === 0) return;
    
    const currentEvent = events[focusedEventIndex];
    if (!currentEvent) return;
    
    const currentTime = new Date(currentEvent.timestamp);
    let targetTime;
    
    switch (period) {
      case 'hour':
        targetTime = new Date(currentTime.getTime() + (direction * 60 * 60 * 1000));
        break;
      case 'day':
        targetTime = new Date(currentTime.getTime() + (direction * 24 * 60 * 60 * 1000));
        break;
      case 'week':
        targetTime = new Date(currentTime.getTime() + (direction * 7 * 24 * 60 * 60 * 1000));
        break;
      default:
        return;
    }
    
    // Find the closest event to target time
    let closestIndex = focusedEventIndex;
    let closestDiff = Infinity;
    
    events.forEach((event, index) => {
      const diff = Math.abs(event.timestamp - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });
    
    if (closestIndex !== focusedEventIndex) {
      navigateToEvent(closestIndex);
      announce(`Jumped ${direction > 0 ? 'forward' : 'backward'} by ${period}`);
    }
  }, [events, focusedEventIndex, navigateToEvent, announce]);

  // Jump to start or end
  const jumpTo = useCallback((position) => {
    if (!events || events.length === 0) return;
    
    let targetIndex;
    let message;
    
    switch (position) {
      case 'start':
        targetIndex = 0;
        message = 'Jumped to beginning of timeline';
        break;
      case 'end':
        targetIndex = events.length - 1;
        message = 'Jumped to end of timeline';
        break;
      default:
        return;
    }
    
    navigateToEvent(targetIndex);
    announce(message);
  }, [events, navigateToEvent, announce]);

  // Select focused event
  const selectFocusedEvent = useCallback(() => {
    if (!events || focusedEventIndex < 0 || focusedEventIndex >= events.length) return;
    
    const event = events[focusedEventIndex];
    onEventSelect?.(event);
    announce(`Selected event: ${event.title}`);
  }, [events, focusedEventIndex, onEventSelect, announce]);

  // Keyboard event handler
  const handleKeyDown = useCallback((event) => {
    if (!events || events.length === 0) return;
    
    // Only handle keyboard navigation when timeline is focused
    if (!timelineRef.current?.contains(document.activeElement)) return;
    
    const { key, metaKey, ctrlKey, shiftKey, altKey } = event;
    let handled = true;
    
    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        navigateNext();
        break;
        
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        navigatePrevious();
        break;
        
      case 'Home':
        event.preventDefault();
        jumpTo('start');
        break;
        
      case 'End':
        event.preventDefault();
        jumpTo('end');
        break;
        
      case 'Enter':
      case ' ': // Spacebar
        event.preventDefault();
        selectFocusedEvent();
        break;
        
      case 'PageDown':
        event.preventDefault();
        if (shiftKey) {
          navigateByTimePeriod(1, 'week');
        } else {
          navigateByTimePeriod(1, 'day');
        }
        break;
        
      case 'PageUp':
        event.preventDefault();
        if (shiftKey) {
          navigateByTimePeriod(-1, 'week');
        } else {
          navigateByTimePeriod(-1, 'day');
        }
        break;
        
      case 'h':
        if (!metaKey && !ctrlKey) {
          event.preventDefault();
          navigateByTimePeriod(-1, 'hour');
        } else {
          handled = false;
        }
        break;
        
      case 'l':
        if (!metaKey && !ctrlKey) {
          event.preventDefault();
          navigateByTimePeriod(1, 'hour');
        } else {
          handled = false;
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        setIsNavigating(false);
        if (timelineRef.current) {
          timelineRef.current.blur();
        }
        announce('Timeline navigation exited');
        break;
        
      case '?':
        if (!shiftKey) {
          handled = false;
          break;
        }
        event.preventDefault();
        showKeyboardHelp();
        break;
        
      default:
        handled = false;
        break;
    }
    
    if (handled) {
      setIsNavigating(true);
    }
  }, [events, navigateNext, navigatePrevious, jumpTo, selectFocusedEvent, navigateByTimePeriod, announce]);

  // Show keyboard help
  const showKeyboardHelp = useCallback(() => {
    const helpMessage = [
      'Timeline keyboard shortcuts:',
      'Arrow keys or H/L: Navigate events',
      'Home/End: Jump to start/end',
      'Enter/Space: Select event',
      'Page Up/Down: Navigate by day',
      'Shift + Page Up/Down: Navigate by week',
      'Escape: Exit navigation',
      'Shift + ?: Show this help'
    ].join('. ');
    
    announce(helpMessage);
  }, [announce]);

  // Initialize keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      // Focus timeline on 't' key
      if (event.key === 't' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && 
            activeElement?.tagName !== 'TEXTAREA' && 
            !activeElement?.isContentEditable) {
          
          event.preventDefault();
          if (timelineRef.current) {
            timelineRef.current.focus();
            setIsNavigating(true);
            announce('Timeline focused. Use arrow keys to navigate events.');
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, announce]);

  // Auto-focus first event when events change
  useEffect(() => {
    if (events && events.length > 0 && focusedEventIndex >= events.length) {
      setFocusedEventIndex(0);
    }
  }, [events, focusedEventIndex]);

  // Screen reader announcement element
  const AnnouncementElement = () => (
    <div
      ref={announcementRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  return {
    // State
    focusedEventIndex,
    isNavigating,
    
    // Refs
    timelineRef,
    
    // Navigation functions
    navigateToEvent,
    navigateNext,
    navigatePrevious,
    navigateByTimePeriod,
    jumpTo,
    selectFocusedEvent,
    
    // Accessibility
    announce,
    showKeyboardHelp,
    AnnouncementElement
  };
};