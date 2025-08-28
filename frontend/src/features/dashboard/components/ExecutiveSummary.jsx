/**
 * ExecutiveSummary Component
 * LokDarpan Phase 2: Component Reorganization
 * 
 * High-level political intelligence summary with key metrics and insights.
 */

import React, { memo, useMemo } from 'react';
import { EnhancedCard, LoadingSkeleton } from '@shared/components/ui';
import { TrendingUp, TrendingDown, AlertTriangle, Users } from 'lucide-react';

/**
 * ExecutiveSummary - Strategic overview of political intelligence
 */
const ExecutiveSummary = memo(({
  ward,
  data,
  trends,
  loading = false
}) => {
  // Calculate key metrics from data
  const metrics = useMemo(() => {
    if (!data || !trends) return null;

    const totalMentions = trends?.parties?.reduce((sum, party) => sum + (party.mentions || 0), 0) || 0;
    const dominantParty = trends?.parties?.reduce((prev, current) => 
      (prev.mentions || 0) > (current.mentions || 0) ? prev : current
    );
    const emotionTrend = trends?.emotions?.find(e => e.emotion === 'hopeful')?.count || 0;
    const alertCount = data?.alerts?.length || 0;

    return {
      totalMentions,
      dominantParty: dominantParty?.party || 'N/A',
      sentiment: emotionTrend > 100 ? 'Positive' : emotionTrend > 50 ? 'Neutral' : 'Negative',
      alertLevel: alertCount > 5 ? 'High' : alertCount > 2 ? 'Medium' : 'Low'
    };
  }, [data, trends]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <LoadingSkeleton key={i} type="card" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <EnhancedCard title="Executive Summary" variant="default">
        <p className="text-gray-500 text-center py-4">
          No summary data available for {ward?.name}
        </p>
      </EnhancedCard>
    );
  }

  const summaryCards = [
    {
      title: 'Total Mentions',
      value: metrics.totalMentions.toLocaleString(),
      subtitle: 'Across all sources',
      icon: Users,
      trend: metrics.totalMentions > 1000 ? 'up' : 'down',
      color: 'blue'
    },
    {
      title: 'Dominant Party',
      value: metrics.dominantParty,
      subtitle: 'Highest mention share',
      icon: TrendingUp,
      trend: 'up',
      color: 'green'
    },
    {
      title: 'Sentiment Trend',
      value: metrics.sentiment,
      subtitle: 'Overall public mood',
      icon: metrics.sentiment === 'Positive' ? TrendingUp : TrendingDown,
      trend: metrics.sentiment === 'Positive' ? 'up' : 'down',
      color: metrics.sentiment === 'Positive' ? 'green' : metrics.sentiment === 'Neutral' ? 'yellow' : 'red'
    },
    {
      title: 'Alert Level',
      value: metrics.alertLevel,
      subtitle: 'Strategic attention needed',
      icon: AlertTriangle,
      trend: metrics.alertLevel === 'High' ? 'up' : 'down',
      color: metrics.alertLevel === 'High' ? 'red' : metrics.alertLevel === 'Medium' ? 'yellow' : 'green'
    }
  ];

  return (
    <div className="executive-summary">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Executive Summary - {ward?.name}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Real-time political intelligence overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <EnhancedCard
            key={index}
            variant="metric"
            hoverable
            className="metric-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <card.icon 
                    className={`
                      w-5 h-5
                      ${card.color === 'blue' ? 'text-blue-500' : ''}
                      ${card.color === 'green' ? 'text-green-500' : ''}
                      ${card.color === 'yellow' ? 'text-yellow-500' : ''}
                      ${card.color === 'red' ? 'text-red-500' : ''}
                    `} 
                  />
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.title}
                  </h3>
                </div>
                
                <div className="mb-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {card.subtitle}
                </p>
              </div>

              {/* Trend Indicator */}
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full
                ${card.trend === 'up' 
                  ? 'bg-green-100 dark:bg-green-900/20' 
                  : 'bg-red-100 dark:bg-red-900/20'
                }
              `}>
                {card.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </EnhancedCard>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="mt-8">
        <EnhancedCard title="Quick Insights" variant="insight">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>{metrics.dominantParty}</strong> is currently leading in political discussions 
                with the highest mention share in {ward?.name}.
              </p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Public sentiment is currently <strong>{metrics.sentiment.toLowerCase()}</strong>, 
                based on analysis of recent social media and news coverage.
              </p>
            </div>
            
            {metrics.alertLevel === 'High' && (
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>High alert:</strong> Multiple intelligence alerts require immediate attention.
                </p>
              </div>
            )}
          </div>
        </EnhancedCard>
      </div>
    </div>
  );
});

ExecutiveSummary.displayName = 'ExecutiveSummary';

export default ExecutiveSummary;