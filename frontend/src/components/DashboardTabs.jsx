import React, { useEffect } from 'react';
import { 
  BarChart3, 
  Heart, 
  Target, 
  Map, 
  Bot,
  ChevronRight 
} from 'lucide-react';

// Tab configuration for political intelligence dashboard
const TAB_CONFIGURATION = {
  overview: {
    id: 'overview',
    label: 'Campaign Overview',
    icon: BarChart3,
    description: 'Executive summary and key intelligence',
    badge: null,
    priority: 'critical'
  },
  sentiment: {
    id: 'sentiment',
    label: 'Sentiment Analysis',
    icon: Heart,
    description: 'Public opinion and emotional trends',
    badge: null,
    priority: 'high'
  },
  competitive: {
    id: 'competitive',
    label: 'Competitive Intel',
    icon: Target,
    description: 'Party analysis and benchmarking',
    badge: null,
    priority: 'high'
  },
  geographic: {
    id: 'geographic',
    label: 'Geographic View',
    icon: Map,
    description: 'Ward-based spatial intelligence',
    badge: null,
    priority: 'normal'
  },
  strategist: {
    id: 'strategist',
    label: 'AI Strategist',
    icon: Bot,
    description: 'Strategic workbench and AI analysis',
    badge: null,
    priority: 'normal'
  }
};

const TabButton = ({ 
  tab, 
  isActive, 
  onClick, 
  badge = null,
  className = "",
  ...props 
}) => {
  const Icon = tab.icon;
  
  return (
    <button
      onClick={() => onClick(tab.id)}
      className={`
        flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${isActive 
          ? 'bg-blue-50 text-blue-700 border-blue-200 border shadow-sm' 
          : 'text-gray-600 border border-transparent hover:text-gray-900'
        }
        ${className}
      `}
      title={tab.description}
      aria-selected={isActive}
      role="tab"
      {...props}
    >
      <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
      <span className="hidden sm:inline">{tab.label}</span>
      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
      
      {badge && badge > 0 && (
        <span className={`
          ml-2 px-2 py-0.5 text-xs rounded-full
          ${isActive 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-700'
          }
        `}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      
      {isActive && (
        <ChevronRight className="w-3 h-3 ml-1 text-blue-500" />
      )}
    </button>
  );
};

const DashboardTabs = ({ 
  activeTab = 'overview', 
  onTabChange,
  badges = {},
  className = "",
  enableKeyboardNav = true,
  ...props 
}) => {
  // Handle keyboard navigation (Alt+1-5 for tabs)
  useEffect(() => {
    if (!enableKeyboardNav) return;

    const handleKeyDown = (event) => {
      if (event.altKey && !event.ctrlKey && !event.shiftKey) {
        const tabIds = Object.keys(TAB_CONFIGURATION);
        const keyNum = parseInt(event.key);
        
        if (keyNum >= 1 && keyNum <= tabIds.length) {
          event.preventDefault();
          const targetTab = tabIds[keyNum - 1];
          handleTabChange(targetTab);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNav, onTabChange]);

  const handleTabChange = (tabId) => {
    // Directly call parent's onTabChange - no internal state management
    onTabChange?.(tabId);
    
    // Update URL parameter for deep linking
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
  };

  // Initialize tab from URL parameter on mount only
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('tab');
    if (urlTab && TAB_CONFIGURATION[urlTab] && urlTab !== activeTab) {
      onTabChange?.(urlTab);
    }
  }, [onTabChange, activeTab]); // Include dependencies but effect runs only when needed

  return (
    <div 
      className={`border-b border-gray-200 bg-white ${className}`}
      role="tablist"
      aria-label="Dashboard navigation tabs"
      {...props}
    >
      {/* Tab navigation */}
      <div className="flex space-x-1 px-4 py-2 overflow-x-auto scrollbar-hide">
        {Object.values(TAB_CONFIGURATION).map((tab, index) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={handleTabChange}
            badge={badges[tab.id]}
            data-testid={`tab-${tab.id}`}
            aria-label={`${tab.label} (Alt+${index + 1})`}
          />
        ))}
      </div>

      {/* Active tab description */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-600">
          {TAB_CONFIGURATION[activeTab]?.description}
          <span className="ml-2 text-gray-400">
            (Alt+{Object.keys(TAB_CONFIGURATION).indexOf(activeTab) + 1})
          </span>
        </p>
      </div>
    </div>
  );
};

// Export both components and configuration
export default DashboardTabs;
export { TabButton, TAB_CONFIGURATION };