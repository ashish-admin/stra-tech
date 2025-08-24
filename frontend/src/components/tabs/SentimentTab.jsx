import React from 'react';
import ComponentErrorBoundary from '../ComponentErrorBoundary';
import CollapsibleSection from '../CollapsibleSection';
import EmotionChart from '../EmotionChart';
import TopicAnalysis from '../TopicAnalysis';
import TimeSeriesChart from '../TimeSeriesChart';
import PredictionSummary from '../PredictionSummary';

const SentimentTab = ({ 
  selectedWard, 
  filteredPosts, 
  keyword, 
  loading 
}) => {
  return (
    <div className="space-y-6">
      {/* Core Sentiment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Sentiment Overview</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading chart data…</div>
          ) : (
            <ComponentErrorBoundary
              componentName="Sentiment Chart"
              fallbackMessage="Sentiment visualization is temporarily unavailable."
            >
              <EmotionChart posts={filteredPosts} />
            </ComponentErrorBoundary>
          )}
        </div>

        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Topic Analysis</h3>
          <ComponentErrorBoundary
            componentName="Topic Analysis"
            fallbackMessage="Topic clustering analysis is temporarily unavailable."
          >
            <TopicAnalysis ward={selectedWard} keyword={keyword} posts={filteredPosts} />
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* Time Series Analysis */}
      <CollapsibleSection
        title="Historical Trends"
        priority="high"
        defaultExpanded={true}
      >
        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Trend: Emotions & Share of Voice</h3>
          <ComponentErrorBoundary
            componentName="Time Series Chart"
            fallbackMessage="Historical trend analysis is temporarily unavailable."
          >
            <TimeSeriesChart ward={selectedWard} days={30} />
          </ComponentErrorBoundary>
        </div>
      </CollapsibleSection>

      {/* Predictive Analysis */}
      <CollapsibleSection
        title="Predictive Outlook"
        priority="normal"
        defaultExpanded={false}
      >
        <div className="bg-white border rounded-md p-4">
          <ComponentErrorBoundary
            componentName="Predictive Analysis"
            fallbackMessage="Electoral prediction analysis is temporarily unavailable."
          >
            <PredictionSummary ward={selectedWard} posts={filteredPosts} />
          </ComponentErrorBoundary>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default SentimentTab;