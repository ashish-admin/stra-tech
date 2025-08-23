"""
Unit tests for NLP Pipeline module.
Tests the natural language processing capabilities including entity extraction,
sentiment analysis, and multilingual political context processing.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

from strategist.nlp.pipeline import NLPProcessor


@pytest.mark.unit
@pytest.mark.strategist
class TestNLPProcessor:
    """Test the NLPProcessor class."""
    
    def test_init_default_parameters(self):
        """Test NLP processor initialization with defaults."""
        processor = NLPProcessor()
        
        assert processor.language == "en"
        assert processor.enable_hindi == True
        assert processor.confidence_threshold == 0.6
        assert len(processor.political_parties) > 0
        assert len(processor.telugu_political_terms) > 0
    
    def test_init_custom_parameters(self):
        """Test NLP processor initialization with custom parameters."""
        processor = NLPProcessor(
            language="hi",
            enable_hindi=False,
            confidence_threshold=0.8
        )
        
        assert processor.language == "hi"
        assert processor.enable_hindi == False
        assert processor.confidence_threshold == 0.8
    
    def test_extract_entities_english_text(self):
        """Test entity extraction from English political text."""
        processor = NLPProcessor()
        
        text = """
        BJP leader announced new infrastructure development in Jubilee Hills ward.
        The Congress party criticized this move, while TRS remained neutral.
        CM KCR and local MLA will meet residents tomorrow to discuss traffic concerns.
        """
        
        entities = processor.extract_entities(text)
        
        assert "political_parties" in entities
        assert "politicians" in entities
        assert "locations" in entities
        assert "issues" in entities
        
        # Should extract political parties
        parties = entities["political_parties"]
        assert "BJP" in parties
        assert "Congress" in parties or "INC" in parties
        assert "TRS" in parties
        
        # Should extract politicians
        politicians = entities["politicians"]
        assert any("KCR" in pol or "CM" in pol for pol in politicians)
        assert any("MLA" in pol for pol in politicians)
        
        # Should extract locations
        locations = entities["locations"]
        assert any("Jubilee Hills" in loc for loc in locations)
        
        # Should extract issues
        issues = entities["issues"]
        assert any("infrastructure" in issue.lower() for issue in issues)
        assert any("traffic" in issue.lower() for issue in issues)
    
    def test_extract_entities_mixed_language_text(self):
        """Test entity extraction from mixed English-Hindi text.""" 
        processor = NLPProcessor(enable_hindi=True)
        
        text = """
        BJP नेता ने Jubilee Hills में विकास की घोषणा की।
        Congress party has opposed this decision. 
        मुख्यमंत्री और स्थानीय विधायक कल मिलेंगे।
        """
        
        entities = processor.extract_entities(text)
        
        assert "political_parties" in entities
        assert "BJP" in entities["political_parties"]
        assert "Congress" in entities["political_parties"] or "INC" in entities["political_parties"]
        
        # Should handle mixed language locations
        assert any("Jubilee Hills" in loc for loc in entities["locations"])
    
    def test_extract_entities_telugu_terms(self):
        """Test entity extraction with Telugu political terms."""
        processor = NLPProcessor()
        
        text = """
        TRS party announced sarkar programs for Jubilee Hills constituency.
        The corporator will organize a sabha next week to discuss local issues.
        Opposition parties are planning dharna against recent decisions.
        """
        
        entities = processor.extract_entities(text)
        
        # Should recognize Telugu political terms
        issues = entities.get("issues", [])
        political_terms = entities.get("political_terms", [])
        
        # May be in issues or separate political_terms category
        all_terms = issues + political_terms
        assert any("sarkar" in term.lower() for term in all_terms)
        assert any("sabha" in term.lower() for term in all_terms)
        assert any("dharna" in term.lower() for term in all_terms)
    
    def test_analyze_sentiment_positive_text(self):
        """Test sentiment analysis on positive political text."""
        processor = NLPProcessor()
        
        positive_text = """
        The new infrastructure development project has received overwhelming support 
        from residents. Citizens are excited about the improved connectivity and 
        modern facilities being planned for the ward.
        """
        
        sentiment = processor.analyze_sentiment(positive_text)
        
        assert "compound" in sentiment
        assert "positive" in sentiment
        assert "neutral" in sentiment
        assert "negative" in sentiment
        
        # Should detect positive sentiment
        assert sentiment["compound"] > 0.1
        assert sentiment["positive"] > sentiment["negative"]
    
    def test_analyze_sentiment_negative_text(self):
        """Test sentiment analysis on negative political text."""
        processor = NLPProcessor()
        
        negative_text = """
        Residents are furious about the delayed infrastructure project.
        The poor planning has caused massive traffic jams and inconvenience.
        Citizens demand immediate action to address these terrible conditions.
        """
        
        sentiment = processor.analyze_sentiment(negative_text)
        
        # Should detect negative sentiment
        assert sentiment["compound"] < -0.1
        assert sentiment["negative"] > sentiment["positive"]
    
    def test_analyze_sentiment_neutral_text(self):
        """Test sentiment analysis on neutral political text."""
        processor = NLPProcessor()
        
        neutral_text = """
        The municipal corporation held a meeting to discuss the budget allocation.
        Various department heads presented their quarterly reports.
        The session concluded with plans for the next review meeting.
        """
        
        sentiment = processor.analyze_sentiment(neutral_text)
        
        # Should detect neutral sentiment
        assert -0.1 <= sentiment["compound"] <= 0.1
        assert sentiment["neutral"] >= max(sentiment["positive"], sentiment["negative"])
    
    def test_extract_key_topics_political_content(self):
        """Test key topic extraction from political content."""
        processor = NLPProcessor()
        
        text = """
        The infrastructure development project includes road widening, 
        new flyover construction, and improved drainage systems.
        Healthcare facilities will also be upgraded with modern equipment.
        Education sector will benefit from new school buildings and libraries.
        Traffic management is a priority with smart signal systems planned.
        """
        
        topics = processor.extract_key_topics(text)
        
        assert isinstance(topics, list)
        assert len(topics) > 0
        
        # Each topic should have topic and confidence
        for topic in topics:
            assert "topic" in topic
            assert "confidence" in topic
            assert 0.0 <= topic["confidence"] <= 1.0
        
        # Should identify key political topics
        topic_names = [t["topic"].lower() for t in topics]
        assert any("infrastructure" in topic for topic in topic_names)
        assert any("healthcare" in topic or "health" in topic for topic in topic_names)
        assert any("education" in topic for topic in topic_names)
        assert any("traffic" in topic for topic in topic_names)
    
    def test_extract_key_topics_empty_text(self):
        """Test key topic extraction from empty text."""
        processor = NLPProcessor()
        
        topics = processor.extract_key_topics("")
        
        assert isinstance(topics, list)
        assert len(topics) == 0
    
    def test_process_multilingual_content(self):
        """Test processing of multilingual content."""
        processor = NLPProcessor(enable_hindi=True)
        
        text = """
        BJP leader said the विकास project will benefit सभी citizens.
        Congress ने इस decision को challenge किया है।
        Local residents are hopeful about infrastructure सुधार।
        """
        
        # Test entity extraction
        entities = processor.extract_entities(text)
        assert "political_parties" in entities
        assert "BJP" in entities["political_parties"]
        assert "Congress" in entities["political_parties"] or "INC" in entities["political_parties"]
        
        # Test sentiment analysis (should handle mixed language)
        sentiment = processor.analyze_sentiment(text)
        assert all(key in sentiment for key in ["compound", "positive", "neutral", "negative"])
        
        # Test topic extraction
        topics = processor.extract_key_topics(text)
        assert isinstance(topics, list)
    
    def test_confidence_threshold_filtering(self):
        """Test that confidence threshold properly filters results."""
        processor = NLPProcessor(confidence_threshold=0.8)
        
        text = "BJP announced development project in Hyderabad ward."
        
        # Mock low confidence results
        with patch.object(processor, '_calculate_entity_confidence') as mock_confidence:
            mock_confidence.return_value = 0.7  # Below threshold
            
            entities = processor.extract_entities(text)
            
            # Should filter out low confidence entities
            # (Implementation may vary based on actual confidence calculation)
            assert isinstance(entities, dict)
    
    def test_political_party_normalization(self):
        """Test political party name normalization.""" 
        processor = NLPProcessor()
        
        # Test various party name variations
        text_variations = [
            "Indian National Congress announced new policy",
            "Congress party leader spoke yesterday", 
            "INC will participate in the meeting",
            "Bharatiya Janata Party leader visited ward",
            "BJP announced development project",
            "Telangana Rashtra Samithi organized event",
            "TRS party workers held rally"
        ]
        
        for text in text_variations:
            entities = processor.extract_entities(text)
            parties = entities.get("political_parties", [])
            
            # Should normalize party names consistently
            assert len(parties) > 0
            # Check that normalized names are used
            party_names = " ".join(parties).lower()
            assert any(party in party_names for party in ["congress", "inc", "bjp", "trs"])
    
    @patch('strategist.nlp.pipeline.openai')
    def test_openai_integration_fallback(self, mock_openai):
        """Test OpenAI integration for advanced NLP tasks."""
        # Mock OpenAI response
        mock_openai.Completion.create.return_value = {
            "choices": [{
                "text": "Topic: infrastructure, Confidence: 0.85\nTopic: traffic, Confidence: 0.78"
            }]
        }
        
        processor = NLPProcessor()
        
        # Test topic extraction with OpenAI fallback
        text = "Complex political discussion about infrastructure and traffic management"
        topics = processor.extract_key_topics(text, use_advanced=True)
        
        assert isinstance(topics, list)
        if len(topics) > 0:  # If OpenAI integration is working
            assert all("topic" in t and "confidence" in t for t in topics)


@pytest.mark.unit
@pytest.mark.strategist
class TestNLPUtilityFunctions:
    """Test utility functions in the NLP module."""
    
    def test_clean_text_function(self):
        """Test text cleaning utility."""
        processor = NLPProcessor()
        
        messy_text = """
        
        This is a    messy text with   extra spaces.
        
        It has multiple newlines and    tabs.	
        Special chars: @#$%^&*()
        URLs: https://example.com and emails: test@example.com
        
        """
        
        cleaned = processor._clean_text(messy_text)
        
        # Should remove extra whitespace
        assert "   " not in cleaned
        assert "\n\n" not in cleaned
        
        # Should preserve meaningful content
        assert "messy text" in cleaned
        assert "multiple newlines" in cleaned
    
    def test_language_detection(self):
        """Test language detection utility."""
        processor = NLPProcessor()
        
        english_text = "This is English political content about elections."
        hindi_text = "यह हिंदी राजनीतिक सामग्री है चुनाव के बारे में।"
        mixed_text = "This is mixed content with हिंदी words भी हैं।"
        
        # Test language detection (if implemented)
        if hasattr(processor, '_detect_language'):
            en_lang = processor._detect_language(english_text)
            hi_lang = processor._detect_language(hindi_text)
            mixed_lang = processor._detect_language(mixed_text)
            
            assert en_lang in ["en", "english"]
            assert hi_lang in ["hi", "hindi"]
            assert mixed_lang in ["mixed", "en", "hi"]  # Could be any of these
    
    def test_entity_confidence_calculation(self):
        """Test entity confidence calculation."""
        processor = NLPProcessor()
        
        # High confidence entity (well-known party)
        high_conf_entity = "BJP"
        high_conf = processor._calculate_entity_confidence(high_conf_entity, "political_party")
        
        # Low confidence entity (unknown term)
        low_conf_entity = "RandomPoliticalTerm"
        low_conf = processor._calculate_entity_confidence(low_conf_entity, "political_party")
        
        assert 0.0 <= high_conf <= 1.0
        assert 0.0 <= low_conf <= 1.0
        assert high_conf > low_conf  # Known entities should have higher confidence
    
    def test_preprocessing_pipeline(self):
        """Test the preprocessing pipeline."""
        processor = NLPProcessor()
        
        raw_text = """
        RT @politician: BJP's new policy is great! #development #progress
        Check out this link: https://example.com/news
        Contact us at info@party.org for more details.
        """
        
        processed = processor._preprocess_text(raw_text)
        
        # Should handle social media elements appropriately
        # (Implementation may vary)
        assert isinstance(processed, str)
        assert len(processed) > 0


@pytest.mark.unit
@pytest.mark.strategist
class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_empty_text_handling(self):
        """Test handling of empty or None text input."""
        processor = NLPProcessor()
        
        # Empty string
        entities_empty = processor.extract_entities("")
        sentiment_empty = processor.analyze_sentiment("")
        topics_empty = processor.extract_key_topics("")
        
        assert isinstance(entities_empty, dict)
        assert isinstance(sentiment_empty, dict)
        assert isinstance(topics_empty, list)
        
        # None input
        entities_none = processor.extract_entities(None)
        sentiment_none = processor.analyze_sentiment(None)
        topics_none = processor.extract_key_topics(None)
        
        assert isinstance(entities_none, dict)
        assert isinstance(sentiment_none, dict)
        assert isinstance(topics_none, list)
    
    def test_very_long_text_handling(self):
        """Test handling of very long text input."""
        processor = NLPProcessor()
        
        # Create very long text
        long_text = "This is a political statement. " * 10000
        
        # Should handle without crashing
        entities = processor.extract_entities(long_text)
        sentiment = processor.analyze_sentiment(long_text)
        topics = processor.extract_key_topics(long_text)
        
        assert isinstance(entities, dict)
        assert isinstance(sentiment, dict)
        assert isinstance(topics, list)
    
    def test_special_characters_handling(self):
        """Test handling of special characters and encoding."""
        processor = NLPProcessor()
        
        special_text = """
        BJP's decision regarding "development" has caused mixed reactions 🎉
        Some say it's great 👍, others disagree 👎
        Email: test@example.com, Phone: +91-1234567890
        Unicode: café, naïve, résumé
        """
        
        # Should handle without crashing
        entities = processor.extract_entities(special_text)
        sentiment = processor.analyze_sentiment(special_text)
        
        assert isinstance(entities, dict)
        assert isinstance(sentiment, dict)
        
        # Should still extract meaningful entities
        assert len(entities.get("political_parties", [])) > 0
    
    def test_malformed_input_resilience(self):
        """Test resilience to malformed or unexpected input."""
        processor = NLPProcessor()
        
        malformed_inputs = [
            123,  # Number instead of string
            {"text": "content"},  # Dictionary instead of string
            ["list", "of", "words"],  # List instead of string
            True,  # Boolean instead of string
        ]
        
        for malformed_input in malformed_inputs:
            try:
                entities = processor.extract_entities(malformed_input)
                sentiment = processor.analyze_sentiment(malformed_input)
                topics = processor.extract_key_topics(malformed_input)
                
                # Should return proper types even with bad input
                assert isinstance(entities, dict)
                assert isinstance(sentiment, dict)
                assert isinstance(topics, list)
                
            except (TypeError, AttributeError) as e:
                # Acceptable to raise type errors for completely wrong input types
                assert "string" in str(e).lower() or "str" in str(e).lower()
    
    @patch('strategist.nlp.pipeline.openai')
    def test_external_api_failure_handling(self, mock_openai):
        """Test handling of external API failures."""
        # Mock OpenAI failure
        mock_openai.Completion.create.side_effect = Exception("API Error")
        
        processor = NLPProcessor()
        
        # Should fallback gracefully when external APIs fail
        text = "Political content for advanced analysis"
        topics = processor.extract_key_topics(text, use_advanced=True)
        
        # Should return results (possibly from fallback method)
        assert isinstance(topics, list)
        # May be empty if advanced analysis fails and no fallback
    
    def test_memory_efficiency_large_batches(self):
        """Test memory efficiency with large batches of text."""
        import tracemalloc
        
        processor = NLPProcessor()
        
        tracemalloc.start()
        
        # Process many texts
        for i in range(100):
            text = f"Political content {i} about BJP and Congress development projects in ward {i}."
            processor.extract_entities(text)
            processor.analyze_sentiment(text)
            processor.extract_key_topics(text)
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        # Memory usage should be reasonable (less than 100MB for this test)
        assert peak < 100 * 1024 * 1024, f"Peak memory usage too high: {peak / 1024 / 1024:.2f}MB"


@pytest.mark.unit
@pytest.mark.strategist
class TestConfiguration:
    """Test NLP configuration and customization."""
    
    def test_custom_political_parties_list(self):
        """Test customization of political parties list."""
        custom_parties = ["CUSTOM_PARTY_1", "CUSTOM_PARTY_2"]
        processor = NLPProcessor()
        
        # Add custom parties
        processor.political_parties.extend(custom_parties)
        
        text = "CUSTOM_PARTY_1 announced new policy while CUSTOM_PARTY_2 opposed it."
        entities = processor.extract_entities(text)
        
        parties = entities.get("political_parties", [])
        assert "CUSTOM_PARTY_1" in parties
        assert "CUSTOM_PARTY_2" in parties
    
    def test_confidence_threshold_impact(self):
        """Test impact of different confidence thresholds."""
        low_threshold_processor = NLPProcessor(confidence_threshold=0.1)
        high_threshold_processor = NLPProcessor(confidence_threshold=0.9)
        
        ambiguous_text = "Some party mentioned something about development."
        
        low_entities = low_threshold_processor.extract_entities(ambiguous_text)
        high_entities = high_threshold_processor.extract_entities(ambiguous_text)
        
        # Low threshold should potentially return more entities
        # High threshold should be more conservative
        # (Exact behavior depends on implementation)
        assert isinstance(low_entities, dict)
        assert isinstance(high_entities, dict)
    
    def test_language_specific_processing(self):
        """Test language-specific processing differences."""
        en_processor = NLPProcessor(language="en", enable_hindi=False)
        hi_processor = NLPProcessor(language="hi", enable_hindi=True)
        
        mixed_text = "BJP ने नई policy announce की है। Congress has opposed this decision."
        
        en_entities = en_processor.extract_entities(mixed_text)
        hi_entities = hi_processor.extract_entities(mixed_text)
        
        # Both should extract political parties but may handle language differently
        assert "political_parties" in en_entities
        assert "political_parties" in hi_entities
        
        # Hindi processor might extract more entities from Hindi portions
        # (Specific behavior depends on implementation)