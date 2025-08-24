# LokDarpan Development Script Suite 🛠️

This document provides a comprehensive list of all scripts available for development, testing, and documentation management in the LokDarpan project.

## Quick Reference

### Daily Development Workflow
```bash
# 1. Enhanced startup with health validation
./scripts/dev-start.sh

# 2. System health check
python scripts/system-health-monitor.py

# 3. Update documentation (when dependencies installed)
python scripts/living-docs-engine.py --full-update

# 4. Error pattern analysis (when dependencies installed)  
python scripts/error-analysis-suite.py
```

## Core Scripts

### System Management
| Script | Purpose | Usage | Dependencies |
|--------|---------|--------|--------------|
| `dev-start.sh` | Enhanced development startup with validation | `./scripts/dev-start.sh` | None |
| `dev-stop.sh` | Graceful development shutdown | `./scripts/dev-stop.sh` | None |
| `health-check-dev.sh` | 24-point development health check | `./scripts/health-check-dev.sh` | None |
| `quick-recovery.sh` | Intelligent issue recovery | `./scripts/quick-recovery.sh` | None |

### Living Documentation
| Script | Purpose | Usage | Dependencies |
|--------|---------|--------|--------------|
| `living-docs-engine.py` | Main documentation engine | `python scripts/living-docs-engine.py --full-update` | GitPython, jinja2 |
| `documentation-automation.py` | Git-integrated doc automation | `python scripts/documentation-automation.py` | GitPython |
| `living-docs-generator.py` | Alternative doc generator | `python scripts/living-docs-generator.py` | jinja2 |

### Error Tracking & Analysis
| Script | Purpose | Usage | Dependencies |
|--------|---------|--------|--------------|
| `system-health-monitor.py` | Real-time system health | `python scripts/system-health-monitor.py` | psutil |
| `error-analysis-suite.py` | ML-powered error analysis | `python scripts/error-analysis-suite.py` | scikit-learn, matplotlib |
| `dev-ops-suite.py` | DevOps monitoring suite | `python scripts/dev-ops-suite.py` | psutil, requests |

### Testing & Validation
| Script | Purpose | Usage | Dependencies |
|--------|---------|--------|--------------|
| `run_tests.py` | Comprehensive test runner | `python scripts/run_tests.py` | pytest |
| `system-integration-test.py` | Full system integration tests | `python scripts/system-integration-test.py` | requests |
| `validate-quality-gates.sh` | Quality gate validation | `./scripts/validate-quality-gates.sh` | None |

### Automation Setup
| Script | Purpose | Usage | Dependencies |
|--------|---------|--------|--------------|
| `setup-automation-cron.sh` | Cron job setup for automation | `./scripts/setup-automation-cron.sh` | None |
| `strategic-research-automation.py` | Research automation | `python scripts/strategic-research-automation.py` | requests |
| `setup-research-cron.sh` | Research cron setup | `./scripts/setup-research-cron.sh` | None |

## Dependency Installation

### For Living Documentation System
```bash
source backend/venv/bin/activate
pip install GitPython jinja2 psutil scikit-learn matplotlib seaborn numpy
```

### For Full Error Analysis
```bash
source backend/venv/bin/activate  
pip install scikit-learn matplotlib seaborn numpy psutil requests
```

## Usage Patterns

### During Development
```bash
# Start development environment
./scripts/dev-start.sh

# Check system health periodically
python scripts/system-health-monitor.py

# End of day - update documentation
python scripts/living-docs-engine.py --full-update
```

### During Testing Phase
```bash
# Run comprehensive tests
python scripts/run_tests.py

# System integration validation
python scripts/system-integration-test.py

# Quality gate validation
./scripts/validate-quality-gates.sh
```

### For Error Investigation
```bash
# Health check first
python scripts/system-health-monitor.py

# Analyze error patterns (requires ML dependencies)
python scripts/error-analysis-suite.py

# Quick issue recovery
./scripts/quick-recovery.sh
```

### Documentation Updates
```bash
# Full documentation refresh
python scripts/living-docs-engine.py --full-update

# Create templates only
python scripts/living-docs-engine.py --create-templates

# Health check only
python scripts/living-docs-engine.py --health-check

# Error analysis only  
python scripts/living-docs-engine.py --error-analysis
```

## Automation Schedule

The following automation is available via cron jobs:

| Frequency | Task | Script |
|-----------|------|--------|
| Every 30 min (9-7 PM) | Health monitoring | `system-health-monitor.py` |
| Every 2 hours (9-7 PM) | Error analysis | `error-analysis-suite.py` |
| Daily 8 AM | Documentation update | `living-docs-engine.py --full-update` |
| Daily 6 PM | Documentation automation | `documentation-automation.py` |

**Setup**: Run `./scripts/setup-automation-cron.sh` for cron job configuration.

## Current System Status

✅ **Initialization Complete**: All core scripts operational  
✅ **Health Monitoring**: Active system health tracking  
✅ **Documentation Engine**: Living docs system initialized  
✅ **Automation Setup**: Cron job configuration ready

**Next Steps**:
1. Install ML dependencies for advanced error analysis
2. Set up cron jobs for automation (manual step required)
3. Run daily health checks during development

## Troubleshooting

### Common Issues
- **Python not found**: Use `python3` instead of `python`
- **Dependencies missing**: Install via pip in backend virtual environment
- **Permission denied**: Use `chmod +x script-name.sh` for shell scripts
- **WSL line endings**: Scripts may have Windows line endings (CR/LF)

### Quick Fixes
```bash
# Fix line endings for shell scripts
dos2unix scripts/*.sh

# Activate backend environment for Python scripts
source backend/venv/bin/activate

# Check script dependencies
python scripts/script-name.py --help
```

## Integration with LokDarpan Architecture

All scripts are designed to work seamlessly with:
- **Flask Backend**: Uses backend virtual environment and database connections
- **React Frontend**: Monitors frontend performance and errors  
- **PostgreSQL Database**: Tracks database health and performance
- **Political Strategist**: Integrates with AI services monitoring
- **Redis Caching**: Monitors cache performance and optimization
- **Process Management**: Handles multi-service coordination

**Documentation Updates**: This file is automatically updated by the living documentation system to reflect new scripts and capabilities.

---

*Generated by LokDarpan Living Documentation Engine v1.0*  
*Last Updated: 2025-08-24*