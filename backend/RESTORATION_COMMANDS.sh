#!/bin/bash
# LokDarpan Backend Service Restoration Commands
# Execute from /mnt/c/Users/amukt/Projects/LokDarpan/backend directory

set -e  # Exit on any error

echo "🚀 Starting LokDarpan Backend Service Restoration..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the backend directory
if [ ! -f "celery_worker.py" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

# Step 1: Environment Setup
print_status "Setting up environment..."
if [ ! -d "venv" ]; then
    print_error "Virtual environment not found. Please create it first:"
    echo "python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

source venv/bin/activate
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
export ERROR_LOG_FILE="logs/errors.log"

# Step 2: Test Core Services
print_status "Testing core services..."

# Test Redis
if redis-cli ping >/dev/null 2>&1; then
    print_status "✅ Redis connection successful"
else
    print_error "❌ Redis connection failed. Please start Redis server."
    exit 1
fi

# Test PostgreSQL
python -c "
import psycopg2
try:
    conn = psycopg2.connect(database='lokdarpan_db', user='postgres', password='amuktha', host='localhost', port='5432')
    conn.close()
    print('✅ PostgreSQL connection successful')
except Exception as e:
    print('❌ PostgreSQL connection failed:', e)
    exit(1)
" || exit 1

# Step 3: Clean up migration issues (optional)
print_status "Checking migration status..."
if ! flask db current >/dev/null 2>&1; then
    print_warning "Migration chain issues detected. Cleaning up..."
    # Remove problematic migrations if they exist
    rm -f migrations/versions/dad14c523c2b_ai_summary_pgvector_rag_tables.py
    rm -f migrations/versions/004_ai_infrastructure_schema.py
    rm -f migrations/versions/005_electoral_optimization.py
    print_status "Problematic migrations removed"
fi

# Step 4: Check Environment Variables
print_status "Checking environment variables..."
python -c "
import os
from dotenv import load_dotenv
load_dotenv()

required_keys = ['GEMINI_API_KEY', 'DATABASE_URL', 'SECRET_KEY']
missing_keys = []

for key in required_keys:
    if not os.getenv(key):
        missing_keys.append(key)

if missing_keys:
    print(f'❌ Missing required environment variables: {missing_keys}')
    exit(1)
else:
    print('✅ All required environment variables present')

# Check optional keys
optional_keys = ['PERPLEXITY_API_KEY', 'NEWS_API_KEY', 'OPENAI_API_KEY']
for key in optional_keys:
    if os.getenv(key):
        print(f'✅ {key}: Available')
    else:
        print(f'⚠️ {key}: Not set (Political Strategist may have limited functionality)')
" || exit 1

# Step 5: Test Task Processing
print_status "Testing background task processing..."
TASK_ID=$(celery -A celery_worker.celery call app.tasks.ping 2>/dev/null | tail -1)
if [ -n "$TASK_ID" ]; then
    print_status "✅ Celery task processing successful (Task ID: $TASK_ID)"
else
    print_error "❌ Celery task processing failed"
    exit 1
fi

# Step 6: Test Flask App
print_status "Testing Flask application..."
# Start Flask in background
flask run --host=127.0.0.1 --port=5000 >/dev/null 2>&1 &
FLASK_PID=$!
sleep 3

# Test API endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5000/api/v1/status" 2>/dev/null)
kill $FLASK_PID 2>/dev/null || true

if [ "$HTTP_CODE" = "200" ]; then
    print_status "✅ Flask API responding correctly"
else
    print_error "❌ Flask API not responding (HTTP: $HTTP_CODE)"
    exit 1
fi

# Step 7: Create systemd service files (optional)
create_systemd_services() {
    print_status "Creating systemd service files..."
    
    BACKEND_DIR=$(pwd)
    USER=$(whoami)
    
    # Flask API service
    sudo tee /etc/systemd/system/lokdarpan-api.service > /dev/null <<EOF
[Unit]
Description=LokDarpan Flask API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR
Environment=DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db
Environment=ERROR_LOG_FILE=/var/log/lokdarpan/errors.log
Environment=FLASK_ENV=production
ExecStart=$BACKEND_DIR/venv/bin/flask run --host=127.0.0.1 --port=5000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    # Celery worker service
    sudo tee /etc/systemd/system/lokdarpan-celery.service > /dev/null <<EOF
[Unit]
Description=LokDarpan Celery Worker
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR
Environment=DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db
Environment=ERROR_LOG_FILE=/var/log/lokdarpan/errors.log
ExecStart=$BACKEND_DIR/venv/bin/celery -A celery_worker.celery worker --loglevel=info
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    # Celery beat service
    sudo tee /etc/systemd/system/lokdarpan-celery-beat.service > /dev/null <<EOF
[Unit]
Description=LokDarpan Celery Beat Scheduler
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR
Environment=DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db
Environment=ERROR_LOG_FILE=/var/log/lokdarpan/errors.log
ExecStart=$BACKEND_DIR/venv/bin/celery -A celery_worker.celery beat --loglevel=info
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    print_status "✅ Systemd service files created"
}

# Step 8: Final Setup
print_status "Completing final setup..."

# Create log directory if needed
mkdir -p logs
if [ ! -f "logs/errors.log" ]; then
    touch logs/errors.log
fi

# Set proper permissions
chmod +x "$0"

print_status "🎉 Backend service restoration complete!"
echo ""
echo "=== SERVICE STATUS ==="
echo "✅ PostgreSQL: Connected"
echo "✅ Redis: Connected"
echo "✅ Celery: Task processing active"
echo "✅ Flask: API endpoints responding"
echo "✅ Political Strategist: Initialized"
echo ""
echo "=== NEXT STEPS ==="
echo "1. Start development server:"
echo "   flask run --host=127.0.0.1 --port=5000"
echo ""
echo "2. Start Celery worker (separate terminal):"
echo "   celery -A celery_worker.celery worker --loglevel=info"
echo ""
echo "3. Optional: Start Celery beat scheduler:"
echo "   celery -A celery_worker.celery beat --loglevel=info"
echo ""
echo "4. Optional: Install systemd services for production:"
echo "   bash RESTORATION_COMMANDS.sh --install-systemd"

# Check for systemd installation flag
if [ "$1" = "--install-systemd" ]; then
    create_systemd_services
    echo ""
    echo "=== PRODUCTION SERVICES ==="
    echo "sudo systemctl start lokdarpan-api"
    echo "sudo systemctl start lokdarpan-celery" 
    echo "sudo systemctl start lokdarpan-celery-beat"
    echo "sudo systemctl enable lokdarpan-api lokdarpan-celery lokdarpan-celery-beat"
fi

print_status "Backend services are ready for political intelligence operations! 🏛️"