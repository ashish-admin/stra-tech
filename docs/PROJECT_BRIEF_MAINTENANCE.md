# Project Brief Maintenance Guide

## Overview

The LokDarpan project brief (`COMPREHENSIVE_PROJECT_BRIEF.md`) is maintained automatically to ensure stakeholders always have access to current project status, requirements, and strategic direction.

## Maintenance System Components

### 1. Automated Monitoring System

**File**: `.project-brief-monitor`
- Monitors key project files for changes every 5 minutes
- Automatically updates project brief when significant changes detected
- Maintains update log for audit trail

**Monitored Files**:
- `CLAUDE.md` - Project instructions and architecture
- `backend/app/__init__.py` - Core application structure
- `backend/config.py` - Configuration changes
- `frontend/package.json` - Dependency changes
- `frontend/src/components/Dashboard.jsx` - Main UI component
- `README.md` - Project documentation
- `docs/stories/` - Epic and story updates
- `backend/strategist/` - Political Strategist module

### 2. Manual Update Script

**File**: `scripts/update-project-brief.sh`
- Provides manual control over project brief updates
- Supports versioning and change tracking
- Integrates with git hooks for automatic updates

### 3. Git Hooks Integration

**Hooks**: `post-commit`, `pre-push`
- Automatically updates brief for significant commits
- Ensures brief stays current before pushing changes
- Triggers on commits containing: feat, fix, docs, BREAKING, Phase, Sprint

## Usage Instructions

### For Developers

#### Starting Monitoring System
```bash
# Start automated monitoring
./scripts/update-project-brief.sh start

# Check monitoring status
./scripts/update-project-brief.sh status

# View recent updates
./scripts/update-project-brief.sh logs
```

#### Manual Updates
```bash
# Update with custom reason
./scripts/update-project-brief.sh update "Added new AI orchestration features"

# Update without specific reason
./scripts/update-project-brief.sh update
```

#### Git Integration
```bash
# Install git hooks for automatic updates
./scripts/update-project-brief.sh install-hooks

# Hooks will automatically trigger on significant commits
git commit -m "feat: Add Political Strategist SSE streaming"
```

### For Project Managers

#### Regular Maintenance
1. **Daily**: Check monitoring status to ensure system is running
2. **Weekly**: Review update logs for significant changes
3. **Before stakeholder meetings**: Manually trigger update to ensure latest status

#### Status Monitoring
```bash
# Quick status check
./scripts/update-project-brief.sh status

# View recent changes
./scripts/update-project-brief.sh logs
```

### For Stakeholders

#### Accessing Current Brief
- **Location**: `COMPREHENSIVE_PROJECT_BRIEF.md` in project root
- **Update Status**: Check "Document Version" and "Created" date in header
- **Change History**: View update notices at bottom of document

#### Understanding Update Notices
- **Automatic Updates**: Triggered by file changes
- **Manual Updates**: Triggered by team members
- **Git Hook Updates**: Triggered by significant commits

## Troubleshooting

### Monitoring System Issues

#### System Not Starting
```bash
# Check if already running
./scripts/update-project-brief.sh status

# Stop any stale processes
./scripts/update-project-brief.sh stop

# Restart system
./scripts/update-project-brief.sh restart
```

#### Missing Updates
1. Verify monitoring system is running: `./scripts/update-project-brief.sh status`
2. Check file permissions: `ls -la .project-brief-monitor`
3. Review log file: `cat .project-brief-updates.log`
4. Manual trigger: `./scripts/update-project-brief.sh update "Manual sync"`

#### Version Conflicts
1. Check current version: `grep "Document Version" COMPREHENSIVE_PROJECT_BRIEF.md`
2. Review recent updates: `./scripts/update-project-brief.sh logs`
3. Create backup: `cp COMPREHENSIVE_PROJECT_BRIEF.md COMPREHENSIVE_PROJECT_BRIEF.md.backup`
4. Manual update: `./scripts/update-project-brief.sh update "Conflict resolution"`

### File Permission Issues
```bash
# Fix monitoring script permissions
chmod +x .project-brief-monitor
chmod +x scripts/update-project-brief.sh

# Fix log file permissions
touch .project-brief-updates.log
chmod 644 .project-brief-updates.log
```

### Git Hook Issues
```bash
# Reinstall git hooks
./scripts/update-project-brief.sh install-hooks

# Check hook permissions
ls -la .git/hooks/post-commit .git/hooks/pre-push

# Manual hook execution
.git/hooks/post-commit  # Test post-commit hook
```

## Configuration

### Monitoring Frequency
Default: 5 minutes
To modify, edit the `sleep 300` value in `.project-brief-monitor`

### File Watch List
To add/remove monitored files, edit the `MONITORED_FILES` array in `.project-brief-monitor`

### Version Numbering
- Major.Minor format (e.g., 1.0, 1.1, 2.0)
- Auto-increments minor version on each update
- Manual major version updates for significant milestones

## Integration with Development Workflow

### Continuous Integration
The monitoring system integrates with:
- **Git workflows**: Automatic updates on significant commits
- **Development cycles**: Tracks sprint progress and phase completion
- **Feature releases**: Documents new capabilities and improvements

### Quality Gates
Updates are triggered when:
- Key configuration files change
- New features are added to core modules
- Documentation is updated
- Sprint milestones are reached

### Stakeholder Communication
- **Executive updates**: Brief always reflects current status
- **Team coordination**: Changes documented in real-time
- **Project planning**: Historical update log provides change audit trail

## Best Practices

### For Development Teams
1. **Commit messages**: Use conventional commit format to trigger automatic updates
2. **Major changes**: Manual update with detailed reason for significant modifications
3. **Pre-release**: Ensure monitoring system is active before major releases

### For Project Management
1. **Meeting prep**: Review brief before stakeholder meetings
2. **Status reporting**: Use brief as single source of truth for project status
3. **Change tracking**: Monitor update logs for project velocity insights

### For Stakeholders
1. **Regular review**: Check document version and update date
2. **Change awareness**: Review update notices for recent modifications
3. **Feedback loop**: Communicate requirements changes to trigger manual updates

## Security Considerations

### File Permissions
- Monitoring scripts: Executable by project team only
- Log files: Read/write by project team, read-only for stakeholders
- Brief document: Read access for all authorized personnel

### Sensitive Information
- No credentials or secrets in monitoring logs
- Brief contains business-sensitive information - restrict access appropriately
- Update notifications do not expose internal implementation details

## Maintenance Schedule

### Daily Operations
- **Automated**: Monitoring system runs continuously
- **Manual check**: Verify system status during daily standups

### Weekly Maintenance
- **Log review**: Check update frequency and patterns
- **System health**: Verify no errors in monitoring output
- **Stakeholder sync**: Ensure brief meets current communication needs

### Monthly Maintenance
- **Log rotation**: Archive old update logs
- **System optimization**: Review monitoring efficiency
- **Stakeholder feedback**: Gather input on brief effectiveness

## Support and Escalation

### Common Issues
1. **Brief out of date**: Run manual update
2. **Monitoring stopped**: Restart system
3. **Git hooks not working**: Reinstall hooks

### Escalation Path
1. **Level 1**: Development team member
2. **Level 2**: Technical lead
3. **Level 3**: Project manager

### Emergency Procedures
For critical stakeholder meetings requiring immediate brief update:
```bash
# Emergency manual update
./scripts/update-project-brief.sh update "Emergency update for stakeholder meeting"

# Verify update completed
grep "Document Version" COMPREHENSIVE_PROJECT_BRIEF.md
```