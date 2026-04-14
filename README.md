# Agile Board

A full-stack sprint management application designed for teams practicing agile methodologies. This project provides a modern web interface for managing user stories, sprints, and team velocity with real-time analytics.

## Overview

Agile Board is a self-hosted sprint management system built with FastAPI and React. It allows teams to plan sprints, track story progress through customizable workflows, and visualize team velocity over time. The application includes features for team management, dependency tracking, and data import from CSV.

![Demo](.github/images/demo.gif)

## Key Features

- **Kanban Board** - Drag-and-drop interface for managing story status across sprint workflows
- **Sprint Management** - Create, plan, and close sprints with configurable durations
- **Velocity Tracking** - Monitor team velocity trends and forecast sprint capacity
- **Analytics Dashboard** - View sprint progress, effort distribution, and completion metrics
- **Team Management** - Manage team members and assign stories within your organization
- **Backlog Management** - Organize and prioritize stories before assignment to sprints
- **Workflow Customization** - Define custom status columns and transition rules
- **Dependency Tracking** - Manage story dependencies and blocking relationships
- **CSV Import** - Bulk load stories from CSV files
- **OIDC Authentication** - Integrate with corporate identity providers (Okta, Azure AD, Keycloak, etc.)
- **Project-based Organization** - Manage multiple independent projects within a single deployment

## Technology Stack

**Backend:**
- FastAPI 0.104+
- SQLAlchemy with SQLite
- Pydantic for data validation
- Pandas for CSV processing

**Frontend:**
- React 18
- Tailwind CSS for styling
- Recharts for data visualization
- Axios for API communication

## Getting Started

### Docker Compose (Recommended)

The fastest way to run Agile Board locally:

```bash
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Docker

Run backend and frontend separately:

```bash
# Build and run backend
docker build -t agile-backend ./backend
docker run -p 8000:8000 agile-backend

# In another terminal, build and run frontend
docker build -t agile-frontend ./frontend
docker run -p 3000:3000 -e REACT_APP_API_URL=http://localhost:8000/api agile-frontend
```

### Local Development

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The API will be available at http://localhost:8000

#### Frontend

```bash
cd frontend
npm install
npm start
```

The app will open at http://localhost:3000

## Project Structure

```
agile/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── database.py             # SQLAlchemy models and database setup
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── import_utils.py         # CSV import logic
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Container image for backend
│   └── routers/                # API endpoint handlers
│
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── context/            # Context providers
│   │   ├── services/           # API client code
│   │   ├── App.js              # Main application component
│   │   └── index.css           # Tailwind CSS
│   ├── package.json            # NPM dependencies
│   ├── tailwind.config.js      # Tailwind configuration
│   ├── Dockerfile              # Container image for frontend
│   └── public/                 # Static files
│
├── data/
│   └── us.csv                  # Sample backlog data
│
├── docker-compose.yml          # Multi-container setup
└── docs/                       # Documentation
```

## Documentation

For detailed information, refer to the documentation:

- [Quick Start Guide](docs/QUICKSTART.md) - Get up and running in minutes
- [User Guide](docs/USER_GUIDE.md) - Learn how to use the application
- [Administrator Guide](docs/ADMIN_GUIDE.md) - Configuration and deployment
- [CSV Import Guide](docs/CSV_IMPORT_GUIDE.md) - Import stories from CSV
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Common Tasks

### Import Stories from CSV

Place your CSV file in the `data/` directory with columns: `ID`, `Title`, `Description`, `Epic`, `Effort`, `Business Value`.

Then import through the Configuration view in the web interface, or see [CSV Import Guide](docs/CSV_IMPORT_GUIDE.md) for details.

### Create a Sprint

1. Navigate to Configuration
2. Go to Sprint Settings
3. Click "Create New Sprint"
4. Configure sprint duration and other settings
5. Add stories from the backlog

### View Sprint Analytics

The Analytics tab displays:
- Sprint velocity across closed sprints
- Current sprint progress
- Team capacity and utilization
- Effort trends over time

## Configuration

### Environment Variables

Backend:
- `DATABASE_URL` - Database connection string (default: sqlite:///./agile.db)

Frontend:
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:8000/api)

### Workflow Customization

Define custom status columns and transition rules in the Configuration interface. This allows you to model your team's specific workflow.

### Team Setup

Add team members through the Configuration interface. Assign team members to projects to make them available for story assignment.

## API Documentation

Once the backend is running, view interactive API documentation at `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc` (ReDoc).

Key endpoints:
- `GET /api/projects` - List projects
- `GET /api/sprints` - List sprints
- `GET /api/user-stories` - List user stories
- `GET /api/stats/velocity` - Velocity metrics
- `GET /api/stats/active-sprint` - Active sprint statistics

## Deployment

Agile Board is designed for self-hosted deployment. See [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) for:
- Production deployment considerations
- Environment configuration
- Database management
- Backup and recovery procedures
- Performance tuning

Kubernetes (Helm) support is planned for a future release.

## Continuous Integration & Deployment

The project uses GitHub Actions for automated testing and container registry deployment.

### Automated Workflows

The `.github/workflows/test-build-deploy.yml` workflow:

1. **Test** - Runs on all branches and PRs
   - Backend: pytest with coverage
   - Frontend: npm tests with coverage
   - Reports coverage metrics to Codecov

2. **Build** - Runs on `main` and `develop` branches
   - Builds Docker images for backend and frontend
   - Tags images with commit SHA and latest

3. **Push** - Runs on `main` branch after build succeeds
   - Pushes images to Harbor container registry
   - Requires Harbor credentials (secrets)

See [.github/workflows/README.md](.github/workflows/README.md) for detailed configuration.

### Setting Up GitHub Actions

For automatic deployment to Harbor registry:

1. Go to **Settings → Secrets and variables → Actions**
2. Create repository secrets:
   - `HARBOR_USER` - Your Harbor username
   - `HARBOR_PASSWORD` - Your Harbor API token or password
3. Save the secrets

Once secrets are configured, pushing to `main` will automatically:
- Run tests
- Build Docker images
- Push to Harbor registry

### Testing Locally

Before pushing, run tests locally:

```bash
# Backend tests
cd backend
pytest --cov

# Frontend tests
cd frontend
npm test -- --coverage
```

## Development

To contribute to Agile Board:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for common problems
- Review existing GitHub issues
- Create a new issue with detailed information

## Roadmap

Planned features for future releases:
- Kubernetes/Helm deployment
- Advanced reporting and dashboards
- Team burndown charts
- Integration with external tools
- Role-based access control (RBAC)
- Multi-tenancy support
