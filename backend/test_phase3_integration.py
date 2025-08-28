#!/usr/bin/env python3
"""
Phase 3 Integration Test

Demonstrates the Phase 3 enhanced features working together:
1. Intelligent multi-model orchestration
2. Circuit breaker protection
3. Enhanced SSE streaming
4. Real-time progress tracking

Usage:
    python test_phase3_integration.py
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Phase3IntegrationDemo:
    """Demonstration of Phase 3 features integration."""
    
    def __init__(self):
        self.test_ward = "Jubilee Hills"
        self.results = []
    
    async def demo_intelligent_routing(self):
        """Demonstrate intelligent model routing."""
        logger.info("🧠 Demonstrating Intelligent Multi-Model Routing...")
        
        try:
            # Import after path setup
            from strategist.reasoner.multi_model_coordinator import (
                MultiModelCoordinator, AnalysisRequest, QueryType
            )
            
            coordinator = MultiModelCoordinator()
            
            # Test different query types
            test_queries = [
                ("What are the recent developments in Jubilee Hills?", QueryType.REAL_TIME_INTELLIGENCE),
                ("Analyze the strategic position against opposition", QueryType.COMPETITIVE_ANALYSIS),
                ("What if there's a major infrastructure announcement?", QueryType.SCENARIO_PLANNING),
                ("Tell me about the current political situation", QueryType.STRATEGIC_ANALYSIS)
            ]
            
            for query, expected_type in test_queries:
                request = AnalysisRequest(
                    ward=self.test_ward,
                    query=query,
                    depth="standard", 
                    context_mode="neutral"
                )
                
                # Test query classification
                classified_type = coordinator._classify_query_type(request)
                
                # Test routing decision
                routing_decision = coordinator._intelligent_model_routing(request, classified_type)
                
                result = {
                    "query": query,
                    "expected_type": expected_type.value,
                    "classified_type": classified_type.value,
                    "routing": {
                        "primary_model": routing_decision.primary_model,
                        "confidence": routing_decision.routing_confidence,
                        "reasoning": routing_decision.reasoning
                    }
                }
                
                self.results.append(result)
                logger.info(f"Query: '{query[:50]}...'")
                logger.info(f"  → Classified as: {classified_type.value}")
                logger.info(f"  → Routed to: {routing_decision.primary_model}")
                logger.info(f"  → Confidence: {routing_decision.routing_confidence:.2f}")
                
        except Exception as e:
            logger.error(f"Error in routing demo: {e}")
            return False
        
        return True
    
    async def demo_circuit_breaker(self):
        """Demonstrate circuit breaker functionality."""
        logger.info("🛡️ Demonstrating Circuit Breaker Protection...")
        
        try:
            from strategist.circuit_breaker import (
                AIServiceCircuitBreaker, CircuitBreakerConfig
            )
            
            # Create test circuit breaker with low thresholds for demo
            config = CircuitBreakerConfig(
                failure_threshold=2,
                recovery_timeout=5,
                timeout_seconds=1.0
            )
            
            breaker = AIServiceCircuitBreaker("demo_service", config)
            
            # Simulate service calls
            async def successful_service():
                await asyncio.sleep(0.1)  # Simulate processing
                return {"status": "success", "data": "test data"}
            
            async def failing_service():
                await asyncio.sleep(0.1)
                raise Exception("Service unavailable")
            
            async def fallback_service():
                return {"status": "fallback", "data": "cached data"}
            
            # Test successful calls
            logger.info("Testing successful service calls...")
            for i in range(3):
                result, success = await breaker.call_service(
                    successful_service,
                    fallback_func=fallback_service
                )
                logger.info(f"Call {i+1}: {'SUCCESS' if success else 'FALLBACK'}")
            
            # Test failing calls to trigger circuit breaker
            logger.info("Testing service failures to trigger circuit breaker...")
            for i in range(3):
                result, success = await breaker.call_service(
                    failing_service,
                    fallback_func=fallback_service
                )
                logger.info(f"Failure {i+1}: {'SUCCESS' if success else 'FALLBACK'}")
            
            # Check circuit breaker state
            health = breaker.get_health_status()
            logger.info(f"Circuit State: {health['circuit_state']}")
            logger.info(f"Success Rate: {health['metrics']['success_rate_percent']}%")
            
            return True
            
        except Exception as e:
            logger.error(f"Error in circuit breaker demo: {e}")
            return False
    
    async def demo_enhanced_sse(self):
        """Demonstrate enhanced SSE connection features."""
        logger.info("🔄 Demonstrating Enhanced SSE Features...")
        
        try:
            from strategist.sse_enhanced import (
                EnhancedSSEConnection, ProgressStage, ConnectionState
            )
            
            # Create enhanced connection
            connection = EnhancedSSEConnection(self.test_ward, "all", 10)
            
            logger.info(f"Connection ID: {connection.connection_id}")
            logger.info(f"Initial State: {connection.state.value}")
            
            # Simulate progress updates
            progress_stages = [
                (ProgressStage.INITIALIZING, 10, "Starting analysis"),
                (ProgressStage.ROUTING_MODELS, 25, "Selecting AI models"),
                (ProgressStage.GATHERING_INTELLIGENCE, 50, "Gathering intelligence"),
                (ProgressStage.ANALYZING_CONTEXT, 75, "Analyzing context"),
                (ProgressStage.SYNTHESIZING_RESPONSE, 90, "Synthesizing response"),
                (ProgressStage.COMPLETE, 100, "Analysis complete")
            ]
            
            for stage, percent, message in progress_stages:
                connection.update_progress(stage, percent, message)
                logger.info(f"Progress: {percent}% - {stage.value} - {message}")
                await asyncio.sleep(0.2)  # Simulate processing time
            
            # Test heartbeat
            if connection.should_send_heartbeat():
                heartbeat = connection.send_heartbeat()
                logger.info("Heartbeat sent")
            
            # Test connection summary
            summary = connection.get_connection_summary()
            logger.info(f"Connection Summary: {json.dumps(summary, indent=2)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error in SSE demo: {e}")
            return False
    
    async def demo_full_strategist_analysis(self):
        """Demonstrate full strategist analysis with Phase 3 features."""
        logger.info("🎯 Demonstrating Full Phase 3 Strategic Analysis...")
        
        try:
            from strategist.service import PoliticalStrategist
            
            # Create strategist instance
            strategist = PoliticalStrategist(self.test_ward, "neutral")
            
            logger.info(f"Analyzing ward: {self.test_ward}")
            logger.info("Features: Multi-model routing, Circuit breakers, Enhanced analysis")
            
            # Perform analysis
            start_time = datetime.now(timezone.utc)
            result = await strategist.analyze_situation("standard")
            end_time = datetime.now(timezone.utc)
            
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"Analysis completed in {duration:.2f} seconds")
            logger.info(f"Confidence Score: {result.get('confidence_score', 'N/A')}")
            logger.info(f"Number of Insights: {len(result.get('insights', []))}")
            logger.info(f"Number of Actions: {len(result.get('recommended_actions', []))}")
            logger.info(f"Fallback Mode: {result.get('fallback_mode', False)}")
            
            # Display strategic overview
            if 'strategic_overview' in result:
                logger.info(f"Strategic Overview: {result['strategic_overview'][:100]}...")
            
            return True
            
        except Exception as e:
            logger.error(f"Error in full analysis demo: {e}")
            return False
    
    async def run_integration_demo(self):
        """Run complete integration demonstration."""
        logger.info("🚀 Starting Phase 3 Integration Demonstration")
        logger.info("=" * 60)
        
        # Add strategist to path
        sys.path.insert(0, os.path.dirname(__file__))
        
        success_count = 0
        total_demos = 4
        
        demos = [
            ("Intelligent Routing", self.demo_intelligent_routing),
            ("Circuit Breaker", self.demo_circuit_breaker), 
            ("Enhanced SSE", self.demo_enhanced_sse),
            ("Full Analysis", self.demo_full_strategist_analysis)
        ]
        
        for demo_name, demo_func in demos:
            logger.info(f"\\n--- {demo_name} Demo ---")
            try:
                success = await demo_func()
                if success:
                    success_count += 1
                    logger.info(f"✅ {demo_name} demo completed successfully")
                else:
                    logger.info(f"❌ {demo_name} demo failed")
            except Exception as e:
                logger.error(f"❌ {demo_name} demo error: {e}")
        
        logger.info("\\n" + "=" * 60)
        logger.info(f"📊 Integration Demo Results:")
        logger.info(f"   Successful demos: {success_count}/{total_demos}")
        logger.info(f"   Success rate: {(success_count/total_demos)*100:.1f}%")
        
        if success_count == total_demos:
            logger.info("🎉 All Phase 3 features working perfectly!")
        elif success_count >= total_demos * 0.75:
            logger.info("✅ Phase 3 features mostly functional")
        else:
            logger.info("⚠️ Some Phase 3 features need attention")
        
        return success_count == total_demos


async def main():
    """Main demo entry point."""
    demo = Phase3IntegrationDemo()
    success = await demo.run_integration_demo()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())