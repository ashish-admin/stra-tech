import React from 'react';
import { useWard } from '../../context/WardContext';
import { DashboardErrorBoundary } from "../../shared/components/ui/EnhancedErrorBoundaries";
import DashboardHealthIndicator from '../DashboardHealthIndicator';
import ExecutiveSummary from '../ExecutiveSummary';
import CollapsibleSection from '../CollapsibleSection';
import AlertsPanel from '../AlertsPanel';
import WardMetaPanel from '../WardMetaPanel';
import { 
  ConnectionStatusIndicator, 
  IntelligenceActivityIndicator 
} from '../../features/strategist/components/ProgressIndicators';

const OverviewTab = ({ 
  selectedWard,
  filteredPosts,
  wardIdForMeta,
  connectionState,
  intelligenceSummary,
  tabBadges,
  onNavigateToTab 
}) => {
  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <ExecutiveSummary 
        selectedWard={selectedWard}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Dashboard Health Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DashboardHealthIndicator />
        </div>
        
        {/* Stream A Intelligence Activity */}
        {selectedWard !== 'All' && (
          <div className="space-y-2">
            <ConnectionStatusIndicator 
              connectionState={connectionState}
              className="text-xs"
            />
            <IntelligenceActivityIndicator 
              summary={intelligenceSummary}
              className="text-xs"
            />
          </div>
        )}
      </div>

      {/* Critical Intelligence Alerts */}
      <CollapsibleSection
        title="Intelligence Alerts"
        priority="critical"
        badge={tabBadges?.overview}
        defaultExpanded={true}
      >
        <DashboardErrorBoundary
          componentName="Intelligence Alerts"
          fallbackMessage="Real-time intelligence alerts are temporarily unavailable."
        >
          <AlertsPanel posts={filteredPosts} ward={selectedWard} />
        </DashboardErrorBoundary>
      </CollapsibleSection>

      {/* Ward Demographics */}
      <CollapsibleSection
        title="Ward Demographics"
        priority="normal"
        defaultExpanded={false}
      >
        <DashboardErrorBoundary
          componentName="Ward Meta Panel"
          fallbackMessage="Ward demographic information is temporarily unavailable."
        >
          <WardMetaPanel wardId={wardIdForMeta} />
        </DashboardErrorBoundary>
      </CollapsibleSection>
    </div>
  );
};

export default OverviewTab;