# GitHub Repository Setup

This guide helps you set up the Agile Board repository on GitHub for public release or internal team use with CI/CD automation.

## Prerequisites

- GitHub account with repository creation permissions
- GitHub Actions enabled (enabled by default)
- (Optional) Harbor registry account for Docker image storage

## Initial Repository Setup

### 1. Create the Repository

```bash
# On GitHub.com, click "New repository"
# Repository name: agile-board
# Description: Full-stack sprint management application
# Visibility: Public (for open source) or Private
# Initialize: Leave empty (push existing code)
```

### 2. Push Code to GitHub

```bash
cd /path/to/agile-board
git remote add origin https://github.com/YOUR-USERNAME/agile-board.git
git push -u origin main
git push -u origin develop
```

## GitHub Actions Configuration

### Enable GitHub Pages (Optional)

GitHub Actions generates coverage reports that can be published as GitHub Pages:

1. Go to **Settings → Pages**
2. Under "Source", select **GitHub Actions**
3. Coverage reports will be available at `https://your-username.github.io/agile-board/`

### Configure Repository Secrets

#### For Harbor Registry Integration

1. Navigate to **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Add these secrets:

**Secret Name:** `HARBOR_USER`
- Value: Your Harbor username

**Secret Name:** `HARBOR_PASSWORD`  
- Value: Your Harbor API token (or password)

#### For Codecov Integration

