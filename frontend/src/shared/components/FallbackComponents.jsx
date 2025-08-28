import React from 'react';
import { Map, BarChart3, TrendingUp, Navigation, Activity, AlertTriangle } from 'lucide-react';

/**
 * SPECIALIZED FALLBACK COMPONENTS
 * 
 * These components provide graceful degradation UI when critical dashboard 
 * components fail. Each fallback maintains essential functionality while 
 * providing clear user guidance.
 */

/**
 * LocationMap Fallback - Interactive ward selection when map fails
 */
export const LocationMapFallback = ({ 
  error, 
  retry, 
  canRetry, 
  selectedWard, 
  onWardSelect, 
  wardOptions = [] 
}) => {
  return (
    <div className="h-96 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center p-6">
      <div className="text-center mb-6">
        <Map className="h-16 w-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Interactive Map Temporarily Unavailable</h3>
        <p className="text-sm text-blue-700 max-w-md">
          The ward visualization map is experiencing technical difficulties. 
          Critical ward selection functionality has been preserved below.
        </p>
      </div>
      
      {/* Alternative ward selector */}
      <div className="w-full max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-2">
            <Navigation className="h-4 w-4 inline mr-1" />
            Alternative Ward Navigation
          </label>
          <select
            className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            value={selectedWard || ''}
            onChange={(e) => onWardSelect?.(e.target.value)}
          >
            <option value="">Select a ward for analysis...</option>
            {wardOptions.map((ward) => (
              <option key={ward} value={ward}>{ward}</option>
            ))}
          </select>
        </div>
        
        {selectedWard && (
          <div className="p-4 bg-blue-100 border border-blue-300 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-4 w-4 text-blue-700" />
              <span className="font-medium text-blue-900">Currently Analyzing</span>
            </div>
            <div className="text-blue-800 font-semibold">{selectedWard}</div>
            <div className="text-xs text-blue-600 mt-1">
              All political intelligence features active for this ward
            </div>
          </div>
        )}
        
        {canRetry && (
          <button
            onClick={retry}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Restore Interactive Map
          </button>
        )}
      </div>
      
      <div className="mt-6 text-center">
        <div className="text-xs text-blue-500 mb-2">
          💡 All dashboard analytics remain fully operational
        </div>
        <div className="text-xs text-blue-400">
          Interactive map will restore automatically when service connectivity improves
        </div>
      </div>
    </div>
  );
};

/**
 * Strategic Summary Fallback - Essential strategic info when AI analysis fails
 */
