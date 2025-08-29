/**
 * Action Center - Recommended actions and tactical priorities
 */

import React, { useState } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Users, 
  DollarSign, 
  Calendar,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function ActionCenter({ actions = [], isLoading, ward, briefing = {} }) {
  const [completedActions, setCompletedActions] = useState(new Set());

  const toggleActionComplete = (actionIndex) => {
    setCompletedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionIndex)) {
        newSet.delete(actionIndex);
      } else {
        newSet.add(actionIndex);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-4">Recommended Actions</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const prioritizedActions = [...actions].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const immediateActions = prioritizedActions.filter(a => a.category === 'immediate');
  const strategicActions = prioritizedActions.filter(a => a.category !== 'immediate');

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">Action Center</h3>
        <span className="text-xs text-gray-500">
          {actions.length} actions • {ward}
        </span>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-6">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No actions recommended</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Immediate Actions */}
          {immediateActions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-3 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Immediate Actions ({immediateActions.length})
              </h4>
              <div className="space-y-2">
                {immediateActions.map((action, index) => (
                  <ActionItem
                    key={`immediate-${index}`}
                    action={action}
                    index={`immediate-${index}`}
                    isCompleted={completedActions.has(`immediate-${index}`)}
                    onToggleComplete={() => toggleActionComplete(`immediate-${index}`)}
                    urgent={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Strategic Actions */}
          {strategicActions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Strategic Actions ({strategicActions.length})
              </h4>
              <div className="space-y-2">
                {strategicActions.map((action, index) => (
                  <ActionItem
                    key={`strategic-${index}`}
                    action={action}
                    index={`strategic-${index}`}
                    isCompleted={completedActions.has(`strategic-${index}`)}
                    onToggleComplete={() => toggleActionComplete(`strategic-${index}`)}
                    urgent={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Summary */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {completedActions.size} of {actions.length} actions tracked
              </span>
              <span>
                Next review: {briefing.next_review ? 
                  new Date(briefing.next_review).toLocaleString() : 
                  'TBD'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionItem({ action, index, isCompleted, onToggleComplete, urgent = false }) {
  const [showDetails, setShowDetails] = useState(false);

  const priorityColor = urgent ? 'border-l-red-500 bg-red-50' : 'border-l-blue-500 bg-blue-50';
  const completedStyle = isCompleted ? 'opacity-60 line-through' : '';

  return (
    <div className={`border-l-4 ${priorityColor} p-3 rounded-r-lg transition-all`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggleComplete}
          className={`mt-0.5 transition-colors ${
            isCompleted 
              ? 'text-green-600 hover:text-green-700' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <CheckCircle className={`h-4 w-4 ${isCompleted ? 'fill-current' : ''}`} />
        </button>

        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium text-gray-900 ${completedStyle}`}>
            {action.description}
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {action.timeline && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{action.timeline}</span>
              </div>
            )}
            
            {action.priority && (
              <div className={`px-2 py-1 rounded font-medium ${
                action.priority === 1 ? 'bg-red-100 text-red-700' :
                action.priority === 2 ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                P{action.priority}
              </div>
            )}
          </div>

          {/* Resource Requirements */}
          {action.resource_requirements && (
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
              {action.resource_requirements.personnel && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{action.resource_requirements.personnel} people</span>
                </div>
              )}
              {action.resource_requirements.budget && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>₹{action.resource_requirements.budget.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Success Metrics */}
          {action.success_metrics?.length > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Success metrics</span>
              <ArrowRight className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
            </button>
          )}

          {showDetails && action.success_metrics?.length > 0 && (
            <div className="mt-2 p-2 bg-white border rounded text-xs">
              <div className="font-medium text-gray-700 mb-1">Success Metrics:</div>
              <ul className="text-gray-600 space-y-1">
                {action.success_metrics.map((metric, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                    {metric}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}