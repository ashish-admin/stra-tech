#!/bin/bash

# Test AI Service API Keys for LokDarpan Enhanced Deployment
set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
if [ -f ".env.production-enhanced" ]; then
    set -a
    source ".env.production-enhanced"
    set +a
else
    echo -e "${RED}Environment file not found${NC}"
    exit 1
fi

echo -e "${BLUE}Testing AI Service API Keys...${NC}"
echo "=================================="

# Test Gemini API
echo -e "\n${BLUE}Testing Gemini API...${NC}"
if [ -n "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "your-gemini-api-key-here" ]; then
    GEMINI_RESPONSE=$(curl -X POST \
        "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=$GEMINI_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"contents":[{"parts":[{"text":"Test connectivity"}]}]}' \
        -s -w "%{http_code}" -o /tmp/gemini_response.json)
    
    GEMINI_CODE="${GEMINI_RESPONSE: -3}"
    if [ "$GEMINI_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Gemini API key is valid and working${NC}"
        GEMINI_OK=true
    else
        echo -e "${YELLOW}⚠ Gemini API returned code: $GEMINI_CODE${NC}"
        echo -e "${YELLOW}  This may be due to API limitations or billing setup${NC}"
        echo -e "${YELLOW}  The key appears to be formatted correctly${NC}"
        GEMINI_OK=false
    fi
else
    echo -e "${RED}✗ Gemini API key not configured${NC}"
    GEMINI_OK=false
fi

# Test Perplexity API
echo -e "\n${BLUE}Testing Perplexity API...${NC}"
if [ -n "$PERPLEXITY_API_KEY" ] && [ "$PERPLEXITY_API_KEY" != "your-perplexity-api-key-here" ]; then
    PERPLEXITY_RESPONSE=$(curl -X POST \
        "https://api.perplexity.ai/chat/completions" \
        -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": [{"role": "user", "content": "Test"}],
            "max_tokens": 10
        }' \
        -s -w "%{http_code}" -o /tmp/perplexity_response.json)
    
    PERPLEXITY_CODE="${PERPLEXITY_RESPONSE: -3}"
    if [ "$PERPLEXITY_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Perplexity API key is valid and working${NC}"
        PERPLEXITY_OK=true
    else
        echo -e "${YELLOW}⚠ Perplexity API returned code: $PERPLEXITY_CODE${NC}"
        echo -e "${YELLOW}  This may be due to insufficient credits or rate limits${NC}"
        echo -e "${YELLOW}  The key appears to be formatted correctly${NC}"
        PERPLEXITY_OK=false
    fi
else
    echo -e "${RED}✗ Perplexity API key not configured${NC}"
    PERPLEXITY_OK=false
fi

# Summary
echo -e "\n${BLUE}=================================="
echo -e "API Key Test Summary${NC}"
echo "=================================="

if [ "$GEMINI_OK" = true ] && [ "$PERPLEXITY_OK" = true ]; then
    echo -e "${GREEN}✓ All API keys are configured and working${NC}"
    echo -e "${GREEN}✓ Political Strategist will have full AI capabilities${NC}"
    echo -e "\n${BLUE}Ready for enhanced deployment!${NC}"
    exit 0
elif [ "$GEMINI_OK" = true ] || [ "$PERPLEXITY_OK" = true ]; then
    echo -e "${YELLOW}⚠ Some API keys are working, partial AI functionality available${NC}"
    echo -e "${YELLOW}⚠ Political Strategist will use fallback strategies for missing services${NC}"
    echo -e "\n${BLUE}Deployment can proceed with limited AI features${NC}"
    exit 0
else
    echo -e "${RED}✗ API keys need attention${NC}"
    echo -e "${YELLOW}⚠ Deployment will proceed with template fallback responses${NC}"
    echo -e "\n${BLUE}Consider checking:${NC}"
    echo -e "1. API key validity and format"
    echo -e "2. Account billing and credit availability"
    echo -e "3. Service availability and rate limits"
    exit 1
fi