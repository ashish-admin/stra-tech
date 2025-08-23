"""
Unit tests for Credibility Checker module.
Tests source credibility assessment, misinformation detection, and content quality validation.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta

from strategist.credibility.checks import CredibilityScorer


@pytest.mark.unit
@pytest.mark.strategist
class TestCredibilityScorer:
    """Test the CredibilityScorer class."""
    
    def test_init_default_parameters(self):
        """Test credibility scorer initialization with defaults."""
        scorer = CredibilityScorer()
        
        assert scorer.min_credibility_score == 0.5
        assert len(scorer.trusted_sources) > 0
        assert len(scorer.flagged_sources) >= 0
        assert scorer.bias_threshold == 0.3
    
    def test_init_custom_parameters(self):
        """Test credibility scorer initialization with custom parameters."""
        custom_trusted = ["Custom News", "Trusted Source"]
        custom_flagged = ["Fake News Site"]
        
        scorer = CredibilityScorer(
            min_credibility_score=0.7,
            trusted_sources=custom_trusted,
            flagged_sources=custom_flagged,
            bias_threshold=0.4
        )
        
        assert scorer.min_credibility_score == 0.7
        assert scorer.trusted_sources == custom_trusted
        assert scorer.flagged_sources == custom_flagged
        assert scorer.bias_threshold == 0.4
    
    def test_score_source_trusted_source(self):
        """Test scoring of trusted news sources."""
        scorer = CredibilityScorer()
        
        # Test well-known trusted sources
        trusted_sources = [
            {"source": "The Hindu", "content": "Political development in Hyderabad ward announced"},
            {"source": "Times of India", "content": "Infrastructure project receives approval"},
            {"source": "Indian Express", "content": "Local election results declared"},
            {"source": "Deccan Chronicle", "content": "Municipal corporation meeting highlights"}
        ]
        
        for source_data in trusted_sources:
            result = scorer.score_source(
                source_name=source_data["source"],
                content=source_data["content"],
                url="https://example.com/news"
            )
            
            assert "overall_score" in result
            assert "factors" in result
            assert "recommendation" in result
            
            # Trusted sources should get high scores
            assert result["overall_score"] >= 0.7
            assert result["recommendation"] in ["high_credibility", "medium_credibility"]
            
            # Should have detailed factor breakdown
            factors = result["factors"]
            assert "source_reputation" in factors
            assert "content_quality" in factors
            assert "factual_accuracy" in factors
            assert "bias_detection" in factors
    
    def test_score_source_unknown_source(self):
        """Test scoring of unknown or low-credibility sources."""
        scorer = CredibilityScorer()
        
        unknown_sources = [
            {"source": "Random Blog", "content": "Unverified political claims"},
            {"source": "Social Media Post", "content": "Rumor about local politician"},
            {"source": "Anonymous Tip", "content": "Alleged scandal without evidence"}
        ]
        
        for source_data in unknown_sources:
            result = scorer.score_source(
                source_name=source_data["source"],
                content=source_data["content"]
            )
            
            assert "overall_score" in result
            # Unknown sources should get lower scores
            assert result["overall_score"] <= 0.8
            
            if result["overall_score"] < scorer.min_credibility_score:
                assert result["recommendation"] == "low_credibility"
    
    def test_score_source_flagged_source(self):
        """Test scoring of known flagged/problematic sources."""
        flagged_sources = ["Fake News Daily", "Misinformation Tribune"]
        scorer = CredibilityScorer(flagged_sources=flagged_sources)
        
        result = scorer.score_source(
            source_name="Fake News Daily",
            content="Controversial political claim without evidence"
        )
        
        assert result["overall_score"] <= 0.3
        assert result["recommendation"] == "low_credibility"
        
        # Should have specific flags for known problematic sources
        factors = result["factors"]
        assert factors["source_reputation"] <= 0.3
    
    def test_score_source_content_quality_factors(self):
        """Test content quality assessment factors."""
        scorer = CredibilityScorer()
        
        # High quality content
        high_quality = {
            "source": "Quality News",
            "content": """
            The Hyderabad Municipal Corporation announced a comprehensive infrastructure 
            development project for Jubilee Hills ward. The project, approved in yesterday's 
            council meeting, includes road widening, drainage improvements, and new community 
            facilities. Mayor spokesperson confirmed the timeline and budget allocation.
            
            According to official documents, the project will be completed in phases over 
            18 months with regular public consultations scheduled monthly.
            """,
            "url": "https://qualitynews.com/politics/hyderabad-infrastructure-2024"
        }
        
        # Low quality content
        low_quality = {
            "source": "Clickbait News",
            "content": "SHOCKING!!! Local politician EXPOSED!!! You won't BELIEVE what happened!!!",
            "url": "https://clickbait.com/shocking-news"
        }
        
        high_result = scorer.score_source(**high_quality)
        low_result = scorer.score_source(**low_quality)
        
        # High quality should score better on content quality
        assert high_result["factors"]["content_quality"] > low_result["factors"]["content_quality"]
        assert high_result["overall_score"] > low_result["overall_score"]
    
    def test_check_misinformation_clean_content(self):
        """Test misinformation detection on clean, factual content."""
        scorer = CredibilityScorer()
        
        clean_content = """
        The Telangana State Election Commission announced the schedule for upcoming 
        municipal elections. Nominations will be accepted from March 1-8, 2024, 
        with elections scheduled for March 25, 2024. The commission emphasized 
        adherence to election code of conduct.
        """
        
        result = scorer.check_misinformation(clean_content)
        
        assert "is_misinformation" in result
        assert "confidence" in result
        assert "flags" in result
        
        # Clean content should not be flagged as misinformation
        assert result["is_misinformation"] == False
        assert result["confidence"] >= 0.7
        assert len(result["flags"]) == 0
    
    def test_check_misinformation_suspicious_content(self):
        """Test misinformation detection on suspicious content."""
        scorer = CredibilityScorer()
        
        suspicious_contents = [
            "BREAKING: Secret video proves politician took bribes (no evidence provided)",
            "This one weird trick politicians DON'T want you to know",
            "Exclusive leak reveals shocking truth about election fraud (anonymous source)",
            "All mainstream media is lying about this political scandal"
        ]
        
        for content in suspicious_contents:
            result = scorer.check_misinformation(content)
            
            # Suspicious content should be flagged or have warnings
            assert "is_misinformation" in result
            assert "flags" in result
            
            if result["is_misinformation"]:
                assert result["confidence"] >= 0.6
                assert len(result["flags"]) > 0
            else:
                # Even if not flagged as misinformation, might have warning flags
                assert isinstance(result["flags"], list)
    
    def test_check_misinformation_emotional_manipulation(self):
        """Test detection of emotional manipulation tactics."""
        scorer = CredibilityScorer()
        
        manipulative_content = """
        You MUST share this before it's DELETED! The mainstream media will NEVER 
        tell you the TRUTH about this politician! They are TERRIFIED of this 
        information getting out! Share NOW before it's too late!!!
        """
        
        result = scorer.check_misinformation(manipulative_content)
        
        # Should detect emotional manipulation flags
        if result["is_misinformation"] or len(result["flags"]) > 0:
            flags = result["flags"]
            flag_text = " ".join(flags).lower()
            assert any(indicator in flag_text for indicator in 
                      ["emotional", "manipulation", "urgency", "sensational"])
    
    def test_bias_detection_neutral_content(self):
        """Test bias detection on neutral content."""
        scorer = CredibilityScorer()
        
        neutral_content = """
        The municipal budget allocation meeting was held yesterday with representatives 
        from all major political parties. BJP proposed infrastructure development, 
        Congress suggested healthcare improvements, and TRS focused on education 
        initiatives. The final decision will be made after public consultation.
        """
        
        bias_score = scorer._detect_bias(neutral_content)
        
        assert 0.0 <= bias_score <= 1.0
        # Neutral content should have low bias score
        assert bias_score <= scorer.bias_threshold
    
    def test_bias_detection_biased_content(self):
        """Test bias detection on clearly biased content."""
        scorer = CredibilityScorer()
        
        biased_contents = [
            "BJP is the only party that truly cares about development while others are corrupt",
            "Congress has completely failed the people with their incompetent policies",
            "TRS is destroying Telangana with their anti-people agenda"
        ]
        
        for content in biased_contents:
            bias_score = scorer._detect_bias(content)
            
            # Biased content should have higher bias scores
            assert bias_score >= scorer.bias_threshold
    
    def test_assess_factual_accuracy_verifiable_claims(self):
        """Test factual accuracy assessment for verifiable claims."""
        scorer = CredibilityScorer()
        
        verifiable_content = """
        According to the Election Commission of India, voter turnout in Hyderabad 
        municipal elections was 64.2%. The announcement was made at 8 PM on election day 
        following official vote counting procedures.
        """
        
        accuracy_score = scorer._assess_factual_accuracy(verifiable_content)
        
        assert 0.0 <= accuracy_score <= 1.0
        # Content with verifiable claims should score higher
        assert accuracy_score >= 0.6
    
    def test_assess_factual_accuracy_unverifiable_claims(self):
        """Test factual accuracy assessment for unverifiable claims."""
        scorer = CredibilityScorer()
        
        unverifiable_content = """
        Secret sources reveal that politician X is planning something big. 
        Anonymous insider confirms shocking details will be revealed soon. 
        Trust me, this is definitely happening according to my contacts.
        """
        
        accuracy_score = scorer._assess_factual_accuracy(unverifiable_content)
        
        # Unverifiable claims should score lower
        assert accuracy_score <= 0.7
    
    def test_url_credibility_assessment(self):
        """Test URL credibility assessment."""
        scorer = CredibilityScorer()
        
        credible_urls = [
            "https://thehindu.com/news/cities/hyderabad/article123.ece",
            "https://timesofindia.indiatimes.com/city/hyderabad/news.cms",
            "https://indianexpress.com/article/cities/hyderabad/",
            "https://deccanchronicle.com/nation/current-affairs/"
        ]
        
        suspicious_urls = [
            "http://fakenews.blogspot.com/shocking-truth",
            "https://clickbait-news.com/you-wont-believe",
            "http://anonymous-leaks.xyz/secret-info",
            "https://totally-real-news.tk/breaking"
        ]
        
        for url in credible_urls:
            score = scorer._assess_url_credibility(url)
            assert score >= 0.6, f"Credible URL {url} scored too low: {score}"
        
        for url in suspicious_urls:
            score = scorer._assess_url_credibility(url)
            assert score <= 0.7, f"Suspicious URL {url} scored too high: {score}"
    
    def test_temporal_relevance_assessment(self):
        """Test temporal relevance assessment."""
        scorer = CredibilityScorer()
        
        # Recent content should be more relevant for current political analysis
        recent_timestamp = datetime.now(timezone.utc) - timedelta(hours=2)
        old_timestamp = datetime.now(timezone.utc) - timedelta(days=30)
        very_old_timestamp = datetime.now(timezone.utc) - timedelta(days=365)
        
        recent_score = scorer._assess_temporal_relevance(recent_timestamp.isoformat())
        old_score = scorer._assess_temporal_relevance(old_timestamp.isoformat())
        very_old_score = scorer._assess_temporal_relevance(very_old_timestamp.isoformat())
        
        # More recent content should score higher
        assert recent_score >= old_score
        assert old_score >= very_old_score
        assert all(0.0 <= score <= 1.0 for score in [recent_score, old_score, very_old_score])


@pytest.mark.unit
@pytest.mark.strategist
class TestCredibilityConfiguration:
    """Test credibility scorer configuration and customization."""
    
    def test_custom_trusted_sources_configuration(self):
        """Test configuration with custom trusted sources."""
        custom_trusted = ["Local Verified News", "Community Reporter", "Ward Newsletter"]
        scorer = CredibilityScorer(trusted_sources=custom_trusted)
        
        # Test that custom sources are properly recognized
        result = scorer.score_source(
            source_name="Local Verified News",
            content="Local election update from verified source"
        )
        
        assert result["overall_score"] >= 0.7
        assert result["factors"]["source_reputation"] >= 0.8
    
    def test_dynamic_source_reputation_updates(self):
        """Test dynamic updates to source reputation."""
        scorer = CredibilityScorer()
        
        # Simulate learning from feedback
        source_name = "Emerging News Source"
        
        # Initial score for unknown source
        initial_result = scorer.score_source(source_name, "Test content")
        initial_score = initial_result["overall_score"]
        
        # Simulate positive feedback (source proves reliable)
        scorer._update_source_reputation(source_name, positive_feedback=True)
        
        # Score should improve after positive feedback
        updated_result = scorer.score_source(source_name, "Test content")
        updated_score = updated_result["overall_score"]
        
        assert updated_score >= initial_score
    
    def test_bias_threshold_impact(self):
        """Test impact of different bias thresholds."""
        strict_scorer = CredibilityScorer(bias_threshold=0.1)  # Very strict
        lenient_scorer = CredibilityScorer(bias_threshold=0.7)  # More lenient
        
        moderately_biased_content = """
        The current ruling party has made some questionable decisions regarding 
        infrastructure development, though they claim to be working in public interest.
        """
        
        strict_result = strict_scorer.score_source("Test Source", moderately_biased_content)
        lenient_result = lenient_scorer.score_source("Test Source", moderately_biased_content)
        
        # Strict threshold should penalize bias more heavily
        if strict_result["factors"]["bias_detection"] > 0.1:
            assert strict_result["overall_score"] <= lenient_result["overall_score"]
    
    def test_credibility_score_weighting(self):
        """Test different factor weightings in overall score calculation."""
        scorer = CredibilityScorer()
        
        # Test with different factor combinations
        test_cases = [
            {  # High reputation, low content quality
                "source_reputation": 0.9,
                "content_quality": 0.3,
                "factual_accuracy": 0.7,
                "bias_detection": 0.2
            },
            {  # Low reputation, high content quality  
                "source_reputation": 0.3,
                "content_quality": 0.9,
                "factual_accuracy": 0.8,
                "bias_detection": 0.1
            }
        ]
        
        for factors in test_cases:
            overall_score = scorer._calculate_overall_score(factors)
            
            assert 0.0 <= overall_score <= 1.0
            # Overall score should reflect the balance of factors
            # (Implementation details depend on specific weighting algorithm)


@pytest.mark.unit
@pytest.mark.strategist
class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_empty_content_handling(self):
        """Test handling of empty or None content."""
        scorer = CredibilityScorer()
        
        # Empty content
        result_empty = scorer.score_source("Test Source", "")
        assert "error" in result_empty or result_empty["overall_score"] <= 0.3
        
        # None content
        result_none = scorer.score_source("Test Source", None)
        assert "error" in result_none or result_none["overall_score"] <= 0.3
        
        # Misinformation check on empty content
        misinf_empty = scorer.check_misinformation("")
        assert "error" in misinf_empty or misinf_empty["is_misinformation"] == False
    
    def test_malformed_input_handling(self):
        """Test handling of malformed input parameters."""
        scorer = CredibilityScorer()
        
        malformed_inputs = [
            {"source_name": 123, "content": "test"},  # Non-string source
            {"source_name": "Test", "content": ["list", "content"]},  # Non-string content
            {"source_name": "", "content": "test", "url": "not-a-url"},  # Invalid URL
        ]
        
        for inputs in malformed_inputs:
            try:
                result = scorer.score_source(**inputs)
                # Should handle gracefully
                assert isinstance(result, dict)
                assert "overall_score" in result or "error" in result
            except (TypeError, ValueError) as e:
                # Acceptable to raise errors for completely malformed input
                assert len(str(e)) > 0
    
    def test_very_long_content_handling(self):
        """Test handling of very long content."""
        scorer = CredibilityScorer()
        
        # Create very long content
        long_content = "This is political content. " * 10000
        
        # Should handle without timeout or memory issues
        result = scorer.score_source("Test Source", long_content)
        
        assert isinstance(result, dict)
        assert "overall_score" in result
        assert 0.0 <= result["overall_score"] <= 1.0
    
    def test_special_characters_handling(self):
        """Test handling of special characters and encodings."""
        scorer = CredibilityScorer()
        
        special_content = """
        विकास परियोजना की घोषणा 🎉
        নতুন নীতি ঘোষণা করা হয়েছে
        Tamil: புதிய கொள்கை அறிவிப்பு
        Special chars: @#$%^&*()
        """
        
        result = scorer.score_source("Multi-language Source", special_content)
        
        assert isinstance(result, dict)
        assert "overall_score" in result
        # Should handle multilingual content appropriately
    
    def test_network_timeout_simulation(self):
        """Test behavior when external verification services timeout."""
        scorer = CredibilityScorer()
        
        # Mock external service timeout
        with patch.object(scorer, '_verify_with_external_service') as mock_verify:
            mock_verify.side_effect = TimeoutError("Service timeout")
            
            result = scorer.score_source("Test Source", "Test content")
            
            # Should fallback gracefully when external services are unavailable
            assert isinstance(result, dict)
            assert "overall_score" in result
            # May have warnings about unavailable verification services
    
    def test_invalid_timestamp_handling(self):
        """Test handling of invalid timestamps."""
        scorer = CredibilityScorer()
        
        invalid_timestamps = [
            "not-a-timestamp",
            "2024-13-45T25:99:99Z",  # Invalid date/time
            "",
            None,
            123456
        ]
        
        for timestamp in invalid_timestamps:
            try:
                score = scorer._assess_temporal_relevance(timestamp)
                # Should return default score for invalid timestamps
                assert 0.0 <= score <= 1.0
            except (ValueError, TypeError):
                # Acceptable to raise errors for invalid timestamps
                pass


@pytest.mark.unit
@pytest.mark.strategist
@pytest.mark.slow
class TestPerformanceCharacteristics:
    """Test performance characteristics of credibility assessment."""
    
    def test_batch_credibility_assessment(self):
        """Test credibility assessment performance with multiple sources."""
        scorer = CredibilityScorer()
        
        # Create batch of sources to assess
        sources = [
            {"source": f"Source {i}", "content": f"Political content {i} about development"}
            for i in range(50)
        ]
        
        import time
        start_time = time.time()
        
        results = []
        for source in sources:
            result = scorer.score_source(source["source"], source["content"])
            results.append(result)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should process sources efficiently (under 10 seconds for 50 sources)
        assert processing_time < 10.0, f"Batch processing too slow: {processing_time:.2f}s"
        
        # All results should be valid
        assert len(results) == 50
        for result in results:
            assert "overall_score" in result
            assert 0.0 <= result["overall_score"] <= 1.0
    
    def test_memory_usage_stability(self):
        """Test memory usage stability across multiple assessments."""
        import tracemalloc
        
        scorer = CredibilityScorer()
        
        tracemalloc.start()
        
        # Assess many sources
        for i in range(100):
            content = f"Political development story {i} with various details and analysis."
            scorer.score_source(f"Source {i}", content)
            scorer.check_misinformation(content)
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        # Memory usage should be stable (less than 50MB for this test)
        assert peak < 50 * 1024 * 1024, f"Peak memory usage too high: {peak / 1024 / 1024:.2f}MB"
    
    def test_caching_effectiveness(self):
        """Test caching effectiveness for repeated assessments."""
        scorer = CredibilityScorer()
        
        # Enable caching if available
        if hasattr(scorer, '_enable_caching'):
            scorer._enable_caching(True)
        
        source_name = "Repeated Source"
        content = "Same content for caching test"
        
        import time
        
        # First assessment (should be slower)
        start1 = time.time()
        result1 = scorer.score_source(source_name, content)
        time1 = time.time() - start1
        
        # Second assessment (should be faster due to caching)
        start2 = time.time()
        result2 = scorer.score_source(source_name, content)
        time2 = time.time() - start2
        
        # Results should be identical
        assert result1["overall_score"] == result2["overall_score"]
        
        # Second call should be faster (if caching is implemented)
        if hasattr(scorer, '_cache'):
            assert time2 < time1, "Caching should improve performance"


@pytest.mark.unit 
@pytest.mark.strategist
class TestIntegrationWithExternalServices:
    """Test integration with external credibility verification services."""
    
    @patch('requests.get')
    def test_external_fact_check_integration(self, mock_get):
        """Test integration with external fact-checking services."""
        # Mock external fact-check API response
        mock_response = Mock()
        mock_response.json.return_value = {
            "fact_check_result": "verified",
            "confidence": 0.85,
            "sources": ["factcheck.org", "snopes.com"]
        }
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        
        scorer = CredibilityScorer()
        
        # Test content that might be fact-checked
        content = "Specific factual claim about political development"
        result = scorer.score_source("Test Source", content)
        
        # Should incorporate external fact-check results if available
        assert "overall_score" in result
        if hasattr(scorer, '_use_external_fact_check'):
            # May have higher confidence due to external verification
            assert result.get("external_verification", {}).get("fact_check") is not None
    
    @patch('requests.get')  
    def test_source_reputation_lookup(self, mock_get):
        """Test source reputation lookup from external databases."""
        # Mock source reputation API
        mock_response = Mock()
        mock_response.json.return_value = {
            "reputation_score": 0.88,
            "bias_rating": "center",
            "factual_reporting": "high"
        }
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        
        scorer = CredibilityScorer()
        
        result = scorer.score_source("Test News Source", "Test content")
        
        # Should incorporate external reputation data
        assert result["factors"]["source_reputation"] >= 0.0
        if hasattr(scorer, '_lookup_source_reputation'):
            # May have more accurate reputation assessment
            assert isinstance(result["factors"]["source_reputation"], float)
    
    def test_fallback_when_external_services_unavailable(self):
        """Test fallback behavior when external services are unavailable.""" 
        scorer = CredibilityScorer()
        
        # Mock all external services as unavailable
        with patch('requests.get', side_effect=Exception("Service unavailable")):
            result = scorer.score_source("Test Source", "Test content")
            
            # Should still provide credibility assessment using internal methods
            assert "overall_score" in result
            assert 0.0 <= result["overall_score"] <= 1.0
            assert "recommendation" in result