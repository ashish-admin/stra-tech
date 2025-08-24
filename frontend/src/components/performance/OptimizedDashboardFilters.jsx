import React, { memo, useCallback, useMemo } from 'react';
import { useOptimizedDebounce } from '../../hooks/usePerformanceOptimizations';

// Memoized emotion filter component
const EmotionFilter = memo(({ value, onChange, options }) => {
  const handleChange = useCallback((e) => {
    onChange('emotion', e.target.value);
  }, [onChange]);

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">Emotion Filter</label>
      <select
        className="w-full border rounded-md p-2 text-sm"
        value={value}
        onChange={handleChange}
      >
        <option value="All">All</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}, (prevProps, nextProps) => 
  prevProps.value === nextProps.value && 
  prevProps.options.length === nextProps.options.length
);

// Memoized ward filter component
const WardFilter = memo(({ value, onChange, options }) => {
  const handleChange = useCallback((e) => {
    onChange('ward', e.target.value);
  }, [onChange]);

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">Ward Selection</label>
      <select
        className="w-full border rounded-md p-2 text-sm"
        value={value}
        onChange={handleChange}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}, (prevProps, nextProps) => 
  prevProps.value === nextProps.value && 
  prevProps.options.length === nextProps.options.length
);

// Memoized keyword filter with debounced input
const KeywordFilter = memo(({ value, onChange, placeholder }) => {
  const debouncedChange = useOptimizedDebounce(
    useCallback((keyword) => {
      onChange('keyword', keyword);
    }, [onChange]),
    300
  );

  const handleChange = useCallback((e) => {
    debouncedChange(e.target.value);
  }, [debouncedChange]);

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">Keyword Search</label>
      <input
        className="w-full border rounded-md p-2 text-sm"
        placeholder={placeholder || "e.g., roads, festival, development"}
        defaultValue={value}
        onChange={handleChange}
      />
    </div>
  );
}, (prevProps, nextProps) => 
  prevProps.placeholder === nextProps.placeholder
);

// Main optimized dashboard filters component
const OptimizedDashboardFilters = memo(({
  emotionFilter,
  wardSelection,
  keyword,
  wardOptions,
  onFilterChange
}) => {
  // Memoize emotion options to prevent recreation
  const emotionOptions = useMemo(() => [
    'Anger', 'Joy', 'Hopeful', 'Frustration', 'Fear', 
    'Sadness', 'Disgust', 'Positive', 'Negative', 'Admiration', 'Pride'
  ], []);

  // Optimized filter change handler
  const handleFilterChange = useCallback((filterType, value) => {
    onFilterChange({ [filterType]: value });
  }, [onFilterChange]);

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EmotionFilter
          value={emotionFilter}
          onChange={handleFilterChange}
          options={emotionOptions}
        />
        <WardFilter
          value={wardSelection}
          onChange={handleFilterChange}
          options={wardOptions}
        />
        <KeywordFilter
          value={keyword}
          onChange={handleFilterChange}
          placeholder="e.g., roads, festival, development"
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Deep comparison for optimization
  return (
    prevProps.emotionFilter === nextProps.emotionFilter &&
    prevProps.wardSelection === nextProps.wardSelection &&
    prevProps.keyword === nextProps.keyword &&
    prevProps.wardOptions.length === nextProps.wardOptions.length
  );
});

EmotionFilter.displayName = 'EmotionFilter';
WardFilter.displayName = 'WardFilter';  
KeywordFilter.displayName = 'KeywordFilter';
OptimizedDashboardFilters.displayName = 'OptimizedDashboardFilters';

export default OptimizedDashboardFilters;