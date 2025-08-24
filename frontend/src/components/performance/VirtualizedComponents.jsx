import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List, VariableSizeList, areEqual } from 'react-window';
import { useIntersectionOptimizer } from '../../hooks/usePerformanceOptimizations';

// Virtualized Post Item with performance optimization
const VirtualizedPostItem = memo(({ index, style, data }) => {
  const post = data.posts[index];
  const { onItemClick, selectedItems } = data;
  
  const isSelected = selectedItems?.has(post.id);
  
  const handleClick = useCallback((e) => {
    e.preventDefault();
    onItemClick?.(post, index);
  }, [post, index, onItemClick]);

  return (
    <div 
      style={style}
      className={`
        border-b border-gray-100 p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150
        ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* Emotion indicator */}
        <div className={`
          w-3 h-3 rounded-full mt-1 flex-shrink-0
          ${post.emotion === 'Positive' ? 'bg-green-400' :
            post.emotion === 'Negative' ? 'bg-red-400' :
            post.emotion === 'Hopeful' ? 'bg-blue-400' : 'bg-gray-400'}
        `} />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {post.emotion || 'Unknown'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(post.created_at || post.timestamp).toLocaleDateString()}
            </span>
          </div>
          
          <p className="text-sm text-gray-900 line-clamp-2">
            {(post.text || post.content || '').slice(0, 200)}
            {(post.text || post.content || '').length > 200 && '...'}
          </p>
          
          {post.party && (
            <div className="mt-2 flex items-center">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {post.party}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, areEqual);

// Virtualized Posts List with performance optimizations
export const VirtualizedPostsList = memo(({ 
  posts = [],
  height = 600,
  itemHeight = 120,
  onItemClick,
  selectedItems,
  loading = false
}) => {
  const listRef = useRef(null);
  const [overscan, setOverscan] = useState(5);

  // Memoized item data to prevent recreation on every render
  const itemData = useMemo(() => ({
    posts,
    onItemClick,
    selectedItems
  }), [posts, onItemClick, selectedItems]);

  // Performance optimization: adjust overscan based on scroll performance
  const handleScroll = useCallback(({ scrollDirection, scrollOffset }) => {
    // Reduce overscan when scrolling fast for better performance
    const newOverscan = Math.abs(scrollDirection) > 20 ? 3 : 5;
    if (newOverscan !== overscan) {
      setOverscan(newOverscan);
    }
  }, [overscan]);

  // Scroll to item method
  const scrollToItem = useCallback((index, align = 'auto') => {
    listRef.current?.scrollToItem(index, align);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="flex items-center justify-center bg-gray-50" style={{ height }}>
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-2">📭</div>
          <p className="text-sm text-gray-600">No posts found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <List
        ref={listRef}
        height={height}
        itemCount={posts.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={overscan}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {VirtualizedPostItem}
      </List>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.posts.length === nextProps.posts.length &&
    prevProps.height === nextProps.height &&
    prevProps.itemHeight === nextProps.itemHeight &&
    prevProps.loading === nextProps.loading &&
    JSON.stringify(prevProps.selectedItems) === JSON.stringify(nextProps.selectedItems)
  );
});

// Variable-size virtualized alerts list
const VirtualizedAlertItem = memo(({ index, style, data }) => {
  const alert = data.alerts[index];
  const { onAlertAction } = data;
  
  const handleAction = useCallback((action) => {
    onAlertAction?.(alert, action, index);
  }, [alert, index, onAlertAction]);

  const priorityColors = {
    high: 'bg-red-50 border-red-200 text-red-900',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    low: 'bg-blue-50 border-blue-200 text-blue-900'
  };

  return (
    <div style={style} className="px-4 py-2">
      <div className={`
        rounded-lg border p-3 transition-all duration-150
        ${priorityColors[alert.priority] || priorityColors.medium}
      `}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wide">
                {alert.priority} Priority
              </span>
              <span className="text-xs text-gray-500">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <h4 className="font-medium mb-1">{alert.title}</h4>
            <p className="text-sm opacity-80">{alert.message}</p>
            
            {alert.actionableItems?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {alert.actionableItems.slice(0, 3).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAction(action)}
                    className="text-xs bg-white bg-opacity-50 hover:bg-opacity-70 px-2 py-1 rounded transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, areEqual);

export const VirtualizedAlertsList = memo(({ 
  alerts = [],
  height = 400,
  onAlertAction,
  loading = false
}) => {
  const listRef = useRef(null);

  // Variable item size calculation
  const getItemSize = useCallback((index) => {
    const alert = alerts[index];
    const baseHeight = 100;
    const actionItemsHeight = (alert.actionableItems?.length || 0) * 20;
    const messageHeight = Math.ceil((alert.message || '').length / 50) * 16;
    
    return baseHeight + actionItemsHeight + messageHeight;
  }, [alerts]);

  // Memoized item data
  const itemData = useMemo(() => ({
    alerts,
    onAlertAction
  }), [alerts, onAlertAction]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  if (!alerts.length) {
    return (
      <div className="flex items-center justify-center bg-gray-50" style={{ height }}>
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-2">🔔</div>
          <p className="text-sm text-gray-600">No alerts at this time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <VariableSizeList
        ref={listRef}
        height={height}
        itemCount={alerts.length}
        itemSize={getItemSize}
        itemData={itemData}
        overscanCount={2}
        className="scrollbar-thin scrollbar-thumb-red-300 scrollbar-track-red-100"
      >
        {VirtualizedAlertItem}
      </VariableSizeList>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.alerts.length === nextProps.alerts.length &&
    prevProps.height === nextProps.height &&
    prevProps.loading === nextProps.loading &&
    JSON.stringify(prevProps.alerts.map(a => a.id)) === JSON.stringify(nextProps.alerts.map(a => a.id))
  );
});

// Virtualized table for large datasets
export const VirtualizedTable = memo(({ 
  data = [],
  columns = [],
  height = 400,
  rowHeight = 50,
  onRowClick,
  loading = false
}) => {
  const listRef = useRef(null);
  
  // Row component with performance optimization
  const Row = memo(({ index, style }) => {
    const item = data[index];
    const isEven = index % 2 === 0;
    
    const handleRowClick = useCallback(() => {
      onRowClick?.(item, index);
    }, [item, index]);

    return (
      <div 
        style={style}
        className={`
          flex items-center border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors
          ${isEven ? 'bg-white' : 'bg-gray-50'}
        `}
        onClick={handleRowClick}
      >
        {columns.map((column, colIndex) => (
          <div
            key={column.key}
            className="flex-shrink-0 px-4 py-3 text-sm"
            style={{ width: column.width || 'auto' }}
          >
            {column.render ? column.render(item[column.key], item, index) : item[column.key]}
          </div>
        ))}
      </div>
    );
  }, areEqual);

  if (loading) {
    return (
      <div className="flex items-center justify-center border border-gray-200 rounded-lg" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex bg-gray-100 border-b border-gray-200 font-medium text-sm text-gray-700">
        {columns.map((column) => (
          <div
            key={column.key}
            className="flex-shrink-0 px-4 py-3"
            style={{ width: column.width || 'auto' }}
          >
            {column.title}
          </div>
        ))}
      </div>
      
      {/* Virtual rows */}
      <List
        ref={listRef}
        height={height - 45} // Account for header
        itemCount={data.length}
        itemSize={rowHeight}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {Row}
      </List>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.data.length === nextProps.data.length &&
    prevProps.columns.length === nextProps.columns.length &&
    prevProps.height === nextProps.height &&
    prevProps.rowHeight === nextProps.rowHeight &&
    prevProps.loading === nextProps.loading
  );
});

// Intersection observer hook for lazy loading
export const useVirtualizedLazyLoading = (containerRef, threshold = 0.1) => {
  const [visibleItems, setVisibleItems] = useState(new Set());
  const { observe, unobserve } = useIntersectionOptimizer({ threshold });

  const registerItem = useCallback((element, id) => {
    if (element) {
      observe(element, (entry) => {
        setVisibleItems(prev => {
          const newSet = new Set(prev);
          if (entry.isIntersecting) {
            newSet.add(id);
          } else {
            newSet.delete(id);
          }
          return newSet;
        });
      });
    } else {
      // Cleanup when element is removed
      setVisibleItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [observe]);

  return {
    visibleItems,
    registerItem
  };
};

VirtualizedPostItem.displayName = 'VirtualizedPostItem';
VirtualizedPostsList.displayName = 'VirtualizedPostsList';
VirtualizedAlertItem.displayName = 'VirtualizedAlertItem';
VirtualizedAlertsList.displayName = 'VirtualizedAlertsList';
VirtualizedTable.displayName = 'VirtualizedTable';

export default {
  VirtualizedPostsList,
  VirtualizedAlertsList,
  VirtualizedTable,
  useVirtualizedLazyLoading
};