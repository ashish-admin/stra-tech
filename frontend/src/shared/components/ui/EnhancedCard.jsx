/**
 * EnhancedCard Component
 * LokDarpan Phase 2: Component Reorganization
 * 
 * A flexible, reusable card component with multiple variants and built-in
 * error handling, loading states, and accessibility features.
 */

import React, { forwardRef } from 'react';
import { MoreVertical, ExternalLink, Download, Maximize2 } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';

/**
 * EnhancedCard - Versatile card component for dashboard widgets
 * 
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {string} props.subtitle - Card subtitle
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.variant - Card style variant: 'default', 'metric', 'insight', 'alert'
 * @param {boolean} props.loading - Loading state
 * @param {Error} props.error - Error state
 * @param {Array} props.actions - Action buttons array
 * @param {boolean} props.hoverable - Enable hover effects
 * @param {boolean} props.clickable - Make entire card clickable
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.headerProps - Props for header customization
 */
const EnhancedCard = forwardRef(({
  title,
  subtitle,
  children,
  variant = 'default',
  loading = false,
  error = null,
  actions = [],
  hoverable = false,
  clickable = false,
  onClick,
  className = '',
  headerProps = {},
  ...props
}, ref) => {
  // Variant styles
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    metric: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800',
    insight: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800',
    alert: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800'
  };

  const baseClasses = `
    rounded-lg shadow-sm transition-all duration-200 
    ${variantClasses[variant]}
    ${hoverable ? 'hover:shadow-md hover:-translate-y-0.5' : ''}
    ${clickable ? 'cursor-pointer hover:shadow-lg' : ''}
    ${className}
  `.trim();

  // Loading state
  if (loading) {
    return (
      <div ref={ref} className={baseClasses} {...props}>
        <LoadingSkeleton type="card" title={title} subtitle={subtitle} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div ref={ref} className={`${baseClasses} border-red-200 dark:border-red-800`} {...props}>
        <div className="p-6">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">Error Loading {title || 'Card'}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  const handleCardClick = (e) => {
    if (clickable && onClick && !e.target.closest('.card-action')) {
      onClick(e);
    }
  };

  return (
    <div 
      ref={ref} 
      className={baseClasses} 
      onClick={handleCardClick}
      {...props}
    >
      {/* Card Header */}
      {(title || subtitle || actions.length > 0) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700" {...headerProps}>
          <div className="flex items-start justify-between">
            {/* Title Section */}
            {(title || subtitle) && (
              <div className="flex-1">
                {title && (
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Actions Section */}
            {actions.length > 0 && (
              <div className="flex items-center space-x-2 card-action">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`
                      inline-flex items-center px-2 py-1 text-xs font-medium rounded-md
                      transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${action.variant === 'primary' 
                        ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                        : action.variant === 'secondary'
                        ? 'text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-500 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                        : 'text-gray-500 hover:text-gray-700 focus:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200'
                      }
                    `}
                    title={action.tooltip}
                    disabled={action.disabled}
                  >
                    {action.icon && <action.icon className="w-3 h-3 mr-1" />}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
});

EnhancedCard.displayName = 'EnhancedCard';

// Predefined action creators
EnhancedCard.Actions = {
  expand: (onClick) => ({
    icon: Maximize2,
    label: 'Expand',
    onClick,
    tooltip: 'Expand to full view'
  }),
  
  export: (onClick) => ({
    icon: Download,
    label: 'Export',
    onClick,
    tooltip: 'Export data'
  }),
  
  external: (onClick) => ({
    icon: ExternalLink,
    label: 'Open',
    onClick,
    tooltip: 'Open in new tab'
  }),
  
  menu: (onClick) => ({
    icon: MoreVertical,
    onClick,
    tooltip: 'More options'
  })
};

export default EnhancedCard;