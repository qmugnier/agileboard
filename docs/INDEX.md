# Documentation Index

Complete guide to Agile Board documentation.

## Getting Started

**New to Agile Board?** Start here:

1. **[README](../README.md)** - Project overview, features, and tech stack
2. **[Quick Start Guide](QUICKSTART.md)** - Installation and first steps (5-10 minutes)
3. **[User Guide](USER_GUIDE.md)** - Learn core features and workflows

## Using Agile Board

**How to use the application:**

- [User Guide](USER_GUIDE.md) - Complete guide to using Agile Board features
  - Kanban Board operations
  - Backlog management and sprint planning
  - Analytics and metrics
  - Configuration and customization
  - Typical workflows (sprint planning, execution, closure)
  - Tips and best practices

## Administration & Deployment

**Set up and maintain your deployment:**

- [Administrator Guide](ADMIN_GUIDE.md) - Deployment and operations
  - Docker Compose, Docker, and local deployment options
  - Environment configuration
  - Database setup (SQLite, PostgreSQL)
  - Reverse proxy configuration (Nginx, Apache)
  - Monitoring and performance tuning
  - Backup and recovery procedures

- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Production readiness checklist
  - Pre-deployment verification
  - Local and Docker deployment checks
  - Environment, database, and security configuration
  - Monitoring, logging, and backup verification
  - Final sign-off and post-deployment validation

- [OIDC Authentication Setup](OIDC_SETUP.md) - OpenID Connect configuration
  - OIDC overview and benefits
  - Identity provider registration
  - Environment configuration
  - OIDC provider examples (Okta, Azure AD, Keycloak)
  - Login flow and user provisioning
  - Security best practices
  - Troubleshooting OIDC issues

## Development & CI/CD Setup

**For developers and CI/CD automation:**

- [GitHub Setup Guide](GITHUB_SETUP.md) - Configure repository on GitHub
  - Repository setup and initial push
  - GitHub Actions configuration
  - Setting secrets for Harbor registry
  - Branch protection rules
  - Release management
  - Automating releases

- [Release Guide](RELEASE_GUIDE.md) - Create and manage releases
  - Semantic versioning scheme
  - Release planning and preparation
  - Release process (branching, PR, tagging)
  - Changelog management
  - Hotfix procedures
  - Post-release monitoring

- [GitHub Actions Workflow](../.github/workflows/README.md) - CI/CD pipeline details
  - Test stage (all branches and PRs)
  - Build stage (main and develop)
  - Push stage (main only)
  - Monitoring workflow status
  - Troubleshooting workflow failures
  - Codecov integration

## Data Management

**Working with data:**

- [CSV Import Guide](CSV_IMPORT_GUIDE.md) - Import stories from CSV files
  - Supported CSV formats
  - Data validation and requirements
  - Import procedures
  - Examples and templates

- [CSV Test Data](CSV_IMPORT_TEST_DATA.md) - Sample data for testing and demonstration

## Analytics

**Understanding metrics and reporting:**

- [Analytics Guide](ANALYTICS.md) - API endpoints and data filtering
  - Velocity metrics and trends
  - Sprint statistics
  - Timeframe filtering logic
  - API reference for analytics endpoints

## Troubleshooting

**When things don't work:**

- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
  - Startup issues (ports, database, dependencies)
  - Runtime issues (API connections, data, performance)
  - Docker-specific issues
  - Browser-specific issues
  - Performance reference metrics
  - Getting help resources

## Documentation Structure

```
docs/
├── INDEX.md                      # Documentation index (this file)
├── README.md                     # Documentation home
├── QUICKSTART.md                 # Getting started (5-10 min)
├── USER_GUIDE.md                 # How to use the app
├── ADMIN_GUIDE.md                # Deployment and operations
├── DEPLOYMENT_CHECKLIST.md       # Production readiness checklist
├── OIDC_SETUP.md                 # OpenID Connect authentication
├── GITHUB_SETUP.md               # GitHub repository and CI/CD setup
├── RELEASE_GUIDE.md              # Release and versioning procedures
├── CSV_IMPORT_GUIDE.md           # Importing data
├── CSV_IMPORT_TEST_DATA.md       # Sample test data
├── ANALYTICS.md                  # Analytics and metrics
└── TROUBLESHOOTING.md            # Common issues

.github/
└── workflows/
    ├── test-build-deploy.yml     # GitHub Actions workflow
    └── README.md                 # Workflow configuration guide
```

## Release Notes

- **v1.0.0** - Current release with core sprint management features
  - Kanban board with drag-and-drop
  - Sprint management and planning
  - Team and story management
  - Analytics and velocity tracking
  - CSV import support
  - Docker and local deployment options
  - Project-based organization
  - Customizable workflows

## Roadmap

Features planned for future releases:

- Kubernetes/Helm deployment support
- Advanced reporting and dashboards
- Team burndown charts
- Integration with external tools
- Role-based access control (RBAC)
- Multi-tenancy support
- User authentication (this will supersede legacy auth docs)

## Contributing

Want to improve the documentation? 

1. Keep documentation clear and concise
2. Avoid overly technical jargon where possible
3. Include examples where helpful
4. Stay current with the actual codebase
5. Update this index when adding new docs

## Quick Links

- [Report an Issue](https://github.com/yourusername/agile/issues)
- [Main README](../README.md)
- [API Documentation](http://localhost:8000/docs) (when running locally)
- [Source Code](../)
