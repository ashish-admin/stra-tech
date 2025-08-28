# Story 4.2.2: Strategist Stream Components

## Status
Draft

## Story
**As a** campaign strategist using LokDarpan during active political campaigns,
**I want** real-time streaming UI components that show live political analysis progress and results,
**so that** I can monitor AI analysis as it happens and receive strategic insights immediately without page refreshes or polling.

## Acceptance Criteria

1. **StrategistStream Component**: Implement StrategistStream.jsx component with real-time progress tracking, analysis display, and streaming status indicators
2. **Progress Visualization**: Display multi-stage analysis progress with clear visual indicators for each phase (data collection, sentiment analysis, strategic reasoning)
3. **Real-time Results Display**: Show streaming analysis results as they arrive, with proper formatting and priority-based highlighting
4. **Connection Status Management**: Provide clear connection status feedback (connecting, connected, streaming, error, disconnected) with appropriate user controls
5. **Enhanced Political Strategist Integration**: Integrate streaming components into existing PoliticalStrategist.jsx with toggle between streaming and standard modes
6. **Error Handling & Recovery**: Comprehensive error handling for streaming failures with fallback to standard analysis and retry mechanisms
7. **Performance**: Streaming UI maintains responsive performance without blocking other dashboard components

## Tasks / Subtasks

- [ ] Task 1: Core StrategistStream Component (AC: 1, 3)
  - [ ] Create StrategistStream.jsx in `frontend/src/features/strategist/components/StrategistStream.jsx`
  - [ ] Implement streaming event handling for intelligence, progress, heartbeat, and error events
  - [ ] Add real-time analysis results display with proper formatting and syntax highlighting
  - [ ] Implement priority-based styling (critical/high/medium alerts with appropriate visual indicators)

- [ ] Task 2: Progress Visualization System (AC: 2)
  - [ ] Create ProgressTracker.jsx subcomponent for multi-stage analysis tracking
  - [ ] Implement progress indicators for: connection, data collection, sentiment analysis, strategic reasoning, completion
  - [ ] Add visual progress bars, status icons, and estimated completion times
  - [ ] Create AnalysisStage.jsx for individual stage status and details

- [ ] Task 3: Connection Management UI (AC: 4, 6)
  - [ ] Implement ConnectionStatus.jsx component with status indicators and controls
  - [ ] Add connection controls (connect, disconnect, retry) with user-friendly labels
  - [ ] Create error recovery UI with specific error messages and suggested actions
  - [ ] Implement automatic reconnection UI with countdown timers and status updates

- [ ] Task 4: Enhanced PoliticalStrategist Integration (AC: 5)
  - [ ] Modify existing PoliticalStrategist.jsx to include streaming toggle and controls
  - [ ] Add streaming mode selector (standard analysis vs. live streaming)
  - [ ] Integrate StrategistStream component with existing layout and styling
  - [ ] Implement result caching and display switching between streaming and cached results

- [ ] Task 5: Performance Optimization & Testing (AC: 7)
  - [ ] Implement component memoization for frequently re-rendered streaming components
  - [ ] Add cleanup mechanisms for streaming connections and event listeners
  - [ ] Create unit tests for streaming components with mocked SSE events
  - [ ] Performance testing to ensure streaming doesn't impact dashboard responsiveness

## Dev Notes

### Previous Story Insights
From Story 4.2.1 (SSE Client Infrastructure): Successfully implemented robust SSE client with reconnection logic and event parsing. The SSEClient.js service provides the foundation for streaming components with comprehensive error handling and connection management.

### Technology Stack Context
[Source: docs/architecture/tech-stack.md#frontend-stack]
- **React 18**: Component-based UI library with hooks for managing streaming state
- **Vite**: Build tool with hot reload - streaming components will integrate with existing dev environment
- **React Query (TanStack Query)**: Server state management - streaming results will complement existing cached data
- **Tailwind CSS**: Utility-first styling for responsive streaming UI components

### Phase 3 Backend Integration Requirements
[Source: backend/strategist/sse_enhanced.py]
- **Enhanced SSE Stream**: Backend provides `phase3_enhanced_sse_stream` with heartbeat, progress tracking, and comprehensive error handling
- **Event Types**: Supports connection, intelligence, heartbeat, error, and complete event types with structured data
- **Authentication Integration**: SSE connections maintain session-based auth with `current_user.is_authenticated`
- **Priority Filtering**: Backend supports priority filters (all|high|critical) for event filtering

### File Locations and Structure
[Source: docs/architecture/source-tree.md#frontend-directory-structure]
- **Primary Component**: `frontend/src/features/strategist/components/StrategistStream.jsx` (new streaming component)
- **Integration Point**: `frontend/src/features/strategist/components/PoliticalStrategist.jsx` (existing component to enhance)
- **SSE Service**: `frontend/src/services/websocket.js` (existing SSE client from Story 4.2.1)
- **Custom Hook**: `frontend/src/hooks/useSSE.js` (existing SSE hook from Story 4.2.1)

### Component Architecture Integration
[Source: docs/architecture/source-tree.md#frontend-key-files]
- **Dashboard Integration**: StrategistStream will integrate with existing Dashboard.jsx layout without breaking current functionality
- **Ward Context**: Leverage existing WardContext.jsx for ward-specific streaming analysis
- **Error Boundaries**: Utilize existing ErrorBoundary.jsx to prevent streaming failures from crashing dashboard
- **Service Integration**: Coordinate with existing `src/services/strategist.js` for non-streaming analysis fallback

### SSE Event Format Integration
[Source: backend/strategist/sse_enhanced.py#format_event]
```javascript
// Expected SSE event structure from backend
{
  "type": "intelligence|progress|heartbeat|error|complete|connection",
  "data": {
    // Event-specific data
    "id": "strategic_12345",
    "ward": "Jubilee Hills", 
    "priority": "high|medium|low",
    "title": "Strategic Update",
    "content": "Analysis content...",
    "confidence": 0.85
  },
  "timestamp": 1677123456.789,
  "connection_id": "jubilee-hills_1677123456000"
}
```

### UI/UX Requirements
[Source: docs/architecture/coding-standards.md#frontend-standards]
- **Loading States**: Implement appropriate loading indicators for connection and streaming phases
- **Error States**: User-friendly error messages with recovery options and fallback to standard analysis
- **Responsive Design**: Streaming UI must work on mobile devices for field operations
- **Accessibility**: ARIA labels for streaming status, keyboard navigation for controls

### Performance Standards
[Source: docs/architecture/coding-standards.md#performance-standards]
- **Component Performance**: Streaming components must not impact existing dashboard <2s load time
- **Memory Management**: Prevent memory leaks from streaming event listeners and connection cleanup
- **Real-time Latency**: Display streaming events within <2 seconds of backend emission
- **Concurrent Streaming**: Support multiple simultaneous streaming sessions without performance degradation

### Error Handling Standards
[Source: docs/architecture/coding-standards.md#error-handling]
- **Graceful Degradation**: Streaming failures should fallback to standard PoliticalStrategist analysis
- **User Feedback**: Clear status messages for connection issues, analysis errors, and recovery attempts
- **Retry Mechanisms**: Automatic and manual retry options with exponential backoff
- **Fail Fast**: Detect streaming errors early and provide immediate user feedback

### Testing Standards
[Source: docs/architecture/coding-standards.md#testing-standards]
- **Component Testing**: Unit tests for StrategistStream, ProgressTracker, and ConnectionStatus components
- **Streaming Simulation**: Mock SSE events for testing different streaming scenarios and error conditions
- **Integration Testing**: Test integration with existing PoliticalStrategist component and dashboard
- **Performance Testing**: Verify streaming components don't impact existing component render performance

### Security Considerations
[Source: docs/architecture/coding-standards.md#security-standards]
- **Session Authentication**: Streaming components must respect existing session-based authentication
- **Data Sanitization**: Sanitize all streaming event data before rendering in UI components
- **CORS Compliance**: Streaming requests follow existing CORS policies with proper credential handling
- **Rate Limiting**: Respect backend rate limiting for streaming connections and reconnection attempts

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-08-28 | v1.0 | Initial story creation with comprehensive Phase 3 backend integration | Scrum Master (Bob) |

## Dev Agent Record

*This section will be populated by the development agent during implementation*

## QA Results

*This section will be populated by the QA agent after implementation review*