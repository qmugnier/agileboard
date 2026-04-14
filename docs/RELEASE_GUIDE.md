# Release Guide

This guide explains how to create releases and manage versioning for Agile Board.

## Versioning Scheme

Agile Board uses semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR** - Breaking changes to API or data structure (1.0.0 → 2.0.0)
- **MINOR** - New features, backward compatible (1.0.0 → 1.1.0)
- **PATCH** - Bug fixes and patches (1.0.0 → 1.0.1)

Examples:
- `1.0.0` - Initial release
- `1.0.1` - Bug fix
- `1.1.0` - New feature
- `2.0.0` - Major breaking change

## Release Planning

### Before Starting a Release

1. **Create release branch:**
   ```bash
   git checkout -b release/1.1.0
   ```

2. **Update version numbers:**
   - `backend/pyproject.toml` - `version = "1.1.0"`
   - `frontend/package.json` - `"version": "1.1.0"`
   - `README.md` - Update version references if any

3. **Update documentation:**
   - `CHANGELOG.md` - Summarize all changes
   - `README.md` - Update roadmap if release fulfilled planned features
   - `docs/` - Update any changed features

4. **Test thoroughly:**
   - Run all tests locally: `pytest` and `npm test`
   - Manual testing in Docker Compose
   - Load testing if appropriate
   - Security scanning

### Version File Updates

**backend/pyproject.toml:**
```toml
[project]
name = "agile-board-backend"
version = "1.1.0"
description = "Sprint management backend"
```

**frontend/package.json:**
```json
{
  "name": "agile-board-frontend",
  "version": "1.1.0",
  "private": true
}
```

## Release Process

### Step 1: Prepare Release Branch

```bash
# Create and push release branch
git checkout -b release/1.1.0
git add backend/pyproject.toml frontend/package.json docs/...
git commit -m "Release 1.1.0"
git push origin release/1.1.0
```

### Step 2: Create Pull Request

1. Go to GitHub
2. Open a new pull request from `release/1.1.0` to `main`
3. Title: "Release 1.1.0"
4. Description:
   ```markdown
   ## Release 1.1.0
   
   ### Features
   - Feature 1
   - Feature 2
   
   ### Bug Fixes
   - Bug fix 1
   - Bug fix 2
   
   ### Documentation
   - Updated user guide
   - Added troubleshooting section
   
   ### Internal
   - Updated dependencies
   - Improved performance
   
   See CHANGELOG.md for full details.
   ```

### Step 3: Code Review

- Request review from team leads
- Address feedback and make changes
- Ensure all tests pass in CI/CD

### Step 4: Merge to Main

Once approved:

```bash
# GitHub Actions will:
# 1. Run all tests
# 2. Build Docker images
# 3. Push to Harbor (if Harbor secrets configured)
```

### Step 5: Create GitHub Release

1. Go to **Releases** tab
2. Click **"Draft a new release"**
3. **Tag version:** `v1.1.0`
4. **Target branch:** main
5. **Release title:** `Version 1.1.0`
6. **Description:**
   ```markdown
   # Version 1.1.0 - [Release Name]
   
   **Release Date:** [Date]
   
   ## What's New
   
   ### Features
   - Feature 1 with details
   - Feature 2 with details
   
   ### Bug Fixes
   - Fixed issue #123
   - Fixed issue #124
   
   ### Performance Improvements
   - Optimized database queries
   - Reduced bundle size
   
   ### Documentation
   - Updated user guide
   - Added new troubleshooting section
   
   ## Upgrading
   
   See [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) for upgrade instructions.
   
   ## Known Issues
   
   See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for known issues and workarounds.
   
   ## Contributors
   
   Thanks to [contributor names] for their contributions to this release.
   ```

7. If prerelease, check **"This is a pre-release"**
8. Click **"Publish release"**

### Step 6: Merge Back to Develop

```bash
git checkout develop
git pull origin develop
git merge release/1.1.0
git push origin develop
```

## Hotfix Releases

For critical bugs in production:

### Quick Hotfix

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/1.0.1

# 2. Fix the bug
# 3. Update version: 1.0.0 → 1.0.1
# 4. Test thoroughly
git add .
git commit -m "Fix critical issue - hotfix 1.0.1"
git push origin hotfix/1.0.1
```

### Pull Request and Release

1. Create PR from `hotfix/1.0.1` to `main`
2. Title: "Hotfix 1.0.1 - [Bug description]"
3. Get quick review and merge (can skip full review if critical)
4. Create release tag `v1.0.1`
5. Merge back to `develop`

## Changelog Management

### Format

**CHANGELOG.md:**
```markdown
# Changelog

