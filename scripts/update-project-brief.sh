#!/bin/bash
# Project Brief Update Trigger Script
# Manual and automated triggers for project brief updates

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BRIEF_FILE="$PROJECT_ROOT/COMPREHENSIVE_PROJECT_BRIEF.md"
MONITOR_SCRIPT="$PROJECT_ROOT/.project-brief-monitor"
LOG_FILE="$PROJECT_ROOT/.project-brief-updates.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to manually trigger project brief update
manual_update() {
    local reason="$1"
    if [[ -z "$reason" ]]; then
        reason="Manual update requested"
    fi
    
    print_status "Triggering manual project brief update..."
    print_status "Reason: $reason"
    
    # Update the brief metadata
    local current_date=$(date +"%Y-%m-%d")
    local current_time=$(date +"%H:%M:%S")
    
    # Extract current version, increment patch version
    local current_version=$(grep "**Document Version**:" "$BRIEF_FILE" | grep -o "[0-9]\+\.[0-9]\+" | head -1)
    if [[ $current_version =~ ^([0-9]+)\.([0-9]+)$ ]]; then
        local major=${BASH_REMATCH[1]}
        local minor=${BASH_REMATCH[2]}
        local new_version="$major.$((minor + 1))"
    else
        local new_version="1.1"
    fi
    
    # Create backup
    cp "$BRIEF_FILE" "$BRIEF_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update document metadata
    sed -i "s/\*\*Document Version\*\*: .*/\*\*Document Version\*\*: $new_version/" "$BRIEF_FILE"
    sed -i "s/\*\*Created\*\*: .*/\*\*Created\*\*: $current_date/" "$BRIEF_FILE"
    
    # Add manual update notice
    echo "" >> "$BRIEF_FILE"
    echo "---" >> "$BRIEF_FILE"
    echo "" >> "$BRIEF_FILE"
    echo "**🔄 MANUAL UPDATE NOTICE**" >> "$BRIEF_FILE"
    echo "- **Updated**: $(date +"%B %d, %Y at %H:%M:%S")" >> "$BRIEF_FILE"
    echo "- **Trigger**: Manual update" >> "$BRIEF_FILE"
    echo "- **Reason**: $reason" >> "$BRIEF_FILE"
    echo "- **Version**: $new_version" >> "$BRIEF_FILE"
    echo "- **Status**: Document manually synchronized with project state" >> "$BRIEF_FILE"
    echo "" >> "$BRIEF_FILE"
    
    # Log the update
    echo "[$current_date $current_time] Manual project brief update to version $new_version" >> "$LOG_FILE"
    echo "Reason: $reason" >> "$LOG_FILE"
    
    print_success "Project brief updated to version $new_version"
    print_status "Backup created at: $BRIEF_FILE.backup.$(date +%Y%m%d_%H%M%S)"
}

# Function to start monitoring daemon
start_monitoring() {
    if [[ -f "$PROJECT_ROOT/.project-brief-monitor.pid" ]]; then
        local pid=$(cat "$PROJECT_ROOT/.project-brief-monitor.pid")
        if ps -p $pid > /dev/null; then
            print_warning "Monitoring system already running (PID: $pid)"
            return 1
        else
            print_status "Removing stale PID file"
            rm -f "$PROJECT_ROOT/.project-brief-monitor.pid"
        fi
    fi
    
    print_status "Starting project brief monitoring system..."
    
    # Start monitoring in background
    nohup "$MONITOR_SCRIPT" > "$PROJECT_ROOT/.project-brief-monitor.out" 2>&1 &
    local monitor_pid=$!
    
    echo $monitor_pid > "$PROJECT_ROOT/.project-brief-monitor.pid"
    print_success "Monitoring system started (PID: $monitor_pid)"
    print_status "Output logged to: $PROJECT_ROOT/.project-brief-monitor.out"
}

# Function to stop monitoring daemon
stop_monitoring() {
    if [[ -f "$PROJECT_ROOT/.project-brief-monitor.pid" ]]; then
        local pid=$(cat "$PROJECT_ROOT/.project-brief-monitor.pid")
        if ps -p $pid > /dev/null; then
            print_status "Stopping monitoring system (PID: $pid)..."
            kill $pid
            rm -f "$PROJECT_ROOT/.project-brief-monitor.pid"
            print_success "Monitoring system stopped"
        else
            print_warning "Monitoring system not running"
            rm -f "$PROJECT_ROOT/.project-brief-monitor.pid"
        fi
    else
        print_warning "No monitoring PID file found"
    fi
}

