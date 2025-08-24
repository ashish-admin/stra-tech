# `/BMad:sprint-continuation` - Expert Sprint Command

## Command Definition
```bash
/BMad:sprint-continuation [--phase PHASE] [--priority PRIORITY] [--scope SCOPE] [--timeline DAYS]
```

## Purpose
Launch the final phase of LokDarpan sprint with automated multi-agent coordination for Political Strategist completion and production readiness.

## Parameters

### `--phase` (optional)
- **Default**: `week-3-production-readiness`
- **Options**: 
  - `week-3-production-readiness`: Full Week 3 execution
  - `political-strategist-focus`: AI features only
  - `backend-hardening`: Quality and testing focus
  - `production-deployment`: Deployment readiness

### `--priority` (optional)  
- **Default**: `high`
- **Options**: `critical`, `high`, `medium`
- **Impact**: Affects resource allocation and timeline compression

### `--scope` (optional)
- **Default**: `political-strategist-completion+backend-hardening+deployment`
- **Options**:
  - `political-strategist-completion`: Stories 3.1.1, 3.1.2, 3.2.2
  - `backend-hardening`: Test coverage, security, logging
  - `production-deployment`: Infrastructure and monitoring
  - `full-sprint`: All remaining work items

### `--timeline` (optional)
- **Default**: `5-7-days`  
- **Options**: `3-days`, `5-days`, `5-7-days`, `1-week`
- **Impact**: Adjusts parallel execution and resource intensity

## Auto-Activation Matrix

### Team Members Activated
```yaml
automatic_activation:
  pm_john: 
    triggers: ["story-refinement", "requirements-validation", "stakeholder-coordination"]
    responsibilities: ["Political Strategist feature prioritization", "Campaign team alignment"]
    
  sm_bob:
    triggers: ["story-breakdown", "sprint-coordination", "task-management"] 
    responsibilities: ["Remaining story creation", "Timeline management", "Daily standups"]
    
  dev_james:
    triggers: ["ai-orchestration", "backend-implementation", "testing"]
    responsibilities: ["Multi-model AI implementation", "Backend quality hardening"]
    
  qa_quinn:
    triggers: ["quality-validation", "production-readiness", "testing-coordination"]
    responsibilities: ["Political Strategist quality gates", "Production validation"]
```

### External Team Coordination
```yaml
external_team_alerts:
  ai_ml_engineer:
    required_for: ["multi-model-orchestration", "confidence-scoring"] 
    estimated_hours: "12-16 hours over 3 days"
    coordination_agent: "dev_james"
    
  devops_engineer:
    required_for: ["production-deployment", "monitoring-setup"]
    estimated_hours: "8-12 hours over 2 days" 
    coordination_agent: "qa_quinn"
```

## Execution Workflow

### Phase 1: Sprint Initiation (Auto-executed)
1. **Story Queue Prioritization**: Parse remaining DRAFT stories, create priority queue
2. **Team Activation**: Auto-activate BMad agents based on story requirements
3. **Resource Coordination**: Alert external team members with specific requirements
4. **Quality Gate Setup**: Configure automated quality gates and success criteria

### Phase 2: Multi-Agent Development (Days 1-5)
1. **PM (John)**: Refine Political Strategist requirements and acceptance criteria
2. **SM (Bob)**: Break down remaining stories into actionable tasks with clear handoffs
3. **Dev (James)**: Implement AI orchestration (Stories 3.1.1, 3.1.2, 3.2.2) + backend quality
4. **QA (Quinn)**: Continuous quality validation and production readiness assessment

### Phase 3: Production Readiness (Days 5-7)
1. **Integrated Testing**: End-to-end Political Strategist validation
2. **Production Deployment**: Infrastructure automation and monitoring setup  
3. **Campaign Team Training**: User enablement and documentation handoff
4. **Success Metrics Validation**: Confirm all quality gates and business objectives

## Success Criteria Automation

