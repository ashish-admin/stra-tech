/**
 * Timeline Controls Component
 * LokDarpan Phase 4.3: Advanced Data Visualization
 * 
 * Control panel for timeline navigation, filtering, and playback functionality
 * with mobile-optimized interface and accessibility support.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  DocumentArrowDownIcon,
  FunnelIcon,
  CalendarIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Event type configurations
const EVENT_TYPE_CONFIG = {
  news: { label: 'News & Media', color: '#3b82f6', icon: '📰' },
  campaign: { label: 'Campaign Events', color: '#f59e0b', icon: '🗳️' },
  policy: { label: 'Policy Changes', color: '#10b981', icon: '📋' },
  sentiment: { label: 'Sentiment Shifts', color: '#8b5cf6', icon: '📊' },
  electoral: { label: 'Electoral Events', color: '#ef4444', icon: '🏛️' }
};

/**
 * Date Range Picker Component
 */
const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onChange, 
  presets = [],
  isMobile 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultPresets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'This year', days: 365 }
  ];

  const availablePresets = presets.length > 0 ? presets : defaultPresets;

  const handlePresetClick = (days) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    onChange({ start, end });
    setIsExpanded(false);
  };

  const formatDateInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (e) => {
    const newStart = new Date(e.target.value);
    onChange({ start: newStart, end: endDate });
  };

  const handleEndDateChange = (e) => {
    const newEnd = new Date(e.target.value);
    onChange({ start: startDate, end: newEnd });
  };

  return (
    <div className={`relative ${isMobile ? 'w-full' : 'min-w-64'}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors w-full justify-between"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          <span>
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-full">
          {/* Presets */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Quick Select
            </h4>
            <div className="space-y-1">
              {availablePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset.days)}
                  className="block w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="p-3">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Custom Range
            </h4>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formatDateInput(startDate)}
                  onChange={handleStartDateChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formatDateInput(endDate)}
                  onChange={handleEndDateChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Event Type Filter Component
 */
const EventTypeFilter = ({ 
  selectedTypes, 
  onChange, 
  isMobile 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleEventType = (eventType) => {
    const newTypes = selectedTypes.includes(eventType)
      ? selectedTypes.filter(type => type !== eventType)
      : [...selectedTypes, eventType];
    onChange(newTypes);
  };

  const selectAll = () => {
    onChange(Object.keys(EVENT_TYPE_CONFIG));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className={`relative ${isMobile ? 'w-full' : 'min-w-48'}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors w-full justify-between"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4" />
          <span>
            {selectedTypes.length === 0 
              ? 'No filters' 
              : selectedTypes.length === Object.keys(EVENT_TYPE_CONFIG).length
                ? 'All events'
                : `${selectedTypes.length} types`
            }
          </span>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-full">
          {/* Header with Select All/Clear */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Event Types
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  All
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Event Type Checkboxes */}
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(EVENT_TYPE_CONFIG).map(([eventType, config]) => (
              <label
                key={eventType}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(eventType)}
                  onChange={() => toggleEventType(eventType)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg">{config.icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {config.label}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full ml-auto"
                    style={{ backgroundColor: config.color }}
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="p-3 pt-0">
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Timeline Playback Controls Component
 */
const PlaybackControls = ({ 
  isPlaying, 
  playbackPosition,
  onTogglePlayback,
  onSeek,
  duration = 100,
  isMobile 
}) => {
  const formatTime = (position) => {
    const percentage = (position / duration * 100).toFixed(0);
    return `${percentage}%`;
  };

  return (
    <div className={`flex items-center gap-3 ${isMobile ? 'flex-col space-y-2' : ''}`}>
      {/* Play/Pause Button */}
      <button
        onClick={onTogglePlayback}
        className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
      >
        {isPlaying ? (
          <PauseIcon className="w-4 h-4" />
        ) : (
          <PlayIcon className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Progress Bar */}
      <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : 'min-w-32'}`}>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatTime(playbackPosition)}
        </span>
        <div className="flex-1 relative">
          <input
            type="range"
            min="0"
            max={duration}
            value={playbackPosition}
            onChange={(e) => onSeek(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(playbackPosition / duration) * 100}%, #e5e7eb ${(playbackPosition / duration) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

/**
 * Main Timeline Controls Component
 */
const TimelineControls = ({
  dateRange = { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
  eventTypes = Object.keys(EVENT_TYPE_CONFIG),
  isPlaying = false,
  playbackPosition = 0,
  onTimeRangeChange,
  onFilterChange,
  onPlaybackToggle,
  onSeek,
  onExport,
  onReset,
  isMobile = false,
  className = ''
}) => {
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    // Implement search functionality if needed
  }, []);

  // Reset all filters
  const handleResetAll = useCallback(() => {
    onTimeRangeChange?.({ 
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      end: new Date() 
    });
    onFilterChange?.(Object.keys(EVENT_TYPE_CONFIG));
    setSearchQuery('');
    onReset?.();
  }, [onTimeRangeChange, onFilterChange, onReset]);

  const MobileLayout = () => (
    <div className="space-y-4">
      {/* Row 1: Date Range */}
      <div className="w-full">
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onChange={onTimeRangeChange}
          isMobile={isMobile}
        />
      </div>

      {/* Row 2: Filters and Search */}
      <div className="flex gap-2">
        <div className="flex-1">
          <EventTypeFilter
            selectedTypes={eventTypes}
            onChange={onFilterChange}
            isMobile={isMobile}
          />
        </div>
        <div className="w-auto flex gap-1">
          <button
            onClick={onExport}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="Export timeline"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleResetAll}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="Reset filters"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Row 3: Playback Controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        playbackPosition={playbackPosition}
        onTogglePlayback={onPlaybackToggle}
        onSeek={onSeek}
        isMobile={isMobile}
      />
    </div>
  );

  const DesktopLayout = () => (
    <div className="flex items-center justify-between gap-4">
      {/* Left: Date Range and Filters */}
      <div className="flex items-center gap-3">
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onChange={onTimeRangeChange}
          isMobile={isMobile}
        />
        
        <EventTypeFilter
          selectedTypes={eventTypes}
          onChange={onFilterChange}
          isMobile={isMobile}
        />

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-40"
          />
        </div>
      </div>

      {/* Center: Playback Controls */}
      <div className="flex-1 max-w-md">
        <PlaybackControls
          isPlaying={isPlaying}
          playbackPosition={playbackPosition}
          onTogglePlayback={onPlaybackToggle}
          onSeek={onSeek}
          isMobile={isMobile}
        />
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          aria-label="Export timeline"
        >
          <DocumentArrowDownIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
        
        <button
          onClick={handleResetAll}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          aria-label="Reset all filters"
        >
          <ArrowPathIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </div>
  );
};

export default TimelineControls;