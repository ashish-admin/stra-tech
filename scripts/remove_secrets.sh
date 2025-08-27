#!/bin/bash

# Security Cleanup Script for LokDarpan
# This script removes exposed secrets from the repository

echo "🔒 Starting security cleanup..."

# 1. Remove hardcoded Gemini API key from CLAUDE.md
echo "Removing exposed API key from CLAUDE.md..."
sed -i 's/GEMINI_API_KEY=AIza[A-Za-z0-9_-]*/GEMINI_API_KEY=your_key_here/g' CLAUDE.md

# 2. Ensure .env files are in gitignore
echo "Checking .gitignore..."
if ! grep -q "^\.env$" .gitignore; then
    echo ".env" >> .gitignore
fi
if ! grep -q "^backend/\.env$" .gitignore; then
    echo "backend/.env" >> .gitignore
fi
if ! grep -q "^frontend/\.env$" .gitignore; then
    echo "frontend/.env" >> .gitignore
fi

# 3. Remove .env files from git tracking
echo "Removing .env files from git tracking..."
git rm --cached backend/.env 2>/dev/null || true
git rm --cached frontend/.env 2>/dev/null || true
git rm --cached .env 2>/dev/null || true

# 4. Create secure .env.example files
echo "Creating secure example files..."
cat > backend/.env.example.secure << 'EOF'
# LokDarpan Backend Environment Configuration
# SECURITY: Never commit actual API keys to version control
# Copy this to .env and add your actual keys

FLASK_ENV=development
SECRET_KEY=generate-strong-secret-key-use-python-secrets-module
DATABASE_URL=postgresql://username:password@localhost:5432/lokdarpan_db

# External APIs - Get your own keys
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
NEWS_API_KEY=your_news_api_key_here
TWITTER_BEARER_TOKEN=your_twitter_token_here
PERPLEXITY_API_KEY=your_perplexity_key_here

# Redis/Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# CORS
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
EOF

echo "✅ Security cleanup complete!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Revoke ALL exposed API keys immediately:"
echo "   - Google Gemini: https://makersuite.google.com/app/apikey"
echo "   - OpenAI: https://platform.openai.com/api-keys"
echo "   - Twitter: https://developer.twitter.com/en/portal/dashboard"
echo "   - News API: https://newsapi.org/account"
echo "   - Perplexity: https://www.perplexity.ai/settings/api"
echo ""
echo "2. Generate new API keys and store them securely"
echo "3. Update your local .env file with new keys"
echo "4. Consider using a secrets management service (AWS Secrets Manager, HashiCorp Vault)"
echo "5. Run: git add . && git commit -m 'security: remove exposed secrets'"
echo "6. Consider running git-filter-repo to clean git history"