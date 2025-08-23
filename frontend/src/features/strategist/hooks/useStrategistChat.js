/**
 * useStrategistChat - Hook for AI-powered political conversations
 */

import { useState, useCallback, useRef } from 'react';
import { fetchJson } from '../../../lib/api';

export function useStrategistChat(ward) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const sendMessage = useCallback(async (content, options = {}) => {
    if (!content.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content,
      timestamp: new Date(),
      context: { ward, ...options }
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetchJson('/api/v1/strategist/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: content,
          ward,
          context: options,
          conversation_history: messages.slice(-5)
        }),
        signal: abortControllerRef.current.signal
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.response || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date(),
        context: response.context || {},
        actions: response.actions || []
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(error.message);
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date(),
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [ward, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    cancelRequest
  };
}

export default useStrategistChat;