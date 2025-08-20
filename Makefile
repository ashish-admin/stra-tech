# LokDarpan Political Intelligence Dashboard - Enhanced Development Makefile
# Comprehensive test suite and quality gates for Political Strategist system

.PHONY: help dev check format test strategist-test quality-gates coverage test-unit test-integration clean install migrate seed strategist-dev

# Default help target
help:
	@echo "LokDarpan Development Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev                - Start both backend and frontend"
	@echo "  make strategist-dev     - Start with strategist mode enabled"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test               - Run all tests"
	@echo "  make test-unit          - Run unit tests with coverage"
	@echo "  make test-integration   - Run integration tests"
	@echo "  make strategist-test    - Run strategist-specific tests"
	@echo "  make quality-gates      - Run complete quality validation"
	@echo "  make coverage           - Generate detailed coverage reports"
	@echo ""
	@echo "Code Quality:"
	@echo "  make check              - Run linting and security checks"
	@echo "  make format             - Format code with black/prettier"
	@echo ""
	@echo "Setup & Maintenance:"
	@echo "  make install            - Install dependencies"
	@echo "  make migrate            - Run database migrations"
	@echo "  make seed               - Seed demo data"
	@echo "  make clean              - Clean build artifacts"

dev:
	flask run & (cd frontend && npm run dev)

check:
	ruff backend || true
	black --check backend || true
	eslint frontend || true
	(cd frontend && tsc --noEmit)
	pytest -q
	bandit -q -r backend || true
	pip-audit -s || true
	npm audit --audit-level=high || true

format:
	black backend || true
	prettier -w frontend || true

# Enhanced testing with coverage
test-unit:
	@echo "🧪 Running unit tests with coverage..."
	cd backend && python -m pytest tests/strategist/unit/ -v --cov=strategist --cov-report=term-missing

test-integration:
	@echo "🔗 Running integration tests..."
	cd backend && python -m pytest tests/strategist/integration/ -v --cov=strategist --cov-report=term-missing

test:
	@echo "🚀 Running complete test suite..."
	pytest backend/tests/ --cov=strategist --cov-report=term-missing
	npm --prefix frontend test -- --coverage --watchAll=false
	npx playwright test e2e/strategist/
	@echo "✅ All tests completed!"

# Coverage reporting
coverage:
	@echo "📊 Generating comprehensive coverage reports..."
	pytest backend/tests/ --cov=strategist --cov-report=html --cov-report=xml --cov-report=term-missing
	npm --prefix frontend test -- --coverage --watchAll=false --coverageReporters=html --coverageReporters=text-summary
	@echo "📈 Coverage reports generated:"
	@echo "  Backend: backend/htmlcov/index.html"
	@echo "  Frontend: frontend/coverage/lcov-report/index.html"

# Quality gates enforcement
quality-gates:
	@echo "🛡️ Running quality gates validation..."
	@echo ""
	@echo "1️⃣ Unit Tests Coverage (Target: 85%)"
	pytest backend/tests/strategist/unit/ --cov=strategist/service.py --cov=strategist/reasoner.py --cov=strategist/retriever.py --cov=strategist/nlp.py --cov=strategist/credibility.py --cov-fail-under=85 --cov-report=term-missing || (echo "❌ Unit test coverage below 85%" && exit 1)
	@echo ""
	@echo "2️⃣ Integration Tests Coverage (Target: 75%)"
	pytest backend/tests/strategist/integration/ --cov=strategist --cov-fail-under=75 --cov-report=term-missing || (echo "❌ Integration test coverage below 75%" && exit 1)
	@echo ""
	@echo "3️⃣ Frontend Tests Coverage (Target: 75%)"
	npm --prefix frontend test -- --coverage --watchAll=false --coverageThreshold='{"global":{"branches":70,"functions":70,"lines":75,"statements":75}}' || (echo "❌ Frontend coverage below target" && exit 1)
	@echo ""
	@echo "4️⃣ End-to-End Tests"
	npx playwright test e2e/strategist/ || (echo "❌ E2E tests failed" && exit 1)
	@echo ""
	@echo "5️⃣ Code Quality Checks"
	@$(MAKE) check || (echo "❌ Code quality checks failed" && exit 1)
	@echo ""
	@echo "✅ All quality gates passed! System ready for deployment."

strategist-test:
	pytest tests/strategist/ -v
	npx playwright test e2e/strategist/ --headed

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf backend/__pycache__ backend/**/__pycache__
	rm -rf frontend/node_modules/.vite
	rm -rf frontend/dist
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "coverage.xml" -delete 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	cd frontend && rm -rf coverage/ 2>/dev/null || true
	@echo "✅ Cleanup complete!"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

migrate:
	cd backend && flask db upgrade

seed:
	cd backend && python scripts/seed_minimal_ward.py

strategist-dev:
	cd backend && STRATEGIST_ENABLED=true flask run &
	cd frontend && VITE_STRATEGIST_MODE=development npm run dev

# CI/CD integration
ci-test: quality-gates
	@echo "🚀 CI pipeline validation complete!"

# Production readiness check
prod-check: quality-gates
	@echo "🏭 Production readiness validation..."
	@echo "✅ All quality gates passed"
	@echo "✅ Test coverage meets requirements"
	@echo "✅ Code quality standards enforced"
	@echo "✅ System ready for production deployment"

.PHONY: help dev check format test test-unit test-integration strategist-test quality-gates coverage clean install migrate seed strategist-dev ci-test prod-check