1. Visit [codecov.io](https://codecov.io)
2. Authorize with GitHub
3. Select this repository
4. Copy the Codecov token
5. Add as repository secret: `CODECOV_TOKEN` (optional, usually auto-detected)

**Note:** The workflow will function without Codecov secrets. Coverage uploads will simply be skipped if the service is unavailable.

## Branch Protection Rules

Recommended settings to ensure quality:

1. Go to **Settings → Branches**
2. Click **"Add branch protection rule"**

### For `main` branch:

```
Pattern name: main

✓ Require a pull request before merging
  - Require approvals: 1
  - Require status checks to pass before merging
  - Require branches to be up to date before merging

✓ Require status checks to pass
  - Status checks that must pass:
    - test-backend
    - test-frontend
```

### For `develop` branch:

```
Pattern name: develop

✓ Require a pull request before merging
  - Require approvals: 1 (or 0 for faster iteration)

✓ Require status checks to pass
  - test-backend
  - test-frontend
```

## Workflow Status Monitoring

### View Workflow Runs

1. Go to **Actions** tab
2. Select **test-build-deploy** workflow
3. View runs by branch or commit

### Interpret Workflow Results

**Green ✓** - All tests passed, builds succeeded, images pushed (if applicable)

**Red ✗** - Something failed (see details below)

**Orange ⏳** - Workflow in progress

### Debugging Failed Workflows

1. Click on the failed run
2. Click the failing job (e.g., `test-backend`)
3. Expand the failed step to see error messages
4. Common issues:

| Issue | Solution |
|-------|----------|
| `pytest: command not found` | Backend requirements not installed |
| `npm ERR!` | Frontend dependencies not installed |
| `Docker build failed` | Check Dockerfile syntax |
| `Harbor authentication failed` | Verify HARBOR_USER and HARBOR_PASSWORD secrets |

## Issue Templates

Create GitHub issue templates for consistent bug reports and feature requests:

### `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Bug report
about: Report a bug or issue
title: "[BUG] "
labels: bug
---

## Description
Brief description of the bug.

## Steps to Reproduce
1. Do this
2. Then this
3. Bug occurs here

## Expected Behavior
What should happen?

## Actual Behavior
What actually happens?

## Environment
- OS: [Windows/Mac/Linux]
- Browser: [Chrome/Firefox/Safari]
- Deployment: [Docker Compose/Kubernetes/Local]
```

### `.github/ISSUE_TEMPLATE/feature_request.md`

```markdown
---
name: Feature request
about: Suggest an enhancement
title: "[FEATURE] "
labels: enhancement
---

## Description
What feature would you like to add?

## Use Case
Why do you need this feature?

## Proposed Solution
How should this be implemented?
```

## Pull Request Templates

Create `.github/pull_request_template.md`:

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Breaking change

## Testing
How have you tested these changes?

## Checklist
- [ ] Tests pass locally (`pytest`, `npm test`)
- [ ] Code follows project style
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## Release Management

### Creating a Release

1. Go to **Releases** tab
2. Click **"Draft a new release"**
3. Fill in:
   - **Tag version:** `v1.0.0` (follow semantic versioning)
   - **Release title:** `Version 1.0.0 - Initial Release`
   - **Description:** Highlight key features and changes
4. Click **"Publish release"**

GitHub will create a tag and archive of the code automatically.

### Automated Releases

To automate releases in GitHub Actions, add this job to workflow:

```yaml
  release:
    name: Create Release
    needs: [push-backend, push-frontend]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: |
            README.md
            docs/**
```

## Contributing Setup

1. Enable discussions (optional):
   - **Settings → General → Discussions** - Check the box to enable

2. Set up CONTRIBUTING.md:
   - Already included in this repository at `CONTRIBUTING.md`
   - Links from README and repository root

3. Templates for contributors:
   - Issue templates help structure bug reports
   - PR templates ensure proper descriptions
   - Both are in `.github/` directory

## Recommended Configuration

### Settings → General

**Basic Settings:**
- ✓ Add description of the project
- ✓ Add website URL if available
- ✓ Set topics: `agile`, `sprint-management`, `kanban`, `react`, `fastapi`

**Features:**
- ✓ Wikis: Uncheck (use docs/ directory instead)
- ✓ Issues: Check (enable issue tracking)
- ✓ Discussions: Check (for community discussions)
- ✓ Projects: Check (for project planning)
- ✓ Sponsorships: Uncheck (unless monetizing)

**Pull Requests:**
- Check "Allow squash merging"
- Check "Allow rebase merging"  
- Check "Allow auto-merge"
- ✓ Automatically delete head branches after merge

**Data:** 
- Check "Preserve this repository"

### Settings → Security

**Code security and analysis:**
- Enable "Dependabot alerts"
- Enable "Dependabot security updates"
- Enable "Dependency graph"

These provide automated vulnerability scanning and updates.

## Backup and Recovery

### Backing Up Repository

```bash
# Mirror clone (all branches and history)
git clone --mirror https://github.com/YOUR-USERNAME/agile-board.git agile-board.git
```

### Disaster Recovery

If repository is deleted:

1. Create new empty repository
2. Push from mirror:
   ```bash
   cd agile-board.git
   git push --mirror https://github.com/YOUR-USERNAME/agile-board.git
   ```

## Common Maintenance Tasks

### Update Dependencies

The workflow watches `requirements.txt` and `package.json`. When dependencies are updated:

1. Update files locally
2. Push to `develop` branch
3. GitHub Actions runs tests with new versions
4. If tests pass, merge to `main`
5. Images are built and pushed with new dependencies

### Rotate Harbor Credentials

If Harbor credentials are compromised:

1. Generate new Harbor API token
2. Go to **Settings → Secrets and variables → Actions**
3. Update `HARBOR_PASSWORD` secret with new token
4. Delete or revoke old token in Harbor

### Review Workflow Usage

GitHub Actions usage can be monitored:

1. Go to **Settings → Billing and plans**
2. View "Shared storage" and "Actions" usage
3. Public repositories get unlimited free Actions

## Troubleshooting

### GitHub Actions Still Using Old Secrets

Secrets are read at workflow trigger time. If not updating:
1. Verify secret name matches exactly (case-sensitive)
2. Wait a few minutes (cache refresh)
3. Trigger workflow manually: **Actions → test-build-deploy → Run workflow**

### Workflow Not Triggering

Check:
1. Workflow file is in `.github/workflows/` directory
2. File name ends in `.yml` or `.yaml`
3. Workflow `on:` triggers match your push (e.g., `branches: [main, develop]`)
4. Branch protection isn't preventing the trigger

### Images Not Pushed to Harbor

Check:
1. You're pushing to `main` branch (develop just builds)
2. Build jobs succeeded before push attempted
3. `HARBOR_USER` and `HARBOR_PASSWORD` secrets are set correctly
4. Harbor registry is accessible from GitHub Actions

## Next Steps

1. **Set up branch protection** for `main` and `develop`
2. **Configure secrets** if using Harbor registry
3. **Monitor first workflow run** on push to ensure everything works
4. **Set up GitHub Pages** for coverage reports
5. **Enable Dependabot** for security updates

## Support

For GitHub Actions issues:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

## Related Documentation

- [Main README.md](../README.md) - Project overview
- [.github/workflows/README.md](.github/workflows/README.md) - Workflow configuration details
- [Administrator Guide](ADMIN_GUIDE.md) - Production deployment
- [Contributing Guide](../CONTRIBUTING.md) - Development guidelines
