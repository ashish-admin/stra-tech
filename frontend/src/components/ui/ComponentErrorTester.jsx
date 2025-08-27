/**
 * Component Error Tester
 * 
 * A specialized development utility that can be wrapped around any component
 * to provide error testing capabilities specific to that component.
 * 
 * Only active in development mode.
 */

import React, { useState } from 'react';
import { useComponentErrorTesting } from '../../hooks/useErrorTesting.js';
import { isDevToolsEnabled } from '../../utils/devTools.js';

const ComponentErrorTester = ({ 
  children, 
  componentName = 'UnnamedComponent',
  position = 'top-right',
  showByDefault = false,
  testOnMount = false,
  enableKeyboardShortcuts = true 
}) => {
  const [isVisible, setIsVisible] = useState(showByDefault);
  
  // Hook for component-specific error testing
  const {
    isEnabled,
    testComponentError,
    testComponentAsync,
    testComponentNetwork,
    getComponentErrors,
    getComponentErrorCount
  } = useComponentErrorTesting(componentName, {
    testOnMount,
    autoInitialize: true
  });

  // Don't render if dev tools are not enabled
  if (!isEnabled) {
    return children;
  }

  // Position classes for the error tester overlay
  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0'
  };

  const handleTestRenderError = () => {
    try {
      testComponentError();
    } catch (error) {
      console.log(`✅ Render error test completed for ${componentName}`);
    }
  };

  const handleTestAsyncError = async () => {
    try {
      await testComponentAsync();
    } catch (error) {
      console.log(`✅ Async error test completed for ${componentName}`);
    }
  };

  const handleTestNetworkError = () => {
    try {
      testComponentNetwork('/api/test');
    } catch (error) {
      console.log(`✅ Network error test completed for ${componentName}`);
    }
  };

  // Mini error tester interface
  const ErrorTesterOverlay = () => (
    <div className={`absolute ${positionClasses[position]} z-50 ${isVisible ? 'block' : 'hidden'}`}>
      <div className="bg-purple-600 text-white p-1 rounded shadow-lg text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium">🧪 {componentName}</span>
          <button
            onClick={() => setIsVisible(false)}
            className="ml-2 hover:text-purple-200"
          >
            ✕
          </button>
        </div>
        <div className="space-y-1">
          <button
            onClick={handleTestRenderError}
            className="block w-full text-left hover:bg-purple-700 px-1 py-0.5 rounded"
            title="Test render error boundary"
          >
            🔥 Render Error
          </button>
          <button
            onClick={handleTestAsyncError}
            className="block w-full text-left hover:bg-purple-700 px-1 py-0.5 rounded"
            title="Test async error handling"
          >
            ⏳ Async Error
          </button>
          <button
            onClick={handleTestNetworkError}
            className="block w-full text-left hover:bg-purple-700 px-1 py-0.5 rounded"
            title="Test network error handling"
          >
            🌐 Network Error
          </button>
        </div>
        {getComponentErrorCount() > 0 && (
          <div className="mt-1 pt-1 border-t border-purple-400 text-xs opacity-80">
            Errors: {getComponentErrorCount()}
          </div>
        )}
      </div>
    </div>
  );

  // Floating activation button
  const ActivationButton = () => (
    <div className={`absolute ${positionClasses[position]} z-40`}>
      <button
        onClick={() => setIsVisible(true)}
        className="bg-purple-500 hover:bg-purple-600 text-white w-6 h-6 rounded-full text-xs shadow-lg transition-all duration-200 hover:scale-110"
        title={`Test ${componentName} errors`}
      >
        🧪
      </button>
    </div>
  );

  return (
    <div className="relative">
      {children}
      
      {/* Error testing overlay - only show in development */}
      {import.meta.env.MODE === 'development' && (
        <>
          <ErrorTesterOverlay />
          {!isVisible && <ActivationButton />}
        </>
      )}
    </div>
  );
};

/**
 * Higher-Order Component version for easier wrapping
 */
export const withErrorTesting = (WrappedComponent, componentName, options = {}) => {
  const ErrorTestedComponent = (props) => (
    <ComponentErrorTester 
      componentName={componentName || WrappedComponent.name}
      {...options}
    >
      <WrappedComponent {...props} />
    </ComponentErrorTester>
  );

  ErrorTestedComponent.displayName = `withErrorTesting(${componentName || WrappedComponent.name})`;
  return ErrorTestedComponent;
};

/**
 * Decorator function for class components
 */
export const errorTestable = (componentName, options = {}) => {
  return (WrappedComponent) => {
    return withErrorTesting(WrappedComponent, componentName, options);
  };
};

/**
 * Hook version for functional components
 */
export const useComponentErrorTestingUI = (componentName, options = {}) => {
  const [showTester, setShowTester] = useState(options.showByDefault || false);
  const errorTesting = useComponentErrorTesting(componentName, options);

  const ErrorTestingUI = ({ position = 'top-right' }) => {
    if (!errorTesting.isEnabled || !showTester) return null;

    return (
      <div className={`fixed ${positionClasses[position]} z-50 p-2`}>
        <div className="bg-purple-600 text-white p-2 rounded shadow-lg text-xs max-w-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">🧪 {componentName}</span>
            <button onClick={() => setShowTester(false)}>✕</button>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => errorTesting.testComponentError()}
              className="block w-full text-left hover:bg-purple-700 px-2 py-1 rounded"
            >
              Render Error
            </button>
            <button
              onClick={() => errorTesting.testComponentAsync()}
              className="block w-full text-left hover:bg-purple-700 px-2 py-1 rounded"
            >
              Async Error
            </button>
          </div>
        </div>
      </div>
    );
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return {
    ...errorTesting,
    showTester,
    setShowTester,
    ErrorTestingUI
  };
};

export default ComponentErrorTester;