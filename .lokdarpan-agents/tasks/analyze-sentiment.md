# Sentiment Analysis Task

**Task Type**: Intelligence Analysis  
**Complexity Level**: Standard  
**Estimated Duration**: 5-10 minutes  
**Requires**: LokDarpan API access, ward specification

## Task Description
Perform comprehensive sentiment analysis for a specified ward using LokDarpan's multi-source intelligence platform. This task integrates real-time news monitoring, social media sentiment, and political narrative analysis to provide actionable insights for campaign strategy.

## Prerequisites
- [ ] LokDarpan backend services operational (Flask + Redis + PostgreSQL)
- [ ] AI services available (Gemini 2.5 Pro + Perplexity AI)
- [ ] Ward name validation and normalization
- [ ] Historical baseline data for comparison

## Task Parameters

**Required Parameters:**
- `ward_name`: Target ward for analysis (e.g., "Jubilee Hills", "Banjara Hills")
- `analysis_depth`: "quick" (5min), "standard" (10min), "deep" (20min)

**Optional Parameters:**
- `timeframe`: Analysis period (default: 7 days, options: 1d, 7d, 30d)
- `sentiment_focus`: Specific issues or topics to emphasize
- `comparison_baseline`: Compare against previous period or other wards
- `demographic_breakdown`: Include demographic-specific sentiment analysis

## Execution Workflow

### Step 1: Data Collection & Integration
```yaml
elicit: true
format: "Please specify the ward name and analysis depth:"
example: "Ward: Jubilee Hills, Depth: standard"
required_fields:
  - ward_name
  - analysis_depth
```

**Wait for user input before proceeding**

### Step 2: API Data Retrieval
1. **Primary Intelligence Gathering**
   - Access `/api/v1/strategist/{ward_name}` for AI-powered analysis
   - Retrieve `/api/v1/trends?ward={ward_name}&days={timeframe}` for historical trends
   - Query `/api/v1/pulse/{ward_name}` for strategic briefing data

2. **Supplementary Data Sources**
   - Social media sentiment tracking
   - News article analysis and classification
   - Historical voting patterns and demographic data
   - Competition analysis from other political parties

### Step 3: Multi-Dimensional Sentiment Processing
1. **Emotional Sentiment Analysis**
   - Positive/Negative/Neutral sentiment scoring
   - Emotional intensity measurement (anger, hope, fear, enthusiasm)
   - Trend analysis over specified timeframe
   - Comparison with historical baseline

2. **Issue-Based Sentiment Breakdown**
   - Development and infrastructure sentiment
   - Law and order and safety concerns
   - Economic issues and employment
   - Social and cultural issues
   - Environmental concerns

3. **Demographic Sentiment Segmentation**
   - Age-based sentiment differences
   - Economic class variations
   - Religious/cultural community perspectives
   - Professional/occupational sentiment patterns

### Step 4: Political Context Integration
1. **Party-Specific Sentiment Analysis**
   - Current ruling party perception
   - Opposition party sentiment trends
   - Individual leader approval/disapproval
   - Coalition dynamics and alliance effects

2. **Narrative Analysis**
   - Dominant political narratives in the ward
   - Effectiveness of current messaging
   - Opposition counter-narratives
   - Media framing and bias analysis

### Step 5: Strategic Implications Assessment
1. **Electoral Impact Analysis**
   - How sentiment trends may affect voting behavior
   - Identification of persuadable voter segments
   - Assessment of mobilization requirements
   - Competitive positioning implications

2. **Risk and Opportunity Identification**
   - Areas of vulnerability requiring attention
   - Emerging opportunities for positive messaging
   - Potential crisis areas requiring monitoring
   - Strategic messaging opportunities

### Step 6: Actionable Recommendations
1. **Immediate Actions (1-7 days)**
   - Priority issues requiring immediate attention
   - Messaging adjustments needed
   - Coalition or community engagement priorities
   - Crisis prevention measures

2. **Medium-Term Strategy (1-4 weeks)**
   - Sustained messaging campaign recommendations
   - Community engagement initiatives
   - Policy position adjustments
   - Alliance-building opportunities

3. **Long-Term Planning (1-3 months)**
   - Strategic narrative development
   - Demographic outreach programs
   - Coalition-building strategies
   - Electoral positioning recommendations

## Output Format

### Executive Summary
- Overall sentiment score and trend direction
- Top 3 strategic insights
- Most critical action items
- Confidence level and data quality assessment

### Detailed Analysis Report
```yaml
ward_analysis:
  ward_name: "{specified_ward}"
  analysis_date: "{current_timestamp}"
  timeframe_analyzed: "{analysis_period}"
  
overall_sentiment:
  current_score: "{0-100 scale}"
  trend_direction: "improving/declining/stable"
  historical_comparison: "{vs baseline period}"
  confidence_level: "{high/medium/low}"

dimensional_breakdown:
  emotional_sentiment:
    positive: "{percentage}"
    negative: "{percentage}"
    neutral: "{percentage}"
  
  issue_based_sentiment:
    development: "{score and trend}"
    law_order: "{score and trend}"
    economic: "{score and trend}"
    social_cultural: "{score and trend}"
    environmental: "{score and trend}"

strategic_implications:
  electoral_impact: "{narrative description}"
  key_opportunities: ["{list of opportunities}"]
  risk_areas: ["{list of risks}"]
  
actionable_recommendations:
  immediate_actions: ["{prioritized action items}"]
  medium_term_strategy: ["{strategic recommendations}"]
  long_term_planning: ["{long-term strategic items}"]

data_sources:
  primary_sources: ["{list of data sources}"]
  analysis_methods: ["{methodologies used}"]
  quality_indicators: "{data quality assessment}"
```

### Supporting Evidence
- Key quotes and examples from source material
- Statistical trends and patterns
- Comparative analysis with other wards or time periods
- Source credibility and reliability assessment

## Quality Control Checklist
- [ ] All data sources verified and current
- [ ] Statistical analysis methods appropriate and accurate
- [ ] Political context properly integrated
- [ ] Recommendations actionable and specific
- [ ] Confidence levels and limitations clearly stated
- [ ] Executive summary captures key insights effectively

## Success Criteria
- **Accuracy**: Sentiment analysis reflects actual public opinion trends
- **Actionability**: Recommendations can be implemented by campaign teams
- **Timeliness**: Analysis completed within specified timeframe
- **Comprehensiveness**: All major sentiment dimensions covered
- **Strategic Value**: Insights directly support electoral strategy development

---

**Note**: This task should be executed by agents with access to LokDarpan's intelligence infrastructure and expertise in political sentiment analysis. Results should be treated as confidential campaign intelligence and shared only with authorized personnel.