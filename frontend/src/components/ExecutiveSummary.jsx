import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Target,
  Clock,
  ChevronRight,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { joinApi } from '../lib/api';
import { ExecutiveSummarySkeleton, SmoothTransition } from './ui/LoadingSkeleton';

// Helper function to calculate campaign health score
const calculateCampaignHealth = (sentimentData, engagementData, momentum) => {
  const sentimentScore = sentimentData?.positive ? 
    (sentimentData.positive / (sentimentData.positive + sentimentData.negative)) * 100 : 50;
  
  const engagementScore = engagementData?.total ? 
    Math.min((engagementData.total / 100) * 100, 100) : 30;
  
  const momentumScore = momentum || 50;
  
  return Math.round((sentimentScore * 0.4) + (engagementScore * 0.3) + (momentumScore * 0.3));
};

// Individual summary card component with Sprint 2 enhancements
const SummaryCard = ({ 
  title, 
  value, 
  trend = null, 
  icon: Icon, 
  color = 'blue',
  onClick = null,
  loading = false,
  subtitle = null,
  actionLabel = null,
  cardIndex = 0 // For keyboard navigation
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  const trendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : null;
  const TrendIcon = trendIcon;

  return (
    <div 
      className={`
        executive-summary-card p-4 rounded-lg border transition-smooth
        ${colorClasses[color] || colorClasses.blue}
        ${onClick ? 'hover:shadow-md transform hover:-translate-y-0.5' : ''}
        ${loading ? 'animate-pulse-enhanced' : ''}
      `}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${title}: ${loading ? 'Loading' : value}${trend !== null ? `, trend ${trend > 0 ? 'up' : 'down'} ${Math.abs(trend)}%` : ''}`}
      data-card-index={cardIndex}
      data-component="executive-summary-card"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" />
        {trend !== null && TrendIcon && (
          <div className={`flex items-center text-xs ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            <TrendIcon className="w-3 h-3 mr-1" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-xs font-medium opacity-90">{title}</p>
        <p className="text-lg font-bold">
          {loading ? '...' : value}
        </p>
        {subtitle && (
          <p className="text-xs opacity-75">{subtitle}</p>
        )}
      </div>

      {(onClick && actionLabel) && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-current border-opacity-20">
          <span className="text-xs opacity-90">{actionLabel}</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

const ExecutiveSummary = ({ 
  selectedWard, // FIXED: Removed default 'All' - should come from props/context
  onNavigateToTab = null,
  refreshInterval = 30000, // 30 seconds
  className = ""
}) => {
  // State for aggregated data
  const [summaryData, setSummaryData] = useState({
    campaignHealth: null,
    topIssues: [],
    competitivePosition: null,
    criticalAlerts: [],
    momentum: null,
    loading: true,
    error: null,
    lastUpdated: null
  });

  // Fetch and aggregate summary data
  const fetchSummaryData = async () => {
    setSummaryData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Parallel API calls for efficiency
      const [postsResponse, trendsResponse, alertsResponse, competitiveResponse] = await Promise.all([
        axios.get(joinApi(`api/v1/posts${selectedWard !== 'All' ? `?city=${encodeURIComponent(selectedWard)}` : ''}`), 
          { withCredentials: true }),
        axios.get(joinApi(`api/v1/trends?ward=${encodeURIComponent(selectedWard)}&days=7`), 
          { withCredentials: true }),
        axios.get(joinApi(`api/v1/alerts/${encodeURIComponent(selectedWard)}`), 
          { withCredentials: true }).catch(() => ({ data: [] })), // Optional endpoint
        axios.get(joinApi(`api/v1/competitive-analysis?city=${encodeURIComponent(selectedWard)}`), 
          { withCredentials: true })
      ]);

      const posts = Array.isArray(postsResponse.data) ? postsResponse.data : postsResponse.data?.items || [];
      const trends = trendsResponse.data || {};
      const alerts = Array.isArray(alertsResponse.data) ? alertsResponse.data : [];
      const competitive = competitiveResponse.data || {};

      // Process sentiment data
      const emotionCounts = {};
      posts.forEach(post => {
        const emotion = post.emotion || post.detected_emotion || 'neutral';
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });

      const positiveEmotions = ['joy', 'hopeful', 'admiration', 'pride', 'positive'];
      const negativeEmotions = ['anger', 'frustration', 'fear', 'sadness', 'disgust', 'negative'];
      
      const sentimentData = {
        positive: positiveEmotions.reduce((sum, emotion) => sum + (emotionCounts[emotion] || 0), 0),
        negative: negativeEmotions.reduce((sum, emotion) => sum + (emotionCounts[emotion] || 0), 0),
        total: posts.length
      };

      // Extract top issues (most frequent topics)
      const topicCounts = {};
      posts.forEach(post => {
        const text = (post.text || post.content || '').toLowerCase();
        ['roads', 'water', 'electricity', 'development', 'education', 'healthcare']
          .forEach(topic => {
            if (text.includes(topic)) {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
          });
      });

      const topIssues = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([topic, count]) => ({
          topic: topic.charAt(0).toUpperCase() + topic.slice(1),
          mentions: count,
          sentiment: sentimentData.positive > sentimentData.negative ? 'positive' : 'negative'
        }));

      // Calculate competitive position
      const partyMentions = competitive.parties || {};
      const totalMentions = Object.values(partyMentions).reduce((sum, count) => sum + count, 0);
      const topParty = Object.entries(partyMentions).sort(([,a], [,b]) => b - a)[0];
      
      // Calculate momentum (7-day trend)
      const momentumScore = trends.sentiment_trend || 0;

      // Calculate campaign health
      const campaignHealth = calculateCampaignHealth(
        sentimentData, 
        { total: posts.length }, 
        momentumScore
      );

      // Filter critical alerts
      const criticalAlerts = alerts
        .filter(alert => alert.priority === 'high' || alert.severity === 'critical')
        .slice(0, 3);

      setSummaryData({
        campaignHealth: {
          score: campaignHealth,
          trend: momentumScore,
          status: campaignHealth >= 70 ? 'good' : campaignHealth >= 40 ? 'caution' : 'critical'
        },
        topIssues,
        competitivePosition: topParty ? {
          leading: topParty[0],
          share: totalMentions > 0 ? Math.round((topParty[1] / totalMentions) * 100) : 0,
          trend: competitive.trend || 0
        } : null,
        criticalAlerts,
        momentum: {
          score: momentumScore,
          posts: posts.length,
          engagement: sentimentData.total > 0 ? Math.round((sentimentData.positive / sentimentData.total) * 100) : 50
        },
        loading: false,
        error: null,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Failed to fetch summary data:', error);
      setSummaryData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load campaign summary data'
      }));
    }
  };

  // Initial load and refresh interval
  useEffect(() => {
    fetchSummaryData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchSummaryData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [selectedWard, refreshInterval]);

  const { 
    campaignHealth, 
    topIssues, 
    competitivePosition, 
    criticalAlerts, 
    momentum, 
    loading, 
    error,
    lastUpdated 
  } = summaryData;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 font-medium">Executive Summary Unavailable</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button 
          onClick={fetchSummaryData}
          className="mt-3 px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          <RefreshCw className="w-3 h-3 inline mr-1" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`executive-summary space-y-4 ${className}`} data-component="executive-summary">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Campaign Overview</h2>
          <p className="text-sm text-gray-600">
            {selectedWard === 'All' ? 'All Wards' : selectedWard} • Executive Summary
            {loading && (
              <span className="ml-2 text-blue-600 animate-pulse-enhanced">Loading...</span>
            )}
          </p>
        </div>
        {lastUpdated && (
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Summary Cards with Smooth Transition */}
      <SmoothTransition
        loading={loading && !campaignHealth}
        skeleton={<ExecutiveSummarySkeleton />}
        duration={300}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Campaign Health */}
        <SummaryCard
          title="Campaign Health"
          value={loading ? '...' : `${campaignHealth?.score || 0}%`}
          trend={campaignHealth?.trend}
          icon={Activity}
          color={campaignHealth?.status === 'good' ? 'green' : 
                campaignHealth?.status === 'caution' ? 'orange' : 'red'}
          onClick={() => onNavigateToTab?.('overview')}
          actionLabel="View Overview"
          loading={loading}
          subtitle={campaignHealth?.status || 'Calculating...'}
          cardIndex={0}
        />

        {/* Top Issues */}
        <SummaryCard
          title="Top Issue"
          value={loading ? '...' : topIssues[0]?.topic || 'No Data'}
          icon={Users}
          color="blue"
          onClick={() => onNavigateToTab?.('sentiment')}
          actionLabel="View Sentiment"
          loading={loading}
          subtitle={topIssues[0] ? `${topIssues[0].mentions} mentions` : 'No trending topics'}
          cardIndex={1}
        />

        {/* Competitive Position */}
        <SummaryCard
          title="Leading Party"
          value={loading ? '...' : competitivePosition?.leading || 'No Data'}
          cardIndex={2}
          trend={competitivePosition?.trend}
          icon={Target}
          color="purple"
          onClick={() => onNavigateToTab?.('competitive')}
          actionLabel="View Analysis"
          loading={loading}
          subtitle={competitivePosition ? `${competitivePosition.share}% share` : 'Calculating...'}
        />

        {/* Critical Alerts */}
        <SummaryCard
          title="Critical Alerts"
          value={loading ? '...' : criticalAlerts.length}
          icon={AlertTriangle}
          color={criticalAlerts.length > 0 ? 'red' : 'green'}
          onClick={() => onNavigateToTab?.('overview')}
          actionLabel="View Overview"
          loading={loading}
          subtitle={criticalAlerts.length > 0 ? 'Requires attention' : 'All clear'}
          cardIndex={3}
        />

        {/* Momentum */}
        <SummaryCard
          title="Engagement"
          value={loading ? '...' : `${momentum?.engagement || 0}%`}
          trend={momentum?.score}
          icon={TrendingUp}
          color={momentum?.engagement >= 60 ? 'green' : 
                momentum?.engagement >= 40 ? 'orange' : 'red'}
          onClick={() => onNavigateToTab?.('sentiment')}
          actionLabel="View Engagement"
          loading={loading}
          subtitle={momentum ? `${momentum.posts} posts analyzed` : 'Calculating...'}
          cardIndex={4}
        />
      </div>
      </SmoothTransition>

      {/* Quick Insights */}
      {!loading && (topIssues.length > 0 || criticalAlerts.length > 0) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Insights</h3>
          <div className="space-y-1 text-xs text-gray-700">
            {topIssues.slice(0, 2).map((issue, index) => (
              <p key={index}>
                • <span className="font-medium">{issue.topic}</span> trending with {issue.mentions} mentions
              </p>
            ))}
            {criticalAlerts.length > 0 && (
              <p className="text-red-600 font-medium">
                • {criticalAlerts.length} critical alert{criticalAlerts.length !== 1 ? 's' : ''} requiring attention
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveSummary;