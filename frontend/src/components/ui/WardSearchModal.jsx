/**
 * Ward Search Modal with Fuzzy Search - Sprint 2 Story 2.1.1
 * 
 * Activated by Ctrl+K keyboard shortcut for rapid ward navigation
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, MapPin, Clock, TrendingUp, ChevronRight, X } from 'lucide-react';

// Simple fuzzy search implementation
const fuzzyMatch = (query, text) => {
  if (!query) return true;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Direct match gets highest score
  if (textLower.includes(queryLower)) {
    const index = textLower.indexOf(queryLower);
    return { match: true, score: 100 - index, type: 'direct' };
  }
  
  // Fuzzy character matching
  let queryIndex = 0;
  let score = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += queryIndex === 0 ? 10 : 5; // Higher score for earlier matches
      queryIndex++;
    }
  }
  
  const matchPercent = (queryIndex / queryLower.length) * 100;
  return matchPercent > 60 ? { match: true, score, type: 'fuzzy' } : { match: false, score: 0 };
};

const WardSearchModal = ({ 
  isOpen, 
  onClose, 
  wardOptions = [], 
  currentWard, 
  onWardSelect,
  recentWards = [],
  wardActivity = {} 
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);
  
  // Enhanced ward data with activity and metadata
  const enhancedWards = useMemo(() => {
    return wardOptions.map(ward => ({
      name: ward,
      activity: wardActivity[ward] || { posts: 0, alerts: 0, mentions: 0, trend: 'stable' },
      isRecent: recentWards.includes(ward),
      isCurrent: ward === currentWard
    }));
  }, [wardOptions, wardActivity, recentWards, currentWard]);
  
  // Fuzzy search with scoring
  const performSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) {
      // Show recent wards and current ward when no query
      return enhancedWards
        .filter(ward => ward.isRecent || ward.isCurrent)
        .slice(0, 8);
    }
    
    const results = enhancedWards
      .map(ward => {
        const match = fuzzyMatch(searchQuery, ward.name);
        return match.match ? { ...ward, ...match } : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Prioritize: current ward > recent wards > direct matches > fuzzy matches > activity score
        if (a.isCurrent && !b.isCurrent) return -1;
        if (b.isCurrent && !a.isCurrent) return 1;
        if (a.isRecent && !b.isRecent) return -1;
        if (b.isRecent && !a.isRecent) return 1;
        if (a.type === 'direct' && b.type !== 'direct') return -1;
        if (b.type === 'direct' && a.type !== 'direct') return 1;
        
        return b.score - a.score + (b.activity.posts + b.activity.alerts) * 0.1;
      })
      .slice(0, 10);
    
    return results;
  }, [enhancedWards]);
  
  // Update search results when query changes
  useEffect(() => {
    const results = performSearch(query);
    setSearchResults(results);
    setSelectedIndex(0);
  }, [query, performSearch]);
  
  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }, 100);
    }
  }, [isOpen]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          selectWard(searchResults[selectedIndex]);
        }
        break;
        
      case 'Tab':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
        
      default:
        // Focus search input on any typing
        if (e.key.length === 1 && searchInputRef.current) {
          searchInputRef.current.focus();
        }
    }
  }, [searchResults, selectedIndex, onClose]);
  
  // Select ward and close modal
  const selectWard = useCallback((ward) => {
    onWardSelect(ward.name);
    onClose();
    
    // Add to recent wards (handled by parent component)
    window.dispatchEvent(new CustomEvent('lokdarpan:ward-selected', { 
      detail: { ward: ward.name } 
    }));
    
    // Announce selection for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Selected ${ward.name} ward`;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, [onWardSelect, onClose]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && searchResults.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }
  }, [selectedIndex, searchResults.length]);
  
  // Global keyboard listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Modal backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]">
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in zoom-in-95 fade-in-0 duration-200"
          role="dialog"
          aria-labelledby="ward-search-title"
          aria-describedby="ward-search-description"
        >
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search wards... (type to filter)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-lg font-medium outline-none placeholder-gray-400"
                aria-label="Ward search input"
              />
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Close search modal"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Search hints */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-gray-500">
              {!query ? 'Recent and current wards shown' : `${searchResults.length} matching wards`}
              {' · Use ↑↓ to navigate · Enter to select · Esc to close'}
            </p>
          </div>
          
          {/* Results */}
          <div 
            ref={resultsRef}
            className="max-h-96 overflow-y-auto"
            role="listbox"
            aria-label="Ward search results"
          >
            {searchResults.length > 0 ? (
              searchResults.map((ward, index) => (
                <div
                  key={ward.name}
                  className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                    index === selectedIndex 
                      ? 'bg-blue-50 border-r-2 border-blue-500' 
                      : 'hover:bg-gray-50'
                  } ${ward.isCurrent ? 'bg-green-50' : ''}`}
                  onClick={() => selectWard(ward)}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <div className="flex items-center space-x-3">
                    <MapPin className={`h-4 w-4 ${
                      ward.isCurrent ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${
                          ward.isCurrent ? 'text-green-700' : 'text-gray-900'
                        }`}>
                          {ward.name}
                        </span>
                        {ward.isCurrent && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                        {ward.isRecent && !ward.isCurrent && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Recent
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {ward.activity.posts} posts · {ward.activity.alerts} alerts · {ward.activity.mentions} mentions
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {ward.activity.trend === 'up' && (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    )}
                    {ward.activity.trend === 'down' && (
                      <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
                    )}
                    {index === selectedIndex && (
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">No matching wards found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            )}
          </div>
          
          {/* Footer with keyboard shortcuts */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono">⏎</kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono">Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
              <div className="text-blue-600">
                <Clock className="h-3 w-3 inline mr-1" />
                Quick Search
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WardSearchModal;