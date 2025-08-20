# Contributing to LokDarpan

## Working with the AI Political Strategist

### Documentation First
- Read TASKS.md, CLAUDE.md, DEVELOPMENT_PLAN.md, REMEDIATION_PLAN.md, SECURITY*.md, TEST_RESULTS.md before coding
- Treat TASKS.md as SSOT for status; CLAUDE.md mirrors key outcomes only
- Use small commits, conventional messages, and keep docs updated each step

### AI Strategist Guidelines
- Outputs from the Political Strategist agent are intended for **internal strategic use only**
- All strategic recommendations should be reviewed before implementation
- The AI agent provides intelligence and analysis, not direct public messaging
- Maintain ethical standards and compliance with electoral guidelines

### Development Workflow

#### 1. Setup
```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend  
cd frontend
npm install
```

#### 2. Development Commands
```bash
# Start development servers
make dev

# Quality checks
make check

# Format code
make format
```

#### 3. Testing
```bash
# Run all tests
pytest backend/tests/
npm --prefix frontend test
npx playwright test e2e/strategist/

# Specific strategist tests
pytest tests/strategist/
```

#### 4. Commit Guidelines
- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`
- Update TASKS.md and CLAUDE.md with significant changes
- Run quality checks before committing
- Keep commits small and focused

### AI Agent Development

#### Political Strategist Architecture
```
backend/strategist/
├── __init__.py           # Module entry point
├── service.py           # Main service orchestrator
├── reasoner/            # AI reasoning engine
├── retriever/           # Information retrieval
├── nlp/                 # Natural language processing
├── credibility/         # Source verification
├── guardrails.py        # Compliance and safety
└── observability.py     # Monitoring and metrics
```

#### Core Principles
1. **Evidence-Based**: All strategic recommendations must be backed by citations
2. **Proactive Intelligence**: Focus on emerging opportunities and threats
3. **Ethical AI**: Respect privacy, avoid bias, maintain transparency
4. **Strategic Focus**: Deliver actionable intelligence for campaign advantage

### Quality Standards

#### Code Quality
- 100% test coverage for strategist modules
- Type hints for all Python functions
- ESLint/Prettier for frontend consistency
- Security scans with bandit and audit tools

#### Strategic Intelligence Quality
- >85% accuracy for political trend predictions
- <5 minutes freshness for critical intelligence
- Confidence scores for all recommendations
- Source attribution for all claims

### Security Guidelines

#### Data Protection
- Never log sensitive political data
- Encrypt AI API communications
- Implement proper access controls
- Regular security audits

#### AI Safety
- Input validation for all AI prompts
- Output filtering for inappropriate content
- Rate limiting to prevent abuse
- Human oversight for critical decisions

### Documentation Requirements

#### Technical Documentation
- API endpoints documented in OpenAPI format
- Component interfaces with TypeScript definitions
- Database schema changes with migration notes
- Deployment procedures with rollback plans

#### Strategic Documentation
- Intelligence source credibility assessments
- AI model performance benchmarks
- User workflow documentation
- Compliance and audit procedures

---

**Remember**: LokDarpan's Political Strategist is designed to provide decisive competitive advantages through ethical, evidence-based political intelligence. All contributions should uphold these standards while maintaining the highest levels of technical excellence.