All notable changes to Agile Board are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2024-01-15

### Added
- New analytics dashboard with burndown charts
- Export sprint reports to PDF
- Team capacity forecasting

### Changed
- Improved sprint planning UI
- Optimized database queries for large datasets
- Updated dependencies to latest versions

### Fixed
- Fixed drag-and-drop in Firefox
- Fixed timezone handling for sprint dates
- Fixed memory leak in analytics component

### Deprecated
- Deprecated old CSV import format (will be removed in 2.0.0)

### Security
- Updated dependencies to patch security vulnerabilities
- Improved CORS configuration

## [1.0.1] - 2024-01-05

### Fixed
- Fixed database migration issue on fresh install
- Fixed 'Archive sprint' button not appearing

## [1.0.0] - 2024-01-01

### Added
- Initial release with core sprint management features
- Kanban board with drag-and-drop
- Sprint management and planning
- Team and story management
- Analytics and velocity tracking
- CSV import support
- Docker and local deployment options
```

### Update on Each Release

1. At release branch creation, update `CHANGELOG.md`:
   ```bash
   # Add new section at top
   ## [1.1.0] - 2024-01-15
   
   ### Added
   - Feature 1
   
   ### Fixed
   - Bug fix 1
   ```

2. Keep changelog organized by:
   - Added (new features)
   - Changed (changes to existing features)
   - Fixed (bug fixes)
   - Deprecated (features to be removed)
   - Removed (features removed)
   - Security (security updates)

## Automated Release Process (GitHub Actions)

Optional: Add automatic release creation to workflow:

```yaml
  create-release:
    name: Create Release
    needs: [test-backend, test-frontend]
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate Release Notes
        id: notes
        run: |
          # Extract version from tag
          VERSION=${GITHUB_REF#refs/tags/v}
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ github.ref }}
          name: Version ${{ steps.notes.outputs.version }}
          draft: false
          prerelease: false
```

## Release Timeline

### Typical Release Schedule

- **Monthly releases:** Feature and bug fix releases
- **As-needed:** Hotfixes for critical issues
- **Quarterly:** Major feature releases

### Example Timeline

**Current:** v1.0.0 released
- **Day 1-20:** Development of v1.1.0 features on develop branch
- **Day 21:** Code freeze, release branch created
- **Day 22:** Final testing and review
- **Day 23:** Release v1.1.0 to production
- **Day 24-30:** Monitoring and hotfix as needed

## Support for Previous Versions

**Supported Versions:**
- Current version (1.1.0): Full support
- Previous version (1.0.0): Bug fixes only
- Older versions: Not supported

**Upgrade Path:**
- Users should upgrade to latest version
- Breaking changes clearly documented
- Migration guides provided for major versions

## Release Announcement

### Communicate Release

1. **GitHub Release** - Published on Releases page
2. **Changelog** - Updated in repository
3. **Documentation** - Updated with new features
4. **Email (if applicable)** - Notify deployed users
5. **Team** - Notify internal team of deployment

### Include in Announcement

- Release date
- New features
- Bug fixes
- Breaking changes (if any)
- Upgrade instructions
- Known issues
- Thanks to contributors

## Monitoring Post-Release

### First 24 Hours

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Watch GitHub issues for reported bugs
- [ ] Check user feedback

### First Week

- [ ] Review all error logs
- [ ] Address any critical issues with hotfix
- [ ] Collect user feedback
- [ ] Document lessons learned

### Monthly Check

- [ ] Review release quality metrics
- [ ] Identify patterns in issues
- [ ] Plan improvements for next release
- [ ] Archive old releases if not supported

## Rollback Procedure

If critical issue in production:

```bash
# Quick rollback to previous version
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0

# Re-deploy previous version
git checkout v1.0.0
docker-compose pull
docker-compose up -d
```

Then create hotfix release for the issue.

## Version Management Tools

### Commands

```bash
# Tag a release
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin v1.1.0

# List all releases
git tag -l

# Update to specific version
git checkout v1.1.0

# Create annotated tag
git tag -a v1.1.0 -m "Release 1.1.0 - [description]"

# Delete tag (if mistake)
git tag -d v1.1.0  # local
git push origin :v1.1.0  # remote
```

## Related Documentation

- [GitHub Setup Guide](GITHUB_SETUP.md) - Repository configuration
- [Administrator Guide](ADMIN_GUIDE.md) - Deployment procedures
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues
- [CHANGELOG.md](../CHANGELOG.md) - Version history

## References

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/)
