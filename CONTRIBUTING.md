# Contributing to Agile Board

Thank you for your interest in contributing to Agile Board! This guide explains how to get started.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributions from developers of all experience levels.

## How to Contribute

### Reporting Issues

Before creating a bug report:
- Check existing issues to avoid duplicates
- Verify the issue with the latest version
- Include system information (OS, Docker version, etc.)
- Provide clear reproduction steps
- Attach relevant error logs or screenshots

### Suggesting Features

When proposing a new feature:
- Describe the use case and expected behavior
- Explain why this feature would be valuable
- Consider how it fits with existing functionality
- Reference related issues or discussions

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following the code style
4. Test thoroughly (both backend and frontend)
5. Commit with clear messages: `git commit -m "Add descriptive message"`
6. Push to your fork and create a pull request

### Pull Request Guidelines

- Include what problem the PR solves
- Reference related issues
- Ensure tests pass and code follows the project style
- Update documentation if needed
- Keep commits logically organized

## Development Setup

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

Make changes to:
- API routes in `routers/`
- Database models in `database.py`
- Validation logic in `schemas.py`
- Import logic in `import_utils.py`

### Frontend Development

```bash
cd frontend
npm install
npm start
```

Make changes to:
- Components in `src/components/`
- State management in `src/context/`
- API client in `src/services/`
- Styles in `src/index.css` and component files

## Code Style

### Backend (Python)

Follow PEP 8 conventions:
```python
# Use meaningful variable names
# Keep functions focused and relatively short
# Add docstrings to functions
# Use type hints where helpful
```

### Frontend (JavaScript/React)

Follow common React patterns:
```javascript
// Use descriptive component names
// Keep components focused on single responsibility
// Use hooks for state and effects
// Comment complex logic
// Use meaningful variable names
```

## Testing

Run tests before submitting:

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

## Documentation

Update relevant documentation when making changes:

- User-facing changes: Update [USER_GUIDE.md](docs/USER_GUIDE.md)
- Admin/deployment changes: Update [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)
- API changes: Update endpoint documentation
- New features: Add to [QUICKSTART.md](docs/QUICKSTART.md) or [USER_GUIDE.md](docs/USER_GUIDE.md)
- Issues found: Update [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Commit Messages

Write clear commit messages:
- First line: Brief summary (50 chars or less)
- Blank line
- Detailed explanation if needed
- Reference issues: "Fixes #123" or "Related to #456"

Example:
```
Add sprint velocity forecasting

Implements algorithm to predict future sprint capacity based on
historical velocity data. Includes Fibonacci smoothing and
accounts for team size variations.

Fixes #123
```

## Areas for Contribution

We especially welcome contributions in:

- Bug fixes and stability improvements
- Performance optimizations
- Documentation improvements
- Test coverage
- UI/UX enhancements
- Database query optimization
- Docker/deployment improvements

## Licensing

By contributing, you agree that your contributions will be licensed under the MIT License. See [LICENSE](../LICENSE) for details.

## Questions?

- Check existing issues and documentation
- Create a discussion issue if you have questions
- Ask in pull request comments

Thank you for helping make Agile Board better!
