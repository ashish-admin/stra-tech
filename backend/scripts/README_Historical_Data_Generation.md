# Historical Data Generation for LokDarpan Political Intelligence

## Overview

This guide provides comprehensive instructions for generating 6 months of historical political intelligence data for LokDarpan (February-August 2025), enabling rich analytics and trend analysis for the Hyderabad political landscape.

## Quick Start (5-Minute Setup)

```bash
# 1. Navigate to backend directory
cd /mnt/c/Users/amukt/Projects/LokDarpan/backend

# 2. Prepare infrastructure
python scripts/prepare_historical_infrastructure.py --action=prepare

# 3. Generate historical data (full 6 months)
python scripts/historical_data_master_generator.py \
  --start-date=2025-02-01 \
  --end-date=2025-08-25 \
  --content-types=epapers,posts,alerts,summaries \
  --batch-size=1000

# 4. Restore performance indexes
python scripts/prepare_historical_infrastructure.py --action=restore

# 5. Validate data quality
python scripts/validate_historical_data_quality.py --output-file=validation_report.json
```

## Expected Results

After completion, you'll have:
- **8,000-12,000** historical epaper articles with realistic publication distribution
- **25,000-40,000** political analysis posts with sentiment and party attribution
- **1,200-2,000** strategic intelligence alerts with temporal clustering
- **900-1,500** ward-level strategic summaries
- **200-300** political authors and correspondents
- **Complete temporal coverage** from February 1, 2025 to August 25, 2025

## Detailed Implementation Guide

### Phase 1: Infrastructure Preparation

**System Requirements Check:**
```bash
# Check system resources before starting
python scripts/prepare_historical_infrastructure.py --action=prepare

# Expected output:
# System Resources:
#   CPU Usage: <30%
#   Memory Usage: <80%
#   Available Memory: >2GB
#   Disk Usage: <85%
```

**Infrastructure Components Created:**
- Staging tables for bulk operations
- Progress tracking infrastructure
- Performance optimizations
- Batch processing configuration

### Phase 2: Historical Content Generation

**Full Historical Data Generation:**
```bash
# Generate all content types for complete 6-month period
python scripts/historical_data_master_generator.py \
  --start-date=2025-02-01 \
  --end-date=2025-08-25 \
  --content-types=epapers,posts,alerts,summaries,leaders,clusters \
  --batch-size=1000
```

**Incremental Generation Options:**
```bash
# Generate only February-May data first
python scripts/historical_data_master_generator.py \
  --start-date=2025-02-01 \
  --end-date=2025-05-31 \
  --content-types=epapers,posts \
  --batch-size=500

# Then generate June-August with higher resolution
python scripts/historical_data_master_generator.py \
  --start-date=2025-06-01 \
  --end-date=2025-08-25 \
  --content-types=all \
  --batch-size=500
```

**Content Type Options:**
- `epapers`: Raw news articles from major publications
- `posts`: Political analysis posts with sentiment
- `alerts`: Strategic intelligence alerts
- `summaries`: Ward-level strategic summaries  
- `leaders`: Political leader mentions and tracking
- `clusters`: Issue clusters for trending topics
- `all`: Generate all content types

### Phase 3: Quality Assurance

**Comprehensive Data Validation:**
```bash
# Full validation with detailed report
python scripts/validate_historical_data_quality.py \
  --validation-type=all \
  --output-file=full_validation_report.json

# Specific validation types
python scripts/validate_historical_data_quality.py --validation-type=temporal
python scripts/validate_historical_data_quality.py --validation-type=content
python scripts/validate_historical_data_quality.py --validation-type=integrity
```

**Performance Optimization:**
```bash
# Restore indexes and optimize performance
python scripts/prepare_historical_infrastructure.py --action=restore

# Generate performance report
python scripts/prepare_historical_infrastructure.py --action=report
```

### Phase 4: Cleanup and Finalization

**Infrastructure Cleanup:**
```bash
# Remove staging tables and reset configuration
python scripts/prepare_historical_infrastructure.py --action=cleanup

# Final data integrity validation
python scripts/prepare_historical_infrastructure.py --action=validate
```

## Content Generation Details

### Political Timeline and Events

The generator creates realistic content based on Telangana political timeline:

**February 2025**: Post-election consolidation
- Congress government 100-day reviews
- Policy implementation planning
- Coalition dynamics

**March-April 2025**: Budget and policy focus
- State Budget 2025-26 presentation  
- GHMC budget allocations
- Infrastructure development announcements

**May-June 2025**: Summer governance challenges
- Water crisis management
- Power supply optimization
- Monsoon preparation initiatives

**July-August 2025**: Current political developments
- Festival preparation coordination
- Education planning
- Ongoing political dynamics

### Ward-Specific Content Generation

The system generates content for 150+ GHMC wards with:

**Ward Categories:**
- Old city Muslim majority areas (AIMIM strongholds)
- Affluent Hindu majority areas (BJP/INC competition)
- Middle-class mixed demographics (competitive dynamics)
- Tech corridor areas (BJP/BRS focus)
- Working-class areas (BRS/INC/AIMIM competition)

**Content Variation by Ward:**
- Demographics-specific issues and concerns
- Party competition patterns
- Sentiment tendencies based on local politics
- Leader mention frequencies based on constituency relevance

### Content Templates and Realism

**Article Generation Features:**
- 50+ content templates for different political contexts
- Leader mention probability matrices
- Issue evolution tracking over time
- Sentiment progression based on political climate
- Event-driven content spikes around major developments

**Quality Assurance:**
- SHA256-based deduplication prevention
- Referential integrity maintenance
- Temporal distribution validation
- Content uniqueness verification (>85% unique)
- Political realism validation