### Technical Metrics (Auto-Validated)
```yaml
political_strategist_validation:
  multi_model_orchestration_functional: true
  confidence_scoring_operational: true  
  credibility_pipeline_complete: true
  circuit_breaker_tested: true
  cost_optimization_achieved: "40% reduction"

backend_quality_gates:
  test_coverage_achieved: "80%+ backend, 75%+ frontend"
  security_compliance: "95%+ score"
  performance_validated: "<30s AI analysis, <2s standard"
  health_monitoring_operational: true

production_readiness:
  deployment_automation_ready: true
  monitoring_configured: true
  campaign_team_training_complete: true
  reliability_target_met: "99.5% uptime"
```

## Risk Mitigation (Built-in)

### Automatic Risk Detection
- **Timeline Pressure**: Auto-suggests scope reduction if progress falls behind
- **Technical Blockers**: Escalates to appropriate specialist (AI Engineer, DevOps)  
- **Quality Gate Failures**: Triggers additional QA resources and validation cycles
- **Integration Issues**: Activates fallback strategies and rollback procedures

### Contingency Activation
```yaml
risk_response_automation:
  ai_service_integration_failure:
    action: "activate_local_fallback_mode"
    rollback: "disable_multi_model_orchestration"
    
  timeline_compression_needed:
    action: "reduce_scope_to_core_features" 
    priority_focus: "political_strategist_essential_only"
    
  quality_gate_blocking:
    action: "parallel_qa_sprint_with_additional_resources"
    escalation: "technical_lead_review"
```

## Usage Examples

### Full Sprint Continuation (Default)
```bash
/BMad:sprint-continuation
# Executes full Week 3 with all agents, 5-7 day timeline, high priority
```

### Critical Timeline (Compressed)
```bash  
/BMad:sprint-continuation --priority critical --timeline 3-days --scope political-strategist-completion
# Focus on AI features only, compressed timeline, maximum resource allocation
```

### Production Focus
```bash
/BMad:sprint-continuation --phase production-deployment --scope backend-hardening+deployment
# Backend quality and deployment preparation, standard timeline
```

### Political Strategist Only
```bash
/BMad:sprint-continuation --scope political-strategist-completion --phase political-strategist-focus
# AI features implementation only, optimized for Political Strategist completion
```

## Integration with BMad Framework

### Command Registration
```yaml
bmad_commands:
  sprint-continuation:
    task_file: "sprint-continuation-lokdarpan.md"
    auto_agents: ["pm", "sm", "dev", "qa"]  
    external_coordination: true
    quality_gates_enabled: true
    success_metrics_tracking: true
```

### Agent Handoff Protocol  
```yaml
agent_coordination:
  story_handoff: "pm -> sm -> dev -> qa"
  parallel_execution: ["dev+qa", "pm+sm"] 
  escalation_path: "agent -> technical_lead -> stakeholder"
  success_validation: "all_agents_sign_off_required"
```

## Expected Outcomes

### Immediate (Day 1)
- Sprint initiation complete with team coordination
- Story priority queue established and assigned  
- External team members alerted and scheduled
- Quality gates configured and automated

### Mid-Sprint (Days 3-4)
- Political Strategist core features operational
- Backend quality hardening 50%+ complete
- Integration testing in progress
- Production deployment preparation started

### Sprint Completion (Days 5-7)
- **Campaign-ready Political Intelligence Platform**
- **99.5%+ system reliability validated**
- **Political Strategist fully operational** with multi-model AI
- **80%+ backend test coverage achieved**
- **Production deployment automation complete**
- **Campaign team training and handoff successful**

## Command Authority

**Execution Authority**: Technical Lead + Product Owner approval required  
**Scope Modification**: PM (John) has authority to adjust feature scope  
**Quality Gates**: QA (Quinn) has authority to block production deployment  
**Timeline Adjustment**: SM (Bob) coordinates timeline changes with stakeholder approval