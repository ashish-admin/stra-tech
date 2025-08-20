import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldX, ChevronDown, Activity, AlertTriangle } from 'lucide-react';
import { useDashboardHealth } from '../utils/componentHealth.js';

export default function DashboardHealthIndicator() {
  const health = useDashboardHealth();
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <Shield className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <ShieldX className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const criticalFailures = Object.entries(health.components)
    .filter(([, status]) => status.status === 'error')
    .filter(([name]) => ['Interactive Map', 'Strategic Analysis', 'Intelligence Alerts'].includes(name));

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor(health.status)}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {getStatusIcon(health.status)}
          <div>
            <div className="text-sm font-medium">
              Dashboard Health: {health.healthScore}%
            </div>
            <div className="text-xs opacity-75">
              {health.healthyComponents}/{health.totalComponents} components operational
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {criticalFailures.length > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-medium">{criticalFailures.length} critical</span>
            </div>
          )}
          <ChevronDown 
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <div className="space-y-2">
            {Object.entries(health.components).map(([componentName, status]) => (
              <div key={componentName} className="flex items-center justify-between text-xs">
                <span className="font-medium">{componentName}</span>
                <div className="flex items-center space-x-1">
                  {status.status === 'healthy' ? (
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  ) : (
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  )}
                  <span className="capitalize">{status.status}</span>
                  {status.errorCount > 0 && (
                    <span className="text-xs opacity-60">({status.errorCount} errors)</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {criticalFailures.length > 0 && (
            <div className="mt-3 pt-2 border-t border-current/20">
              <div className="text-xs font-medium mb-1">Critical Issues:</div>
              {criticalFailures.map(([name, status]) => (
                <div key={name} className="text-xs opacity-75">
                  • {name}: {status.lastError?.message || 'Component failure'}
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-current/20 text-xs opacity-60">
            <div>System resilience: Single component failures isolated</div>
            <div>Dashboard remains functional during component errors</div>
          </div>
        </div>
      )}
    </div>
  );
}