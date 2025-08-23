/**
 * Strategist Briefing - Main strategic analysis display component
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Clock, 
  Shield, 
  Eye,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function StrategistBriefing({ briefing, isLoading, ward, onRefresh }) {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    intelligence: true,
    opportunities: true,
    threats: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="text-center py-8">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
          <p className="text-gray-500 mb-4">Strategic analysis for {ward} is not available</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Generate Analysis
          </button>
        </div>
      </div>
    );
  }

  const confidenceColor = briefing.confidence_score >= 0.8 ? 'text-green-600' :
                         briefing.confidence_score >= 0.6 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white border rounded-lg">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Strategic Intelligence Brief</h3>
            <p className="text-sm text-gray-500">
              {ward} • Generated {new Date(briefing.generated_at).toLocaleString()}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Confidence</div>
              <div className={`font-medium ${confidenceColor}`}>
                {Math.round(briefing.confidence_score * 100)}%
              </div>
            </div>
            
            {briefing.fallback_mode && (
              <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                Fallback Mode
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Strategic Overview */}
        <CollapsibleSection
          title="Strategic Overview"
          icon={<TrendingUp className="h-4 w-4" />}
          isExpanded={expandedSections.overview}
          onToggle={() => toggleSection('overview')}
        >
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {briefing.strategic_overview || 'No strategic overview available'}
            </p>
          </div>
        </CollapsibleSection>

        {/* Key Intelligence */}
        <CollapsibleSection
          title="Key Intelligence"
          icon={<Eye className="h-4 w-4" />}
          isExpanded={expandedSections.intelligence}
          onToggle={() => toggleSection('intelligence')}
          badge={briefing.key_intelligence?.length || 0}
        >
          <div className="space-y-3">
            {briefing.key_intelligence?.length > 0 ? (
              briefing.key_intelligence.map((intel, index) => (
                <IntelligenceItem key={index} intelligence={intel} />
              ))
            ) : (
              <p className="text-gray-500 text-sm">No key intelligence available</p>
            )}
          </div>
        </CollapsibleSection>

        {/* Opportunities and Threats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opportunities */}
          <CollapsibleSection
            title="Opportunities"
            icon={<Target className="h-4 w-4 text-green-600" />}
            isExpanded={expandedSections.opportunities}
            onToggle={() => toggleSection('opportunities')}
            badge={briefing.opportunities?.length || 0}
            className="bg-green-50 border-green-200"
          >
            <div className="space-y-3">
              {briefing.opportunities?.length > 0 ? (
                briefing.opportunities.map((opportunity, index) => (
                  <OpportunityItem key={index} opportunity={opportunity} />
                ))
              ) : (
                <p className="text-gray-500 text-sm">No opportunities identified</p>
              )}
            </div>
          </CollapsibleSection>

          {/* Threats */}
          <CollapsibleSection
            title="Threats"
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            isExpanded={expandedSections.threats}
            onToggle={() => toggleSection('threats')}
            badge={briefing.threats?.length || 0}
            className="bg-red-50 border-red-200"
          >
            <div className="space-y-3">
              {briefing.threats?.length > 0 ? (
                briefing.threats.map((threat, index) => (
                  <ThreatItem key={index} threat={threat} />
                ))
              ) : (
                <p className="text-gray-500 text-sm">No threats identified</p>
              )}
            </div>
          </CollapsibleSection>
        </div>

        {/* Source Citations */}
        {briefing.source_citations?.length > 0 && (
          <CollapsibleSection
            title="Source Citations"
            icon={<ExternalLink className="h-4 w-4" />}
            isExpanded={false}
            onToggle={() => toggleSection('citations')}
            badge={briefing.source_citations.length}
          >
            <div className="space-y-2">
              {briefing.source_citations.map((citation, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">{citation.title}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-500">{citation.source}</span>
                  {citation.date && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">{new Date(citation.date).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

// Supporting components
function CollapsibleSection({ title, icon, children, isExpanded, onToggle, badge, className = "" }) {
  return (
    <div className={`border rounded-lg ${className}`}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
          {badge !== undefined && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

function IntelligenceItem({ intelligence }) {
  const impactColor = {
    'critical': 'text-red-600 bg-red-100',
    'high': 'text-orange-600 bg-orange-100',
    'medium': 'text-yellow-600 bg-yellow-100',
    'low': 'text-blue-600 bg-blue-100'
  }[intelligence.impact_level] || 'text-gray-600 bg-gray-100';

  return (
    <div className="p-3 border rounded-lg bg-gray-50">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase">
          {intelligence.category}
        </span>
        <span className={`px-2 py-1 text-xs font-medium rounded ${impactColor}`}>
          {intelligence.impact_level}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-2">{intelligence.content}</p>
      {intelligence.actionable && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <Target className="h-3 w-3" />
          <span>Actionable</span>
        </div>
      )}
    </div>
  );
}

function OpportunityItem({ opportunity }) {
  return (
    <div className="p-3 border border-green-200 rounded-lg bg-white">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-green-800 text-sm">Priority {opportunity.priority}</h4>
        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
          {opportunity.timeline}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-2">{opportunity.description}</p>
      {opportunity.success_metrics?.length > 0 && (
        <div className="text-xs text-gray-500">
          <strong>Success Metrics:</strong> {opportunity.success_metrics.join(', ')}
        </div>
      )}
    </div>
  );
}

function ThreatItem({ threat }) {
  const severityColor = {
    'critical': 'text-red-600 bg-red-100',
    'high': 'text-orange-600 bg-orange-100', 
    'medium': 'text-yellow-600 bg-yellow-100',
    'low': 'text-blue-600 bg-blue-100'
  }[threat.severity] || 'text-gray-600 bg-gray-100';

  return (
    <div className="p-3 border border-red-200 rounded-lg bg-white">
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-medium px-2 py-1 rounded ${severityColor}`}>
          {threat.severity}
        </span>
        <span className="text-xs text-red-600">
          {threat.timeline}
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-2">{threat.description}</p>
      {threat.mitigation_strategy && (
        <div className="text-xs text-gray-600">
          <strong>Mitigation:</strong> {threat.mitigation_strategy}
        </div>
      )}
    </div>
  );
}