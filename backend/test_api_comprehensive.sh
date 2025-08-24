#!/bin/bash
# Comprehensive API Test Script for LokDarpan

echo "🔍 COMPREHENSIVE LOKDARPAN API VALIDATION"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:5000"
COOKIES="cookies.txt"

# Test function
test_endpoint() {
    local name=$1
    local endpoint=$2
    local check_field=$3
    
    result=$(curl -s -b $COOKIES "$API_BASE$endpoint")
    
    if [ -n "$check_field" ]; then
        value=$(echo "$result" | jq -r "$check_field" 2>/dev/null)
        if [ "$value" != "null" ] && [ -n "$value" ]; then
            echo -e "${GREEN}✅ $name${NC}: SUCCESS - $check_field = $value"
            return 0
        else
            echo -e "${RED}❌ $name${NC}: FAILED - $check_field is null or missing"
            echo "   Response: $(echo $result | head -c 100)..."
            return 1
        fi
    else
        if [ -n "$result" ]; then
            echo -e "${GREEN}✅ $name${NC}: SUCCESS"
            return 0
        else
            echo -e "${RED}❌ $name${NC}: FAILED - Empty response"
            return 1
        fi
    fi
}

# Login first
echo "1. AUTHENTICATION"
echo "-----------------"
curl -s -c $COOKIES -H "Content-Type: application/json" -X POST \
    -d '{"username":"ashish","password":"password"}' \
    "$API_BASE/api/v1/login" > /dev/null
test_endpoint "Login" "/api/v1/status" ".user.username"
echo ""

echo "2. CORE DATA ENDPOINTS"
echo "----------------------"
test_endpoint "Posts (All)" "/api/v1/posts?city=All" ".items[0].party"
test_endpoint "Posts (Ward)" "/api/v1/posts?city=Jubilee%20Hills" ".items[0].emotion"
test_endpoint "GeoJSON" "/api/v1/geojson" ".features | length"
echo ""

echo "3. ANALYTICS ENDPOINTS"
echo "----------------------"
test_endpoint "Trends (All)" "/api/v1/trends?ward=All&days=7" ".series[-1].parties.BJP"
test_endpoint "Trends (Ward)" "/api/v1/trends?ward=Jubilee%20Hills&days=7" ".series[-1].emotions"
test_endpoint "Competitive Analysis" "/api/v1/competitive-analysis?city=All" 'keys[0]'
echo ""

echo "4. INTELLIGENCE ENDPOINTS"
echo "------------------------"
test_endpoint "Pulse (Ward)" "/api/v1/pulse/Jubilee%20Hills?days=7" ".ward"
test_endpoint "Alerts (All)" "/api/v1/alerts/All" ".[0].id"
test_endpoint "Ward Meta" "/api/v1/ward/meta/95" ".ward_id"
echo ""

echo "5. DATA QUALITY CHECK"
echo "---------------------"
# Check party distribution
parties=$(curl -s -b $COOKIES "$API_BASE/api/v1/trends?ward=All&days=30" | \
    jq -r '.series[-1].parties | keys | join(", ")')
echo -e "${YELLOW}Party Data:${NC} $parties"

# Check emotion distribution
emotions=$(curl -s -b $COOKIES "$API_BASE/api/v1/trends?ward=All&days=30" | \
    jq -r '.series[-1].emotions | keys | join(", ")')
echo -e "${YELLOW}Emotion Data:${NC} $emotions"

# Check post count
post_count=$(curl -s -b $COOKIES "$API_BASE/api/v1/posts?city=All" | jq '.items | length')
echo -e "${YELLOW}Total Posts:${NC} $post_count"

# Check posts with party data
party_count=$(curl -s -b $COOKIES "$API_BASE/api/v1/posts?city=All" | \
    jq '[.items[] | select(.party != null)] | length')
echo -e "${YELLOW}Posts with Party:${NC} $party_count/$post_count"

echo ""
echo "========================================="
echo "📊 SUMMARY"
echo "========================================="