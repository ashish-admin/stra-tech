# LokDarpan Coding Standards

## General Principles

### Code Quality
- **DRY Principle**: Avoid code duplication
- **SOLID Principles**: Follow single responsibility, open/closed, etc.
- **Clean Code**: Self-documenting code with meaningful names
- **Consistent Formatting**: Use project linting configurations

### Error Handling
- **Fail Fast**: Detect errors early and explicitly
- **Comprehensive Logging**: Include context for debugging
- **Graceful Degradation**: Handle failures without system crashes
- **User-Friendly Messages**: Clear error messages for end users

## Backend Standards (Flask/Python)

### Code Organization
- **Blueprint Structure**: Organize routes by domain (auth, api, strategist)
- **Service Layer**: Separate business logic from route handlers
- **Model Organization**: Keep database models focused and normalized
- **Configuration**: Environment-based configuration with sensible defaults

### Python Conventions
```python
# Function naming: snake_case
def get_ward_data(ward_id: str) -> Dict[str, Any]:
    """Get comprehensive ward data with type hints."""
    pass

# Class naming: PascalCase
class StrategistService:
    """Service for AI-powered political analysis."""
    pass

# Constants: UPPER_SNAKE_CASE
ANALYSIS_TIMEOUT = 30
DEFAULT_WARD = "All"
```

### Database Standards
- **UTC Timestamps**: Always use `datetime.now(timezone.utc)`
- **Migrations**: Descriptive migration messages
- **Indexing**: Index frequently queried columns (ward_id, created_at)
- **Relationships**: Explicit foreign key constraints

### API Standards
- **REST Conventions**: Use appropriate HTTP methods
- **Consistent Responses**: Standard JSON response format
- **Error Codes**: Meaningful HTTP status codes
- **Validation**: Input validation on all endpoints

## Frontend Standards (React/JavaScript)

### Component Organization
```jsx
// Component naming: PascalCase
const StrategicSummary = ({ ward }) => {
  // Hook usage at top
  const { data, isLoading } = useQuery();
  
  // Early returns for loading/error states
  if (isLoading) return <LoadingSpinner />;
  
  return <div>{/* Component content */}</div>;
};
```

### State Management
- **Local State**: useState for component-specific state
- **Global State**: Context for ward selection, auth
- **Server State**: React Query for API data
- **Prop Drilling**: Avoid deep prop passing

### Error Handling
- **Error Boundaries**: Wrap components in error boundaries
- **Loading States**: Show appropriate loading indicators
- **Empty States**: Handle no-data scenarios gracefully
- **Retry Mechanisms**: Allow users to retry failed operations

## Security Standards

### Authentication
- **Session-based**: Secure session cookies
- **CSRF Protection**: Token-based CSRF protection
- **Input Validation**: Sanitize all user inputs
- **SQL Injection**: Use parameterized queries

### Data Protection
- **Environment Variables**: Never commit secrets
- **HTTPS Only**: All communication over HTTPS in production
- **CORS**: Restrictive CORS policies
- **Rate Limiting**: Prevent abuse with rate limiting

## Testing Standards

### Coverage Requirements
- **Backend**: Minimum 80% test coverage
- **Frontend**: Minimum 70% component test coverage
- **Integration**: All API endpoints tested
- **E2E**: Critical user workflows covered

### Test Organization
```python
# Backend test structure
def test_get_ward_data_success():
    """Test successful ward data retrieval."""
    # Arrange
    ward_id = "jubilee-hills"
    
    # Act
    result = ward_service.get_data(ward_id)
    
    # Assert
    assert result is not None
    assert result["ward_id"] == ward_id
```

## Performance Standards

### Backend Performance
- **API Response**: < 200ms for standard queries
- **Database Queries**: < 100ms for 95th percentile
- **AI Analysis**: < 30s for comprehensive analysis
- **Memory Usage**: Monitor and prevent memory leaks

### Frontend Performance
- **Load Time**: < 2s initial page load
- **Bundle Size**: < 500KB initial bundle
- **Core Web Vitals**: Meet Google's Core Web Vitals targets
- **Mobile Performance**: Optimized for mobile devices

## Documentation Standards

### Code Documentation
- **Function Documentation**: Clear purpose and parameters
- **API Documentation**: OpenAPI/Swagger specifications
- **README Files**: Setup and usage instructions
- **Change Logs**: Document breaking changes

### Comments
```python
# Good: Explains why, not what
def calculate_sentiment_score(text: str) -> float:
    """Calculate sentiment score using weighted emotional analysis.
    
    Uses a combination of lexicon-based and context-aware analysis
    to provide more accurate sentiment scores for political content.
    """
    # Apply political context weighting (why we do this)
    weighted_score = base_score * POLITICAL_WEIGHT_FACTOR
    return weighted_score
```

## Version Control Standards

### Commit Messages
```
feat(strategist): add real-time sentiment analysis
fix(auth): resolve session timeout issue
docs(api): update authentication endpoints
test(ward): add comprehensive ward data tests
```

### Branch Strategy
- **main**: Production-ready code
- **feature/**: Feature development branches
- **hotfix/**: Critical production fixes
- **release/**: Release preparation branches

### Pull Request Requirements
- **Code Review**: At least one reviewer
- **Tests**: All tests must pass
- **Linting**: Code must pass linting checks
- **Documentation**: Update relevant documentation