import React from 'react';
import { StrategistErrorBoundary } from "../../shared/components/ui/EnhancedErrorBoundaries";
import IntelligenceFeed from '../../features/strategist/components/IntelligenceFeed';
import StrategistChat from '../../features/strategist/components/StrategistChat';
import { LazyStrategicWorkbench, LazyScenarioSimulator } from '../lazy/LazyTabComponents';

const StrategistTab = ({ selectedWard }) => {
  return (
    <div className="space-y-6">
      {/* Political Strategist Suite */}
      <div className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
        Political Strategist Suite
      </div>
      
      {/* Intelligence Feed & Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategistErrorBoundary componentName="Intelligence Feed">
          <IntelligenceFeed ward={selectedWard} />
        </StrategistErrorBoundary>
        
        <StrategistErrorBoundary componentName="AI Strategy Chat">
          <StrategistChat selectedWard={selectedWard} />
        </StrategistErrorBoundary>
      </div>
      
      {/* Strategic Workbench & Scenario Simulator - Lazy Loaded */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategistErrorBoundary componentName="Strategic Workbench">
          <LazyStrategicWorkbench />
        </StrategistErrorBoundary>
        
        <StrategistErrorBoundary componentName="Scenario Simulator">
          <LazyScenarioSimulator />
        </StrategistErrorBoundary>
      </div>
    </div>
  );
};

export default StrategistTab;