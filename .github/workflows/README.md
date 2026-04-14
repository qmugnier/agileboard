# GitHub Actions Workflow

The Agile Board project uses GitHub Actions for continuous integration and deployment.

## Workflow File

**Location:** `.github/workflows/test-build-deploy.yml`

## Workflow Overview

The workflow performs the following stages:

### 1. Test Stage (All Branches)

Runs automatically on push to `main` and `develop` branches, and on all pull requests.

**Backend Tests:**
- Set up Python 3.11 environment
- Install dependencies from `backend/requirements.txt`
- Run pytest with coverage reporting
- Generate HTML coverage reports
- Upload coverage metrics to Codecov
- Run flake8 and pylint linting (non-blocking)

**Frontend Tests:**
- Set up Node 18 environment
- Install dependencies from `frontend/package.json`
- Run npm tests with coverage
- Generate coverage reports
- Upload coverage metrics to Codecov
- Run ESLint linting (non-blocking)

### 2. Build Stage (main/develop branches)

Triggered only on push to `main` or `develop` branches (not on PRs).

**Backend Build:**
- Set up Docker Buildx
- Build backend Docker image with tags:
  - `harbor.exotec.com/exotec_product_infra/agile-board-backend:<commit-sha>`
  - `harbor.exotec.com/exotec_product_infra/agile-board-backend:latest`

**Frontend Build:**
- Set up Docker Buildx
- Build frontend Docker image with tags:
  - `harbor.exotec.com/exotec_product_infra/agile-board-frontend:<commit-sha>`
  - `harbor.exotec.com/exotec_product_infra/agile-board-frontend:latest`

### 3. Push Stage (main branch only)

Triggered only on push to `main` branch, after successful build.

**Backend Push:**
- Authenticate with Harbor registry
- Push backend image to Harbor with SHA and latest tags
- Requires `HARBOR_USER` and `HARBOR_PASSWORD` secrets

**Frontend Push:**
- Authenticate with Harbor registry
- Push frontend image to Harbor with SHA and latest tags
- Requires `HARBOR_USER` and `HARBOR_PASSWORD` secrets

## Trigger Conditions

| Trigger | Backend Build | Frontend Build | Harbor Push |
|---------|---------------|----------------|------------|
| PR to main/develop | Test only | Test only | No |
| Push to main | Yes | Yes | Yes |
| Push to develop | Yes | Yes | No |

## Required Secrets

To enable Harbor registry push, set these GitHub Secrets in your repository settings:

**Repository Settings → Secrets and variables → Actions → New repository secret**

- `HARBOR_USER` - Harbor registry username
- `HARBOR_PASSWORD` - Harbor registry password or API token

**Setup Instructions:**

1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add `HARBOR_USER` with your Harbor username
5. Add `HARBOR_PASSWORD` with your Harbor password/API token
6. Save

## Artifacts

The workflow generates and stores these artifacts:

- **Backend coverage reports** - HTML coverage report (retention: never deleted if available)
- **Frontend coverage reports** - HTML coverage report (retention: never deleted if available)
- **Docker images** - Built layer caches (retention: 1 day)

Access artifacts in GitHub UI: Actions → Latest run → Artifacts

## Environment Variables

The workflow uses these environment variables (editable in workflow file):

```yaml
REGISTRY: harbor.exotec.com
IMAGE_REPO: exotec_product_infra
BACKEND_IMAGE_NAME: agile-board-backend
FRONTEND_IMAGE_NAME: agile-board-frontend
```

To modify the registry or image names, edit `.github/workflows/test-build-deploy.yml`.

## Codecov Integration

Coverage reports are uploaded to Codecov for:
- Historical tracking of coverage metrics
- Pull request coverage reports
- Coverage badges

Set up Codecov in your repository for automatic PR comments and coverage tracking.

## Monitoring

**Check workflow status:**
- Actions tab → test-build-deploy
- Click on a run to see detailed logs
- Check individual job logs for failures

**Common issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Tests fail | Code issue | Fix the failing test in your branch |
| Build fails | Docker build error | Check Dockerfile and build context |
| Push fails | Harbor auth error | Verify HARBOR_USER and HARBOR_PASSWORD secrets |
| Codecov upload fails | Network issue | Usually recovers on next run |

## Disabling Jobs

To temporarily disable a job:

1. Find the job in `.github/workflows/test-build-deploy.yml`
2. Add `# ` before the job name or change `if:` conditions
3. Commit and push
4. The job will not run on next trigger

Example - disable backend push:
```yaml
  push-backend:
    name: Push Backend to Harbor
    if: false  # Add this line to disable
    # ... rest of job
```

## Examples

### Example: Pushing to main branch

```bash
git checkout main
git pull origin main
git commit -am "Update feature"
git push origin main
```

Workflow automatically:
1. Runs all tests (backend and frontend)
2. If tests pass, builds Docker images
3. If build succeeds, pushes to Harbor registry
4. Updates Codecov with coverage metrics

### Example: Creating a pull request

```bash
git checkout -b feature/my-feature
# Make changes
git commit -am "Add my feature"
git push origin feature/my-feature
```

Then create PR on GitHub. Workflow:
1. Runs all tests automatically
2. Does NOT build or push to Harbor
3. Shows test results in PR

## Maintenance

To update the workflow:

1. Edit `.github/workflows/test-build-deploy.yml`
2. Commit and push to any branch
3. Changes take effect on next trigger
4. Changes to `test-build-deploy.yml` in the pushed branch are used immediately

## Related Documentation

- [Administrator Guide - Deployment](../docs/ADMIN_GUIDE.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build and Push Action](https://github.com/docker/build-push-action)
