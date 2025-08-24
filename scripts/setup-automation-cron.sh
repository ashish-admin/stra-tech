#!/bin/bash
# LokDarpan Living Documentation Automation Setup
# This script sets up cron jobs for automated documentation updates and error tracking

LOKDARPAN_ROOT="/mnt/c/Users/amukt/Projects/LokDarpan"
BACKEND_VENV="$LOKDARPAN_ROOT/backend/venv/bin/activate"
SCRIPTS_DIR="$LOKDARPAN_ROOT/scripts"

echo "🚀 Setting up LokDarpan automation cron jobs..."

# Create log directory
mkdir -p "$LOKDARPAN_ROOT/logs/automation"

# Generate cron job entries
CRON_ENTRIES="
# LokDarpan Living Documentation Automation
# Run health check every 30 minutes during development hours (9 AM to 7 PM)
*/30 9-19 * * 1-5 cd $LOKDARPAN_ROOT && source $BACKEND_VENV && python $SCRIPTS_DIR/system-health-monitor.py >> logs/automation/health-monitor.log 2>&1

# Run error analysis every 2 hours during development hours
0 */2 9-19 * * 1-5 cd $LOKDARPAN_ROOT && source $BACKEND_VENV && python $SCRIPTS_DIR/error-analysis-suite.py >> logs/automation/error-analysis.log 2>&1

# Run full documentation update daily at 8 AM
0 8 * * 1-5 cd $LOKDARPAN_ROOT && source $BACKEND_VENV && python $SCRIPTS_DIR/living-docs-engine.py --full-update >> logs/automation/docs-update.log 2>&1

# Run documentation automation daily at 6 PM (end of day)
0 18 * * 1-5 cd $LOKDARPAN_ROOT && source $BACKEND_VENV && python $SCRIPTS_DIR/documentation-automation.py >> logs/automation/docs-automation.log 2>&1
"

echo "📋 Cron job entries to add:"
echo "$CRON_ENTRIES"

echo ""
echo "To install these cron jobs, run:"
echo "  crontab -e"
echo "And add the entries above."
echo ""
echo "To view current cron jobs:"
echo "  crontab -l"
echo ""
echo "Log files will be created in: $LOKDARPAN_ROOT/logs/automation/"
echo ""
echo "✅ Automation setup prepared. Manual crontab edit required."