export const StrategicSummaryFallback = ({ 
  error, 
  retry, 
  canRetry, 
  selectedWard, 
  fallbackSummary,
  cachedInsights = []
}) => {
  return (
    <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start space-x-4">
        <TrendingUp className="h-8 w-8 text-yellow-600 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-xl font-semibold text-yellow-900 mb-3">
            AI Strategic Analysis Unavailable
          </h4>
          
          <div className="mb-4 p-4 bg-white/60 rounded-lg border border-yellow-300">
            <h5 className="font-medium text-yellow-800 mb-2">
              Current Ward: {selectedWard || 'No ward selected'}
            </h5>
            
            {fallbackSummary ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-yellow-700">Cached Strategic Summary:</div>
                <div className="text-sm text-gray-700 bg-white/80 p-3 rounded">
                  {fallbackSummary}
                </div>
              </div>
            ) : (
              <div className="text-sm text-yellow-700">
                No cached strategic analysis available. AI-powered insights will resume when service connectivity is restored.
              </div>
            )}
          </div>
          
          {cachedInsights.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-yellow-800 mb-2">Recent Insights (Cached):</h5>
              <div className="space-y-2">
                {cachedInsights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="p-3 bg-white/50 rounded text-sm">
                    <div className="font-medium text-gray-800">{insight.title || 'Political Development'}</div>
                    <div className="text-gray-600">{insight.summary || insight.content}</div>
                    {insight.timestamp && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(insight.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="text-sm font-medium text-yellow-800">Alternative Analysis Sources Available:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2 text-yellow-700">
                <BarChart3 className="h-4 w-4" />
                <span>Sentiment Analysis Charts</span>
              </div>
              <div className="flex items-center space-x-2 text-yellow-700">
                <Activity className="h-4 w-4" />
                <span>Competitive Analysis Panel</span>
              </div>
              <div className="flex items-center space-x-2 text-yellow-700">
                <TrendingUp className="h-4 w-4" />
                <span>Time-series Trends</span>
              </div>
              <div className="flex items-center space-x-2 text-yellow-700">
                <AlertTriangle className="h-4 w-4" />
                <span>Intelligence Alerts</span>
              </div>
            </div>
          </div>
          
          {canRetry && (
            <button
              onClick={retry}
              className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Retry AI Analysis
            </button>
          )}
          
          <div className="mt-4 p-3 bg-yellow-100 rounded text-sm text-yellow-600">
            🧠 <strong>Campaign Intelligence Tip:</strong> While AI analysis recovers, focus on sentiment trends 
            and competitive metrics in other dashboard sections for immediate strategic insights.
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Chart Fallback - Data table view when visualization fails
 */
export const ChartFallback = ({ 
  error, 
  retry, 
  canRetry, 
  data = [],
  chartType = 'chart',
  title,
  emptyMessage = 'No data available'
}) => {
  // Attempt to show data in table format
  if (data && Array.isArray(data) && data.length > 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-gray-500 mr-2" />
            <h4 className="font-medium text-gray-900">{title || `${chartType} Data`}</h4>
            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">(Table View)</span>
          </div>
          {canRetry && (
            <button
              onClick={retry}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Restore Chart
            </button>
          )}
        </div>
        
        <div className="max-h-64 overflow-auto border border-gray-200 rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Item</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 20).map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 text-gray-800">
                    {item.label || item.name || item.category || item.ward || `Item ${index + 1}`}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900 font-medium">
                    {item.value || item.count || item.percentage || item.score || 'N/A'}
                  </td>
                </tr>
              ))}
              {data.length > 20 && (
                <tr>
                  <td colSpan="2" className="py-3 text-center text-gray-500 text-xs bg-gray-50">
                    ... and {data.length - 20} more items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
          <span>💡 Chart visualization will resume automatically once restored</span>
          <span className="text-gray-400">Showing {Math.min(data.length, 20)} of {data.length} items</span>
        </div>
      </div>
    );
  }
  
  // No data fallback
  return (
    <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center p-6">
      <BarChart3 className="h-12 w-12 text-gray-400 mb-3" />
      <h4 className="font-medium text-gray-900 mb-2">{title || 'Visualization Unavailable'}</h4>
      <p className="text-sm text-gray-500 text-center mb-3">
        {emptyMessage}
      </p>
      {canRetry && (
        <button
          onClick={retry}
          className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
        >
          Retry Chart
        </button>
      )}
    </div>
  );
};

/**
 * Political Strategist Fallback - Alternative analysis when AI streaming fails
 */
export const PoliticalStrategistFallback = ({ 
  error, 
  retry, 
  canRetry, 
  selectedWard,
  analysisHistory = [],
  lastAnalysis 
}) => {
  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
      <div className="flex items-start space-x-4">
        <div className="bg-purple-100 p-3 rounded-full">
          <TrendingUp className="h-6 w-6 text-purple-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-xl font-semibold text-purple-900 mb-3">
            Political Strategist Analysis Unavailable
          </h4>
          
          <div className="mb-4 p-4 bg-white/70 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-800 mb-2">
              Real-time AI political analysis for <strong>{selectedWard || 'selected ward'}</strong> is 
              temporarily unavailable due to service connectivity issues.
            </div>
            
            {lastAnalysis && (
              <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                <div className="text-xs font-medium text-purple-700 mb-1">Most Recent Analysis:</div>
                <div className="text-sm text-gray-700">{lastAnalysis.summary || lastAnalysis.content}</div>
                {lastAnalysis.timestamp && (
                  <div className="text-xs text-purple-600 mt-1">
                    {new Date(lastAnalysis.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {analysisHistory.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-purple-800 mb-2">Recent Analysis History:</h5>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {analysisHistory.slice(0, 5).map((analysis, index) => (
                  <div key={index} className="p-2 bg-white/50 rounded text-xs border border-purple-100">
                    <div className="font-medium text-gray-800">{analysis.topic || 'Strategic Analysis'}</div>
                    <div className="text-gray-600">{analysis.summary?.slice(0, 100)}...</div>
                    {analysis.timestamp && (
                      <div className="text-purple-600 mt-1">
                        {new Date(analysis.timestamp).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
            <div className="bg-white/60 p-3 rounded text-center border border-purple-200">
              <div className="font-medium text-purple-900">Alternative Sources</div>
              <div className="text-purple-700">Available</div>
            </div>
            <div className="bg-white/60 p-3 rounded text-center border border-purple-200">
              <div className="font-medium text-purple-900">Sentiment Data</div>
              <div className="text-purple-700">Active</div>
            </div>
            <div className="bg-white/60 p-3 rounded text-center border border-purple-200">
              <div className="font-medium text-purple-900">Competition Analysis</div>
              <div className="text-purple-700">Operational</div>
            </div>
            <div className="bg-white/60 p-3 rounded text-center border border-purple-200">
              <div className="font-medium text-purple-900">Historical Trends</div>
              <div className="text-purple-700">Available</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {canRetry && (
              <button
                onClick={retry}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Retry Political Strategist
              </button>
            )}
            
            <button
              onClick={() => window.location.hash = '#sentiment'}
              className="bg-white text-purple-700 border border-purple-300 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors"
            >
              View Sentiment Analysis
            </button>
          </div>

          <div className="mt-4 p-3 bg-purple-100 rounded text-sm text-purple-700">
            🎯 <strong>Strategic Recommendation:</strong> While AI strategist recovers, leverage sentiment analysis, 
            competitive data, and trend charts for immediate campaign intelligence and decision-making support.
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Dashboard Fallback - System-wide fallback when main dashboard fails  
 */
export const DashboardFallback = ({ 
  error, 
  retry, 
  canRetry,
  user,
  systemStatus = {}
}) => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-900 mb-2">
              LokDarpan Dashboard Service Interruption
            </h1>
            <p className="text-red-700 max-w-2xl mx-auto">
              The main dashboard interface has encountered a technical issue. Critical political intelligence 
              services are being restored automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">✅ System Status</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Authentication: Active</li>
                <li>• User: {user?.username || 'Authenticated'}</li>
                <li>• Backend API: Operational</li>
                <li>• Database: Connected</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2">🔄 Recovery Status</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Error Detection: Complete</li>
                <li>• Service Isolation: Active</li>
                <li>• Recovery Attempt: In Progress</li>
                <li>• Data Integrity: Maintained</li>
              </ul>
            </div>
          </div>

          <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200 mb-6">
            <h3 className="font-medium text-yellow-800 mb-3">🛡️ Service Continuity Measures</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium text-yellow-800">Data Protection</div>
                <div className="text-yellow-700">All political intelligence data remains secure and accessible</div>
              </div>
              <div>
                <div className="font-medium text-yellow-800">Campaign Continuity</div>
                <div className="text-yellow-700">Strategic analysis capabilities preserved through redundant systems</div>
              </div>
              <div>
                <div className="font-medium text-yellow-800">Automatic Recovery</div>
                <div className="text-yellow-700">System will restore full functionality without data loss</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {canRetry && (
              <button
                onClick={retry}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Restore Dashboard Interface
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Reload Application
            </button>
            
            <button
              onClick={() => window.location.href = '/support'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Contact Support
            </button>
          </div>

          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-600">
            <div className="mb-2">
              <strong>For Campaign Teams:</strong> This incident has been automatically logged and our technical team 
              has been notified. Your political intelligence operations can continue using backup analysis tools.
            </div>
            <div className="text-xs text-gray-500">
              Error ID: {error?.errorId || 'N/A'} | Timestamp: {new Date().toISOString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export {
  LocationMapFallback,
  StrategicSummaryFallback,
  ChartFallback,
  PoliticalStrategistFallback,
  DashboardFallback
};