import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

import ComponentErrorBoundary from '../shared/components/ui/ComponentErrorBoundary';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock component that throws errors
const ThrowError = ({ shouldError = false, errorType = 'generic' }) => {
  if (shouldError) {
    switch (errorType) {
      case 'render':
        throw new Error('Render error in component');
      case 'async':
        throw new Error('Async operation failed');
      case 'network':
        throw new Error('Network request failed');
      default:
        throw new Error('Generic component error');
    }
  }
  return <div data-testid="working-component">Component is working!</div>;
};

const WorkingComponent = () => (
  <div data-testid="working-component">Component is working!</div>
);

describe('ComponentErrorBoundary', () => {
  let consoleSpy;
  const mockOnError = vi.fn();

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOnError.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <WorkingComponent />
        </ComponentErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('passes through all props to children', () => {
      const TestChild = ({ testProp }) => <div>{testProp}</div>;
      
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <TestChild testProp="test-value" />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText('test-value')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches errors and displays fallback UI', () => {
      render(
        <ComponentErrorBoundary 
          componentName="TestComponent"
          onError={mockOnError}
        >
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/TestComponent Temporarily Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Other parts of the dashboard remain functional/)).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      render(
        <ComponentErrorBoundary 
          componentName="TestComponent"
          onError={mockOnError}
        >
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        }),
        expect.objectContaining({
          componentName: 'TestComponent',
          retryCount: 0
        })
      );
    });

    it('logs error details to console', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ComponentErrorBoundary [TestComponent]:'),
        expect.objectContaining({
          error: expect.any(Error),
          errorInfo: expect.any(Object)
        })
      );
    });
  });

  describe('Retry Functionality', () => {
    it('displays retry button with correct attempt count', () => {
      render(
        <ComponentErrorBoundary 
          componentName="TestComponent"
          maxRetries={3}
        >
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Retry loading TestComponent/ });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry (0/3)');
    });

    it('executes retry with exponential backoff', async () => {
      const user = userEvent.setup();
      let shouldError = true;
      
      const RetryableComponent = () => {
        if (shouldError) {
          shouldError = false; // Only error once
          throw new Error('Initial error');
        }
        return <div data-testid="recovered-component">Recovered!</div>;
      };

      render(
        <ComponentErrorBoundary 
          componentName="TestComponent"
          retryDelay={100}
        >
          <RetryableComponent />
        </ComponentErrorBoundary>
      );

      // Should show error initially
      expect(screen.getByRole('alert')).toBeInTheDocument();
      
      // Click retry
      const retryButton = screen.getByRole('button', { name: /Retry loading TestComponent/ });
      await user.click(retryButton);

      // Should show retrying state
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      
      // Fast-forward timers to complete retry delay
      vi.runAllTimers();
      
      // Wait for component to recover
      await waitFor(() => {
        expect(screen.getByTestId('recovered-component')).toBeInTheDocument();
      });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('disables retry button during retry attempt', async () => {
      const user = userEvent.setup();
      
      render(
        <ComponentErrorBoundary componentName="TestComponent" retryDelay={100}>
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Retry loading TestComponent/ });
      
      await user.click(retryButton);
      
      expect(retryButton).toBeDisabled();
      expect(retryButton).toHaveTextContent('Retrying...');
      
      // Fast-forward the timer to complete retry
      vi.runAllTimers();
    }, 10000);

    it('shows maximum retries reached message', async () => {
      const user = userEvent.setup();
      
      render(
        <ComponentErrorBoundary 
          componentName="TestComponent"
          maxRetries={1}
          retryDelay={10}
        >
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      // First retry
      const retryButton = screen.getByRole('button', { name: /Retry loading TestComponent/ });
      await user.click(retryButton);
      
      vi.runAllTimers();
      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show max retries message
      expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument();
    }, 10000);
  });

  describe('Custom Fallback UI', () => {
    it('renders custom fallback component', () => {
      const CustomFallback = () => <div data-testid="custom-fallback">Custom Error UI</div>;
      
      render(
        <ComponentErrorBoundary fallback={<CustomFallback />}>
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('calls custom fallback function with error details', () => {
      const customFallbackFn = vi.fn(() => <div>Custom Function Fallback</div>);
      
      render(
        <ComponentErrorBoundary fallback={customFallbackFn}>
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      expect(customFallbackFn).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.any(Function) // retry handler
      );
    });
  });

  describe('Development Mode Features', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows technical details in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      const detailsElement = screen.getByText('Technical Details (Development Only)');
      expect(detailsElement).toBeInTheDocument();
    });

    it('hides technical details in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      expect(screen.queryByText('Technical Details (Development Only)')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility standards', async () => {
      const { container } = render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }, 10000); // Increase timeout to 10 seconds

    it('has proper ARIA attributes', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveAttribute('aria-live', 'assertive');
    });

    it('has descriptive button labels', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      const retryButton = screen.getByLabelText(/Retry loading TestComponent/);
      const refreshButton = screen.getByLabelText('Refresh entire page');
      
      expect(retryButton).toBeInTheDocument();
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('refreshes page when refresh button is clicked', async () => {
      const user = userEvent.setup();
      // Mock the reload method more safely
      const originalReload = window.location.reload;
      const reloadSpy = vi.fn();
      Object.defineProperty(window.location, 'reload', {
        value: reloadSpy,
        writable: true,
        configurable: true
      });

      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      const refreshButton = screen.getByRole('button', { name: 'Refresh entire page' });
      await user.click(refreshButton);

      expect(reloadSpy).toHaveBeenCalled();
      
      // Restore original method
      Object.defineProperty(window.location, 'reload', {
        value: originalReload,
        writable: true,
        configurable: true
      });
    });

    it('shows contact information when enabled', () => {
      render(
        <ComponentErrorBoundary 
          componentName="TestComponent"
          showContactInfo={true}
        >
          <ThrowError shouldError={true} />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText(/If this problem persists, please contact support/)).toBeInTheDocument();
    });
  });

  describe('Error Isolation', () => {
    it('does not affect sibling components when error occurs', () => {
      const SiblingComponent = () => <div data-testid="sibling">Sibling Component</div>;
      
      render(
        <div>
          <ComponentErrorBoundary componentName="ErrorComponent">
            <ThrowError shouldError={true} />
          </ComponentErrorBoundary>
          <SiblingComponent />
        </div>
      );

      // Error boundary should show error UI
      expect(screen.getByRole('alert')).toBeInTheDocument();
      
      // Sibling component should still render normally
      expect(screen.getByTestId('sibling')).toBeInTheDocument();
    });

    it('allows multiple error boundaries to work independently', () => {
      render(
        <div>
          <ComponentErrorBoundary componentName="Component1">
            <ThrowError shouldError={true} errorType="render" />
          </ComponentErrorBoundary>
          <ComponentErrorBoundary componentName="Component2">
            <WorkingComponent />
          </ComponentErrorBoundary>
        </div>
      );

      // First boundary should show error
      expect(screen.getByText(/Component1 Temporarily Unavailable/)).toBeInTheDocument();
      
      // Second boundary should show working component
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });
});