## Performance Considerations

### System Resource Usage

**Memory Requirements:**
- Minimum: 4GB RAM available
- Recommended: 8GB+ RAM for optimal performance
- Peak usage during bulk operations: 2-3GB

**Disk Space Requirements:**
- Database size increase: 500MB - 1.5GB
- Staging tables: Additional 200-500MB during operation
- Log files: 50-100MB

**Processing Time Estimates:**
- Full 6-month generation: 2-4 hours
- Infrastructure preparation: 5-10 minutes
- Quality validation: 10-20 minutes
- Index restoration: 15-30 minutes

### Performance Optimization

**Database Optimizations Applied:**
- Temporary index removal during bulk inserts
- Increased work_mem and maintenance_work_mem
- Batch processing with configurable sizes
- Connection pooling optimization

**Monitoring and Progress Tracking:**
- Real-time progress reporting
- Performance metrics collection
- Error detection and rollback capabilities
- Resource usage monitoring

## Troubleshooting

### Common Issues and Solutions

**Issue: High Memory Usage**
```bash
# Solution: Reduce batch size
python scripts/historical_data_master_generator.py \
  --batch-size=500  # Instead of 1000
```

**Issue: Slow Performance**
```bash
# Solution: Check system resources and optimize
python scripts/prepare_historical_infrastructure.py --action=report

# Consider breaking into smaller date ranges
python scripts/historical_data_master_generator.py \
  --start-date=2025-02-01 \
  --end-date=2025-04-30  # Generate in chunks
```

**Issue: Validation Failures**
```bash
# Solution: Run specific validation to identify issues
python scripts/validate_historical_data_quality.py --validation-type=integrity

# Check for orphaned records and fix
python scripts/prepare_historical_infrastructure.py --action=validate
```

### Error Recovery

**Progress Tracking:**
```sql
-- Check generation progress
SELECT * FROM historical_data_progress ORDER BY started_at DESC;

-- Check performance metrics
SELECT * FROM bulk_operation_metrics ORDER BY recorded_at DESC LIMIT 20;
```

**Rollback Procedures:**
```bash
# If generation fails midway, clean up staging data
python scripts/prepare_historical_infrastructure.py --action=cleanup

# Restore from backup if needed
python scripts/backup_and_recovery.py --restore --tag=pre_historical_backfill
```

## Data Quality Standards

### Validation Thresholds

- **Temporal Coverage**: >95% of expected days
- **Content Uniqueness**: >85% unique content
- **Referential Integrity**: >99% valid relationships
- **Ward Coverage**: >90% of GHMC wards
- **Sentiment Balance**: <20% deviation from expected distribution

### Quality Metrics

**Content Quality Indicators:**
- Average article length: 800-2,500 characters
- Post length: 200-800 characters
- Party distribution reflects realistic political landscape
- Sentiment distribution shows expected political patterns
- Leader mentions correlate with actual political activity

**Performance Quality Standards:**
- Search queries: <1 second response time
- Analytics queries: <2 seconds response time
- Data integrity: 100% referential consistency
- Index efficiency: >90% query optimization

## Integration with Existing System

### API Compatibility

The generated historical data integrates seamlessly with existing LokDarpan APIs:

```bash
# Test API endpoints with historical data
curl "http://localhost:5000/api/v1/trends?ward=Jubilee%20Hills&days=180"
curl "http://localhost:5000/api/v1/pulse/Himayath%20Nagar?days=90"
curl "http://localhost:5000/api/v1/competitive-analysis?city=Begumpet"
```

### Dashboard Compatibility

Historical data populates all dashboard components:
- Strategic Summary: 6-month trends and patterns
- Time Series Charts: Historical emotion and mention trends
- Competitor Analysis: Long-term party competition metrics
- Alerts Panel: Historical alert patterns and evolution
- Location Map: Ward-level historical intelligence

### Analytics Enhancement

With 6 months of data, the system gains:
- Trend analysis capabilities
- Seasonal pattern recognition
- Political cycle correlation
- Predictive analytics foundation
- Comprehensive competitive intelligence

## Maintenance and Updates

### Regular Maintenance

```bash
# Weekly data quality check
python scripts/validate_historical_data_quality.py --validation-type=all

# Monthly performance optimization
python scripts/prepare_historical_infrastructure.py --action=report

# Quarterly comprehensive validation
python scripts/validate_historical_data_quality.py \
  --output-file=quarterly_report_$(date +%Y%m%d).json
```

### Data Refresh

```bash
# Update recent data (last 30 days) while preserving historical data
python scripts/historical_data_master_generator.py \
  --start-date=2025-07-25 \
  --end-date=2025-08-25 \
  --content-types=posts,alerts \
  --batch-size=500
```

## Success Criteria

### Technical Success Metrics
- ✅ Zero data loss during generation
- ✅ All performance targets met (<2s response times)
- ✅ Data integrity maintained (100% referential consistency)
- ✅ Quality score >90% on all validation checks
- ✅ Complete temporal coverage (Feb 1 - Aug 25, 2025)

### Business Success Metrics  
- ✅ Rich historical context for political analysis
- ✅ Trend identification and pattern recognition
- ✅ Enhanced strategic intelligence capabilities
- ✅ Foundation for predictive analytics
- ✅ Comprehensive competitive landscape analysis

## Support and Troubleshooting

For issues or questions:

1. Check validation reports for specific error details
2. Review system resource usage and performance metrics
3. Examine progress tracking tables for operation status
4. Consult error logs for detailed debugging information
5. Use staging tables for safe operation testing

---

**Generated by**: Database Migration Specialist  
**Date**: August 2025  
**Version**: 1.0  
**Status**: Production Ready