# Function to check monitoring status
status_monitoring() {
    if [[ -f "$PROJECT_ROOT/.project-brief-monitor.pid" ]]; then
        local pid=$(cat "$PROJECT_ROOT/.project-brief-monitor.pid")
        if ps -p $pid > /dev/null; then
            print_success "Monitoring system running (PID: $pid)"
            print_status "Log file: $LOG_FILE"
            print_status "Output file: $PROJECT_ROOT/.project-brief-monitor.out"
            
            # Show recent log entries
            if [[ -f "$LOG_FILE" ]]; then
                echo ""
                print_status "Recent updates:"
                tail -5 "$LOG_FILE"
            fi
        else
            print_error "Monitoring system not running (stale PID file)"
            rm -f "$PROJECT_ROOT/.project-brief-monitor.pid"
        fi
    else
        print_warning "Monitoring system not running"
    fi
}

# Function to install git hooks for automatic updates
install_git_hooks() {
    print_status "Installing git hooks for automatic project brief updates..."
    
    local git_hooks_dir="$PROJECT_ROOT/.git/hooks"
    if [[ ! -d "$git_hooks_dir" ]]; then
        print_error "Git hooks directory not found. Is this a git repository?"
        return 1
    fi
    
    # Create post-commit hook
    cat > "$git_hooks_dir/post-commit" << 'EOF'
#!/bin/bash
# Automatically update project brief after commits

# Check if this is a significant commit
if git log -1 --pretty=format:"%s" | grep -E "(feat|fix|docs|BREAKING|Phase|Sprint)" >/dev/null; then
    echo "Significant commit detected, updating project brief..."
    
    # Get the project root
    PROJECT_ROOT=$(git rev-parse --show-toplevel)
    
    # Run the update script
    if [[ -x "$PROJECT_ROOT/scripts/update-project-brief.sh" ]]; then
        "$PROJECT_ROOT/scripts/update-project-brief.sh" update "Automatic update after commit: $(git log -1 --pretty=format:'%s')"
    fi
fi
EOF
    
    # Make it executable
    chmod +x "$git_hooks_dir/post-commit"
    
    # Create pre-push hook
    cat > "$git_hooks_dir/pre-push" << 'EOF'
#!/bin/bash
# Update project brief before pushing to ensure it's current

PROJECT_ROOT=$(git rev-parse --show-toplevel)

# Check if there are significant changes being pushed
if git diff --name-only origin/main HEAD | grep -E "(CLAUDE\.md|package\.json|requirements\.txt|strategist/)" >/dev/null; then
    echo "Significant changes detected, updating project brief before push..."
    
    if [[ -x "$PROJECT_ROOT/scripts/update-project-brief.sh" ]]; then
        "$PROJECT_ROOT/scripts/update-project-brief.sh" update "Pre-push update with significant changes"
    fi
    
    # Add the updated brief to the commit if it changed
    git add "$PROJECT_ROOT/COMPREHENSIVE_PROJECT_BRIEF.md" 2>/dev/null || true
fi
EOF
    
    # Make it executable
    chmod +x "$git_hooks_dir/pre-push"
    
    print_success "Git hooks installed successfully"
    print_status "Hooks will trigger on: significant commits and pushes"
}

# Function to show usage
show_usage() {
    cat << EOF
Project Brief Update Management Script

USAGE:
    $0 <command> [options]

COMMANDS:
    update [reason]     - Manually update project brief
    start              - Start monitoring daemon
    stop               - Stop monitoring daemon  
    restart            - Restart monitoring daemon
    status             - Check monitoring status
    install-hooks      - Install git hooks for automatic updates
    logs               - Show recent update logs
    help               - Show this help message

EXAMPLES:
    $0 update "Added new Political Strategist features"
    $0 start
    $0 status
    $0 install-hooks

FILES:
    Project Brief: $BRIEF_FILE
    Monitor Script: $MONITOR_SCRIPT
    Update Log: $LOG_FILE
EOF
}

# Function to show recent logs
show_logs() {
    print_status "Recent project brief updates:"
    if [[ -f "$LOG_FILE" ]]; then
        tail -20 "$LOG_FILE"
    else
        print_warning "No log file found"
    fi
}

# Main script logic
case "${1:-help}" in
    "update")
        manual_update "$2"
        ;;
    "start")
        start_monitoring
        ;;
    "stop")
        stop_monitoring
        ;;
    "restart")
        stop_monitoring
        sleep 2
        start_monitoring
        ;;
    "status")
        status_monitoring
        ;;
    "install-hooks")
        install_git_hooks
        ;;
    "logs")
        show_logs
        ;;
    "help"|*)
        show_usage
        ;;
esac