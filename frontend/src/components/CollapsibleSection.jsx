import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Info, 
  Zap,
  Maximize2,
  Minimize2
} from 'lucide-react';

// Priority levels with associated styling and behavior
const PRIORITY_CONFIG = {
  critical: {
    defaultExpanded: true,
    borderColor: 'border-red-200',
    headerBg: 'bg-red-50',
    textColor: 'text-red-900',
    icon: AlertCircle,
    badgeColor: 'bg-red-100 text-red-800'
  },
  high: {
    defaultExpanded: true,
    borderColor: 'border-orange-200',
    headerBg: 'bg-orange-50',
    textColor: 'text-orange-900',
    icon: Zap,
    badgeColor: 'bg-orange-100 text-orange-800'
  },
  normal: {
    defaultExpanded: false,
    borderColor: 'border-gray-200',
    headerBg: 'bg-gray-50',
    textColor: 'text-gray-900',
    icon: Info,
    badgeColor: 'bg-gray-100 text-gray-700'
  },
  optional: {
    defaultExpanded: false,
    borderColor: 'border-gray-100',
    headerBg: 'bg-gray-25',
    textColor: 'text-gray-700',
    icon: Info,
    badgeColor: 'bg-gray-50 text-gray-600'
  }
};

const CollapsibleSection = ({
  title,
  children,
  priority = 'normal',
  defaultExpanded = null,
  badge = null,
  subtitle = null,
  loading = false,
  error = null,
  onToggle = null,
  enableFocusMode = false,
  className = "",
  headerClassName = "",
  contentClassName = "",
  animationDuration = 200,
  ...props
}) => {
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  const initialExpanded = defaultExpanded !== null 
    ? defaultExpanded 
    : priorityConfig.defaultExpanded;
  
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef(null);
  const sectionId = useRef(`section-${Math.random().toString(36).substr(2, 9)}`);

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, children]);

  // Handle expand/collapse with callback
  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(newExpanded, sectionId.current);
  };

  // Handle focus mode toggle
  const handleFocusMode = (e) => {
    e.stopPropagation();
    setIsFocusMode(!isFocusMode);
  };

  // Save expansion state to localStorage
  useEffect(() => {
    const key = `collapsible-${title.replace(/\s+/g, '-').toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(isExpanded));
  }, [isExpanded, title]);

  // Restore expansion state from localStorage on mount
  useEffect(() => {
    const key = `collapsible-${title.replace(/\s+/g, '-').toLowerCase()}`;
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        const savedExpanded = JSON.parse(saved);
        setIsExpanded(savedExpanded);
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
  }, [title]);

  const PriorityIcon = priorityConfig.icon;
  const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;
  const FocusIcon = isFocusMode ? Minimize2 : Maximize2;

  return (
    <div 
      className={`
        collapsible-section bg-white rounded-lg border transition-all duration-200
        ${priorityConfig.borderColor}
        ${isFocusMode ? 'fixed inset-4 z-50 shadow-2xl' : 'shadow-sm'}
        ${className}
      `}
      id={sectionId.current}
      data-priority={priority}
      data-expanded={isExpanded}
      {...props}
    >
      {/* Section Header */}
      <header 
        className={`
          flex items-center justify-between px-4 py-3 cursor-pointer rounded-t-lg
          hover:bg-opacity-80 transition-colors duration-150
          ${priorityConfig.headerBg}
          ${headerClassName}
        `}
        onClick={handleToggle}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={`${sectionId.current}-content`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className="flex items-center flex-1 min-w-0">
          {/* Priority indicator */}
          <PriorityIcon className={`w-4 h-4 mr-2 flex-shrink-0 ${priorityConfig.textColor}`} />
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium ${priorityConfig.textColor}`}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-600 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Badge */}
          {badge && (
            <span className={`
              ml-2 px-2 py-0.5 text-xs rounded-full font-medium
              ${priorityConfig.badgeColor}
            `}>
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-1 ml-2">
          {/* Focus mode toggle */}
          {enableFocusMode && (
            <button
              onClick={handleFocusMode}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
              aria-label={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
            >
              <FocusIcon className="w-3 h-3" />
            </button>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          )}

          {/* Error indicator */}
          {error && (
            <AlertCircle className="w-4 h-4 text-red-500" title={error} />
          )}

          {/* Expand/collapse icon */}
          <ChevronIcon className={`w-4 h-4 transition-transform duration-150 ${priorityConfig.textColor}`} />
        </div>
      </header>

      {/* Section Content */}
      <div
        id={`${sectionId.current}-content`}
        className="overflow-hidden transition-all ease-in-out"
        style={{ 
          height: contentHeight,
          transitionDuration: `${animationDuration}ms`
        }}
        aria-hidden={!isExpanded}
      >
        <div 
          ref={contentRef}
          className={`p-4 ${contentClassName}`}
        >
          {error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>

      {/* Focus mode overlay */}
      {isFocusMode && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsFocusMode(false)}
          aria-label="Click to exit focus mode"
        />
      )}
    </div>
  );
};

// Section Group Component for managing multiple sections
const SectionGroup = ({ 
  children, 
  enableExpandAll = true,
  className = "",
  ...props 
}) => {
  const [expandedSections, setExpandedSections] = useState(new Set());

  const handleSectionToggle = (expanded, sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (expanded) {
      newExpanded.add(sectionId);
    } else {
      newExpanded.delete(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleExpandAll = () => {
    // Get all section elements and expand them
    const sections = document.querySelectorAll('.collapsible-section');
    sections.forEach(section => {
      const header = section.querySelector('[role="button"]');
      if (header && header.getAttribute('aria-expanded') === 'false') {
        header.click();
      }
    });
  };

  const handleCollapseAll = () => {
    // Get all section elements and collapse them
    const sections = document.querySelectorAll('.collapsible-section');
    sections.forEach(section => {
      const header = section.querySelector('[role="button"]');
      if (header && header.getAttribute('aria-expanded') === 'true') {
        header.click();
      }
    });
  };

  return (
    <div className={`section-group space-y-4 ${className}`} {...props}>
      {/* Group controls */}
      {enableExpandAll && (
        <div className="flex justify-end space-x-2 mb-4">
          <button
            onClick={handleExpandAll}
            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:border-gray-400 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:border-gray-400 transition-colors"
          >
            Collapse All
          </button>
        </div>
      )}

      {/* Sections */}
      {React.Children.map(children, child =>
        React.isValidElement(child) && child.type === CollapsibleSection
          ? React.cloneElement(child, { onToggle: handleSectionToggle })
          : child
      )}
    </div>
  );
};

export default CollapsibleSection;
export { SectionGroup, PRIORITY_CONFIG };