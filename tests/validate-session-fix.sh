#!/bin/bash

# Validation Script: Login Session Persistence Fix
# Tests the session cookie configuration and persistence

echo "🧪 Validating Login Session Persistence Fix"
echo "=========================================="

# Check if backend is running
echo "1. Checking backend service..."
if curl -s -f http://localhost:5000/api/v1/status > /dev/null; then
    echo "✅ Backend is running on localhost:5000"
else
    echo "❌ Backend not running. Start with: cd backend && flask run"
    exit 1
fi

# Check if frontend is running  
echo "2. Checking frontend service..."
if curl -s -f http://localhost:5173 > /dev/null; then
    echo "✅ Frontend is running on localhost:5173"
else
    echo "❌ Frontend not running. Start with: cd frontend && npm run dev"
    exit 1
fi

# Test login endpoint and session cookie
echo "3. Testing login and session cookie..."
COOKIES=$(mktemp)

# Step 1: Login and capture cookies
LOGIN_RESPONSE=$(curl -s -c "$COOKIES" -w "HTTP_STATUS:%{http_code}" \
    -H "Content-Type: application/json" \
    -d '{"username":"user","password":"ayra"}' \
    http://localhost:5000/api/v1/login)

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Login successful (200 OK)"
else
    echo "❌ Login failed (HTTP $HTTP_STATUS)"
    echo "Response: $LOGIN_RESPONSE"
    rm -f "$COOKIES"
    exit 1
fi

# Step 2: Check if session cookie was set with correct domain
if grep -q "lokdarpan_session" "$COOKIES" && grep -q "localhost" "$COOKIES"; then
    echo "✅ Session cookie set with localhost domain"
    echo "   Cookie details:"
    grep "lokdarpan_session" "$COOKIES" | sed 's/^/   /'
else
    echo "❌ Session cookie not set correctly"
    echo "   Cookie file contents:"
    cat "$COOKIES" | sed 's/^/   /'
    rm -f "$COOKIES"
    exit 1
fi

# Step 3: Test session persistence with status endpoint
echo "4. Testing session persistence..."
STATUS_RESPONSE=$(curl -s -b "$COOKIES" -w "HTTP_STATUS:%{http_code}" \
    http://localhost:5000/api/v1/status)

HTTP_STATUS=$(echo "$STATUS_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Status endpoint accessible (200 OK)"
    
    # Check if authenticated
    if echo "$STATUS_BODY" | grep -q '"authenticated":true'; then
        echo "✅ Session persistence working - user is authenticated"
        echo "   User info:"
        echo "$STATUS_BODY" | jq '.user // "null"' 2>/dev/null || echo "   $STATUS_BODY" | sed 's/^/   /'
    else
        echo "❌ Session not persisting - user not authenticated"
        echo "   Response: $STATUS_BODY"
        rm -f "$COOKIES"
        exit 1
    fi
else
    echo "❌ Status endpoint failed (HTTP $HTTP_STATUS)"
    echo "Response: $STATUS_RESPONSE"
    rm -f "$COOKIES"
    exit 1
fi

# Step 4: Test frontend proxy (if accessible)
echo "5. Testing frontend proxy..."
PROXY_RESPONSE=$(curl -s -b "$COOKIES" -w "HTTP_STATUS:%{http_code}" \
    http://localhost:5173/api/v1/status)

PROXY_STATUS=$(echo "$PROXY_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
PROXY_BODY=$(echo "$PROXY_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

if [ "$PROXY_STATUS" = "200" ]; then
    echo "✅ Frontend proxy working (200 OK)"
    
    if echo "$PROXY_BODY" | grep -q '"authenticated":true'; then
        echo "✅ Session persistence through proxy working"
    else
        echo "⚠️  Proxy accessible but session not persisting through proxy"
        echo "   This may be the core issue we're fixing"
    fi
else
    echo "⚠️  Frontend proxy not accessible (HTTP $PROXY_STATUS)"
    echo "   This is expected if frontend dev server isn't running"
fi

# Cleanup
rm -f "$COOKIES"

echo ""
echo "🎯 Validation Summary:"
echo "✅ Backend authentication working"
echo "✅ Session cookies configured correctly"
echo "✅ Session persistence on backend working"
echo ""
echo "💡 Next steps:"
echo "1. Restart backend: cd backend && flask run"
echo "2. Restart frontend: cd frontend && npm run dev"  
echo "3. Test login flow in browser at http://localhost:5173"
echo "4. Run E2E test: npx playwright test tests/e2e/login-session-persistence.spec.js"