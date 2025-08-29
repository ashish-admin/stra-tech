import React from 'react';
import { DashboardErrorBoundary } from "../../shared/components/ui/EnhancedErrorBoundaries";
import CollapsibleSection from '../CollapsibleSection';
import CompetitiveAnalysis from '../CompetitiveAnalysis';
import CompetitorBenchmark from '../CompetitorBenchmark';
import CompetitorTrendChart from '../CompetitorTrendChart';

const CompetitiveTab = ({ 
  selectedWard, 
  filteredPosts, 
  compAgg, 
  loading 
}) => {
  return (
    <div className="space-y-6">
      {/* Primary Competitive Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Competitive Analysis</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading analysis…</div>
          ) : (
            <DashboardErrorBoundary
              componentName="Competitive Analysis"
              fallbackMessage="Party comparison analysis is temporarily unavailable."
            >
              <CompetitiveAnalysis data={compAgg} posts={filteredPosts} />
            </DashboardErrorBoundary>
          )}
        </div>

        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Competitive Benchmark</h3>
          <DashboardErrorBoundary
            componentName="Competitive Benchmark"
            fallbackMessage="Performance benchmarking is temporarily unavailable."
          >
            <CompetitorBenchmark ward={selectedWard} posts={filteredPosts} />
          </DashboardErrorBoundary>
        </div>
      </div>

      {/* Competitive Trends */}
      <CollapsibleSection
        title="Competitive Timeline"
        priority="high"
        defaultExpanded={true}
        contentClassName="p-0"
      >
        <div className="p-4">
          <h3 className="font-medium mb-4">Party Competition Over Time</h3>
          <DashboardErrorBoundary
            componentName="Competitor Trend Chart"
            fallbackMessage="Competitor timeline analysis is temporarily unavailable."
          >
            <CompetitorTrendChart ward={selectedWard} days={30} />
          </DashboardErrorBoundary>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default CompetitiveTab;