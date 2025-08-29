# Strategic Briefing Generation Task

**Task Type**: Strategic Analysis & Reporting  
**Complexity Level**: High  
**Estimated Duration**: 15-30 minutes  
**Requires**: Full LokDarpan intelligence access, senior-level strategic thinking

## Task Description
Generate a comprehensive strategic briefing that synthesizes all available intelligence sources to provide campaign leadership with actionable insights and strategic recommendations. This is the flagship analytical product for executive decision-making.

## Prerequisites
- [ ] All LokDarpan services operational and data current
- [ ] Multi-agent coordination capabilities active
- [ ] Access to historical strategic context and baseline data
- [ ] Clearance for executive-level intelligence dissemination

## Task Parameters

**Required Parameters:**
- `briefing_type`: "executive", "tactical", "crisis", "competitive"
- `target_audience`: "campaign_leadership", "field_directors", "communications_team"
- `scope`: "single_ward", "multi_ward", "city_wide", "coalition_wide"

**Optional Parameters:**
- `time_horizon`: Strategic planning timeframe (default: 30 days)
- `classification_level`: "internal", "restricted", "confidential"
- `update_frequency`: For ongoing briefing series
- `special_focus`: Specific issues or events requiring emphasis

## Execution Workflow

### Step 1: Briefing Specification
```yaml
elicit: true
format: "Please specify briefing parameters:"
example: |
  Briefing Type: executive
  Target Audience: campaign_leadership  
  Scope: city_wide
  Time Horizon: 60 days
  Special Focus: upcoming municipal elections
required_fields:
  - briefing_type
  - target_audience
  - scope
```

**Wait for user input before proceeding**

### Step 2: Intelligence Synthesis & Integration
1. **Multi-Source Data Aggregation**
   - Real-time sentiment and polling data
   - Competitive intelligence and opposition research
   - Electoral forecasting and predictive analytics
   - Crisis monitoring and threat assessment
   - Coalition dynamics and stakeholder analysis

2. **Strategic Context Development**
   - Historical trend analysis and pattern recognition
   - Comparative analysis with similar electoral contexts
   - Integration of national, state, and local political dynamics
   - Economic, social, and demographic factor analysis

### Step 3: Strategic Analysis Framework
1. **Situation Assessment (SWOT+)**
   - **Strengths**: Current competitive advantages and assets
   - **Weaknesses**: Vulnerabilities and areas requiring attention
   - **Opportunities**: Emerging strategic opportunities
   - **Threats**: Potential risks and challenges
   - **Trends**: Key developments likely to impact strategy
   - **Uncertainties**: Areas of strategic ambiguity requiring monitoring

2. **Competitive Landscape Analysis**
   - Opposition party positioning and strategic moves
   - Coalition dynamics and alliance opportunities/threats
   - Media narrative environment and framing battles
   - Key influencer and stakeholder positioning

### Step 4: Strategic Options Development
1. **Primary Strategic Pathways**
   - Develop 3-5 strategic options with different risk/reward profiles
   - Assess resource requirements and feasibility for each option
   - Evaluate potential outcomes and probability of success
   - Identify key decision points and timing considerations

2. **Tactical Implementation Considerations**
   - Resource allocation recommendations across options
   - Timeline and sequencing for optimal strategic impact
   - Coordination requirements across campaign functions
   - Success metrics and progress tracking mechanisms

### Step 5: Risk Assessment & Mitigation
1. **Strategic Risk Analysis**
   - High-impact potential negative developments
   - Probability assessment and early warning indicators
   - Cascade effects and secondary risk considerations
   - Opposition counter-move possibilities

2. **Mitigation Strategy Development**
   - Preventive measures to reduce risk probability
   - Contingency plans for high-priority risk scenarios
   - Resource reserves and rapid response capabilities
   - Monitoring and early warning systems

### Step 6: Actionable Recommendations
1. **Priority Actions (Next 7 Days)**
   - Immediate decisions required from leadership
   - Critical tactical implementations
   - Resource allocation decisions
   - Stakeholder engagement priorities

2. **Strategic Initiatives (Next 30 Days)**
   - Major strategic moves and initiatives
   - Coalition-building and relationship development
   - Message development and narrative campaigns
   - Organizational and operational adjustments

3. **Long-Term Strategic Development (Beyond 30 Days)**
   - Foundational strategic positioning
   - Long-term coalition and alliance development
   - Institutional capacity building
   - Electoral preparation and positioning

## Briefing Output Format

### Executive Summary (1 Page Maximum)
```yaml
strategic_assessment:
  overall_position: "{current strategic position summary}"
  key_developments: ["{top 3-5 strategic developments}"]
  priority_recommendations: ["{top 3 actionable recommendations}"]
  decision_deadlines: ["{critical decisions required with timelines}"]
  confidence_level: "{strategic assessment confidence}"

bottom_line_up_front:
  strategic_recommendation: "{primary strategic recommendation}"
  resource_requirements: "{key resource needs}"
  success_probability: "{assessed probability of success}"
  critical_assumptions: ["{key assumptions underlying strategy}"]
```

### Detailed Strategic Analysis
1. **Situational Overview**
   - Current strategic position and recent developments
   - Key trend analysis and trajectory assessment
   - Competitive positioning and landscape shifts

2. **Strategic Options Analysis**
   - Option 1: [Name] - Description, resources, probability, risks
   - Option 2: [Name] - Description, resources, probability, risks  
   - Option 3: [Name] - Description, resources, probability, risks
   - Recommended Option: Rationale and implementation approach

3. **Risk Assessment Matrix**
   - High Priority Risks: Probability, Impact, Mitigation
   - Medium Priority Risks: Monitoring and contingency plans
   - Long-term Strategic Risks: Preparation and positioning

4. **Resource Allocation Framework**
   - Personnel deployment recommendations
   - Budget allocation priorities
   - Timeline and sequencing considerations
   - Performance measurement framework

### Supporting Intelligence Annexes
- **Appendix A**: Detailed competitive intelligence profiles
- **Appendix B**: Electoral forecasting and statistical analysis
- **Appendix C**: Coalition and stakeholder analysis
- **Appendix D**: Media environment and narrative analysis
- **Appendix E**: Crisis monitoring and early warning indicators

## Quality Assurance Protocol
1. **Multi-Agent Review**: Coordination with specialized agents for validation
2. **Source Verification**: Confirmation of critical intelligence and assumptions
3. **Strategic Logic Check**: Validation of strategic reasoning and conclusions
4. **Actionability Review**: Ensure recommendations are implementable
5. **Security Review**: Appropriate classification and distribution controls

## Success Criteria
- **Strategic Clarity**: Clear understanding of strategic position and options
- **Actionability**: Specific, implementable recommendations with timelines
- **Comprehensiveness**: All major strategic factors considered and integrated
- **Decision Support**: Enables confident strategic decision-making by leadership
- **Competitive Advantage**: Insights provide meaningful electoral advantages

## Distribution and Follow-up
- **Immediate Distribution**: Secure delivery to specified target audience
- **Briefing Session**: Optional in-person or virtual briefing presentation  
- **Q&A Support**: Available for clarification and additional analysis
- **Update Schedule**: Regular updates based on specified frequency
- **Implementation Tracking**: Monitor execution of recommendations

---

**Classification**: This briefing contains sensitive strategic analysis and should be handled according to campaign security protocols. Distribution should be limited to authorized personnel with legitimate need-to-know for strategic decision-making purposes.