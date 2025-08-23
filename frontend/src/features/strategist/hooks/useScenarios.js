/**
 * useScenarios - Hook for scenario planning and what-if analysis
 */

import { useState, useCallback, useEffect } from 'react';
import { fetchJson } from '../../../lib/api';

export function useScenarios(ward) {
  const [scenarios, setScenarios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load scenarios
  const loadScenarios = useCallback(async () => {
    if (!ward) return;
    
    setIsLoading(true);
    try {
      const data = await fetchJson(`/api/v1/strategist/scenarios?ward=${encodeURIComponent(ward)}`);
      setScenarios(data.scenarios || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [ward]);

  // Run scenario simulation
  const runSimulation = useCallback(async (scenarioId, parameters) => {
    setIsLoading(true);
    try {
      const response = await fetchJson(`/api/v1/strategist/scenarios/${scenarioId}/simulate`, {
        method: 'POST',
        body: JSON.stringify({ parameters, ward })
      });

      setScenarios(prev => prev.map(s => 
        s.id === scenarioId 
          ? { ...s, outcomes: response.outcomes, confidence: response.confidence, lastModified: new Date().toISOString() }
          : s
      ));

      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [ward]);

  // Create new scenario
  const createScenario = useCallback(async (scenarioData) => {
    setIsLoading(true);
    try {
      const response = await fetchJson('/api/v1/strategist/scenarios', {
        method: 'POST',
        body: JSON.stringify({ ...scenarioData, ward })
      });

      setScenarios(prev => [response.scenario, ...prev]);
      return response.scenario;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [ward]);

  // Update scenario
  const updateScenario = useCallback(async (scenarioId, updates) => {
    try {
      const response = await fetchJson(`/api/v1/strategist/scenarios/${scenarioId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      setScenarios(prev => prev.map(s => 
        s.id === scenarioId ? { ...s, ...response.scenario } : s
      ));

      return response.scenario;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  // Delete scenario
  const deleteScenario = useCallback(async (scenarioId) => {
    try {
      await fetchJson(`/api/v1/strategist/scenarios/${scenarioId}`, {
        method: 'DELETE'
      });

      setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  return {
    scenarios,
    isLoading,
    error,
    runSimulation,
    createScenario,
    updateScenario,
    deleteScenario,
    refresh: loadScenarios
  };
}

export default useScenarios;