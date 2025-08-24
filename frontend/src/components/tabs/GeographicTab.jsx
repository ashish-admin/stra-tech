import React from 'react';
import ComponentErrorBoundary from '../ComponentErrorBoundary';
import CollapsibleSection from '../CollapsibleSection';
import { LazyLocationMap } from '../lazy/LazyTabComponents';
import StrategicSummary from '../StrategicSummary';
import EpaperFeed from '../EpaperFeed';

const GeographicTab = ({ 
  selectedWard, 
  geojson, 
  setSelectedWard, 
  summaryRef 
}) => {
  return (
    <div className="space-y-6">
      {/* Map + Strategic Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 xl:col-span-8 bg-white border rounded-md">
          <div className="p-4 font-medium">Geospatial Intelligence</div>
          <div className="p-4">
            <ComponentErrorBoundary
              componentName="Interactive Map"
              fallbackMessage="The interactive ward map is temporarily unavailable. Use the ward dropdown above for area selection."
            >
              <LazyLocationMap
                geojson={geojson}
                selectedWard={selectedWard}
                onWardSelect={setSelectedWard}
                matchHeightRef={summaryRef}
              />
            </ComponentErrorBoundary>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 bg-white border rounded-md" ref={summaryRef}>
          <div className="p-4 font-medium">Strategic Summary</div>
          <div className="p-4">
            <ComponentErrorBoundary
              componentName="Strategic Analysis"
              fallbackMessage={`AI-powered strategic analysis for ${selectedWard || 'the selected ward'} is temporarily unavailable.`}
            >
              <StrategicSummary selectedWard={selectedWard} />
            </ComponentErrorBoundary>
          </div>
        </div>
      </div>

      {/* Latest Regional News */}
      <CollapsibleSection
        title="Regional News Feed"
        priority="normal"
        defaultExpanded={true}
      >
        <ComponentErrorBoundary
          componentName="Latest Headlines"
          fallbackMessage="Latest news headlines are temporarily unavailable."
        >
          <EpaperFeed ward={selectedWard} limit={10} />
        </ComponentErrorBoundary>
      </CollapsibleSection>
    </div>
  );
};

export default GeographicTab;