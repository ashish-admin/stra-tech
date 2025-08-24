#!/bin/bash
# Setup cron job for bi-weekly strategic research automation

set -e

# Configuration
PROJECT_ROOT="/mnt/c/Users/amukt/Projects/LokDarpan"
SCRIPT_PATH="$PROJECT_ROOT/scripts/strategic-research-automation.py"
LOG_PATH="$PROJECT_ROOT/logs/strategic-research-cron.log"
PYTHON_PATH="/usr/bin/python3"

# Ensure directories exist
mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$PROJECT_ROOT/docs/research"

# Create log file if it doesn't exist
touch "$LOG_PATH"

# Function to add cron job
setup_cron_job() {
    echo "Setting up bi-weekly strategic research cron job..."
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "strategic-research-automation.py"; then
        echo "⚠️  Cron job already exists. Removing old job..."
        crontab -l 2>/dev/null | grep -v "strategic-research-automation.py" | crontab -
    fi
    
    # Create new cron job entry
    # Runs every 2 weeks on Friday at 9:00 AM
    # 0 9 */14 * 5 means: minute=0, hour=9, every 14 days, any month, on Friday (5)
    CRON_JOB="0 9 */14 * 5 cd $PROJECT_ROOT && $PYTHON_PATH $SCRIPT_PATH --mode full >> $LOG_PATH 2>&1"
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    
    echo "✅ Cron job successfully added:"
    echo "   Schedule: Every 2 weeks on Friday at 9:00 AM"
    echo "   Command: $CRON_JOB"
    echo "   Logs: $LOG_PATH"
}

# Function to verify cron setup
verify_cron_setup() {
    echo ""
    echo "Verifying cron job setup..."
    
    if crontab -l 2>/dev/null | grep -q "strategic-research-automation.py"; then
        echo "✅ Cron job is properly configured"
        echo ""
        echo "Current cron jobs:"
        crontab -l 2>/dev/null | grep "strategic-research-automation.py"
    else
        echo "❌ Cron job setup failed"
        exit 1
    fi
}

# Function to test script execution
test_script_execution() {
    echo ""
    echo "Testing script execution..."
    
    if [ -x "$SCRIPT_PATH" ]; then
        echo "✅ Script is executable"
    else
        echo "⚠️  Making script executable..."
        chmod +x "$SCRIPT_PATH"
    fi
    
    # Test run (research mode only to avoid full execution)
    echo "Running test execution..."
    cd "$PROJECT_ROOT"
    
    if $PYTHON_PATH "$SCRIPT_PATH" --mode research --verbose; then
        echo "✅ Script executed successfully"
    else
        echo "❌ Script execution failed. Check dependencies and configuration."
        exit 1
    fi
}

# Function to show usage instructions
show_usage() {
    cat << EOF

📋 LokDarpan Strategic Research Automation Setup Complete

🔄 Cron Schedule:
   - Frequency: Every 2 weeks on Friday at 9:00 AM IST
   - Next execution: $(date -d 'next friday 9:00' 2>/dev/null || echo "Check manually")

📁 File Locations:
   - Script: $SCRIPT_PATH
   - Config: $PROJECT_ROOT/config/research-config.yaml
   - Logs: $LOG_PATH
   - Output: $PROJECT_ROOT/docs/research/

🛠️  Manual Execution Commands:
   # Full research cycle
   cd $PROJECT_ROOT && python3 scripts/strategic-research-automation.py --mode full
   
   # Research collection only
   cd $PROJECT_ROOT && python3 scripts/strategic-research-automation.py --mode research
   
   # Analysis only (uses latest research data)
   cd $PROJECT_ROOT && python3 scripts/strategic-research-automation.py --mode analysis

📊 Monitoring:
   # View cron jobs
   crontab -l
   
   # Check execution logs
   tail -f $LOG_PATH
   
   # Remove cron job (if needed)
   crontab -e

⚡ Next Steps:
   1. Review research configuration: config/research-config.yaml
   2. Monitor first execution in logs
   3. Validate research output in docs/research/
   4. Update strategic roadmap based on findings

EOF
}

# Main execution
main() {
    echo "🚀 Setting up LokDarpan Strategic Research Automation"
    echo "=================================================="
    
    # Check if running on WSL or Linux
    if [[ "$(uname -r)" == *"microsoft"* ]] || [[ "$(uname -r)" == *"WSL"* ]]; then
        echo "⚠️  Detected WSL environment. Cron may not work as expected."
        echo "   Consider running manually or using Windows Task Scheduler."
    fi
    
    setup_cron_job
    verify_cron_setup
    test_script_execution
    show_usage
    
    echo ""
    echo "🎉 Setup completed successfully!"
}

# Execute main function
main "$@"