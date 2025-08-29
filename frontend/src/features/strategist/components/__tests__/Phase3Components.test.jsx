/**
 * Phase 3 Components Test Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import IntelligenceFeed from '../IntelligenceFeed';
import StrategistChat from '../StrategistChat';
import StrategicWorkbench from '../StrategicWorkbench';
import ScenarioSimulator from '../ScenarioSimulator';
import { StrategistErrorBoundary } from "../../../shared/components/ui/EnhancedErrorBoundaries";

// Mock the ward context
const mockWardContext = {
  currentWard: 'Jubilee Hills',
  setCurrentWard: vi.fn()
};

vi.mock('../../../../context/WardContext', () => ({
  useWard: () => mockWardContext
}));

// Mock SSE hooks
vi.mock('../../hooks/useEnhancedSSE', () => ({
  useIntelligenceFeed: () => ({
    intelligence: [],
    alerts: [],
    summary: { total: 0, highPriority: 0, actionable: 0, recent: 0 }
  })
}));

describe('Phase 3 Political Strategist Components', () => {
  describe('IntelligenceFeed', () => {
    test('renders intelligence feed component', () => {
      render(<IntelligenceFeed />);
      expect(screen.getByText('Intelligence Feed')).toBeInTheDocument();
      expect(screen.getByText('Jubilee Hills')).toBeInTheDocument();
    });

    test('shows empty state when no ward selected', () => {
      mockWardContext.currentWard = null;
      render(<IntelligenceFeed />);
      expect(screen.getByText('Select a Ward')).toBeInTheDocument();
    });
  });

  describe('StrategistChat', () => {
    test('renders chat interface', () => {
      render(<StrategistChat />);
      expect(screen.getByText('Political Strategist Chat')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ask your political strategist/)).toBeInTheDocument();
    });

    test('shows welcome message on initialization', () => {
      render(<StrategistChat />);
      expect(screen.getByText(/Hello! I'm your Political Strategist AI assistant/)).toBeInTheDocument();
    });
  });

  describe('StrategicWorkbench', () => {
    test('renders workbench with categories', () => {
      render(<StrategicWorkbench />);
      expect(screen.getByText('Strategic Workbench')).toBeInTheDocument();
      expect(screen.getByText('Campaign Playbooks')).toBeInTheDocument();
      expect(screen.getByText('Communications')).toBeInTheDocument();
    });

    test('allows category switching', () => {
      render(<StrategicWorkbench />);
      const communicationsButton = screen.getByText('Communications');
      fireEvent.click(communicationsButton);
      expect(communicationsButton.closest('button')).toHaveClass('bg-white');
    });
  });

  describe('ScenarioSimulator', () => {
    test('renders scenario simulator', () => {
      render(<ScenarioSimulator />);
      expect(screen.getByText('Scenario Simulator')).toBeInTheDocument();
      expect(screen.getByText('Create New Scenario')).toBeInTheDocument();
    });

    test('shows scenario creation modal', () => {
      render(<ScenarioSimulator />);
      const createButton = screen.getByText('Create New Scenario');
      fireEvent.click(createButton);
      expect(screen.getByText('Create New Scenario')).toBeInTheDocument();
    });
  });

  describe('StrategistErrorBoundary', () => {
    const ThrowError = ({ shouldThrow }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    test('catches and displays errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <StrategistErrorBoundary componentName="Test Component">
          <ThrowError shouldThrow={true} />
        </StrategistErrorBoundary>
      );

      expect(screen.getByText('Test Component Component Error')).toBeInTheDocument();
      expect(screen.getByText('Retry Component')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    test('renders children when no error', () => {
      render(
        <StrategistErrorBoundary>
          <ThrowError shouldThrow={false} />
        </StrategistErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });
});

describe('Integration Tests', () => {
  test('components work together without conflicts', () => {
    render(
      <div>
        <StrategistErrorBoundary componentName="Intelligence Feed">
          <IntelligenceFeed />
        </StrategistErrorBoundary>
        <StrategistErrorBoundary componentName="Strategist Chat">
          <StrategistChat />
        </StrategistErrorBoundary>
      </div>
    );

    expect(screen.getByText('Intelligence Feed')).toBeInTheDocument();
    expect(screen.getByText('Political Strategist Chat')).toBeInTheDocument();
  });
});