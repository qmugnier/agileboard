# Deployment Checklist

Use this checklist to ensure your Agile Board deployment is production-ready.

## Pre-Deployment

### Code Quality
- [ ] All tests passing locally (`pytest`, `npm test`)
- [ ] No linting errors (`flake8`, `pylint`, `eslint`)
- [ ] No security vulnerabilities (`npm audit`, `pip audit`)
- [ ] Code review completed
- [ ] Commit messages are clear and descriptive

### Documentation
- [ ] README.md is up-to-date
- [ ] All guides are complete and tested
- [ ] CONTRIBUTING.md covers development process
- [ ] API documentation is accurate

### Repository Setup
- [ ] Repository pushed to GitHub
- [ ] Main branch protection rules enabled
- [ ] Develop branch protection rules enabled  
- [ ] GitHub Actions workflow configured
- [ ] Repository secrets set (if using Harbor)

## Local Deployment

### Docker Compose
- [ ] Docker and Docker Compose installed
- [ ] `docker-compose up` starts without errors
- [ ] Frontend accessible at http://localhost:3000
- [ ] Backend API accessible at http://localhost:8000
- [ ] API docs accessible at http://localhost:8000/docs
- [ ] Sample data loads via `/data/us.csv`
- [ ] Can create sprint and add stories
- [ ] Can view analytics dashboard

### Manual Setup
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Backend starts: `cd backend && python main.py`
- [ ] Frontend starts: `cd frontend && npm start`
- [ ] Database initializes without errors

## Docker Deployment

### Backend Container
- [ ] Dockerfile builds without errors: `docker build -t agile-backend ./backend`
- [ ] Container runs: `docker run -p 8000:8000 agile-backend`
- [ ] API responds to requests
- [ ] Database persists across restarts

### Frontend Container
- [ ] Dockerfile builds without errors: `docker build -t agile-frontend ./frontend`
- [ ] Container runs: `docker run -p 3000:3000 agile-frontend`
- [ ] UI loads in browser
- [ ] API connection works with backend

### Docker Compose Stack
- [ ] All services start: `docker-compose up`
- [ ] Health checks pass (if configured)
- [ ] Services communicate correctly
- [ ] Data persists between restarts

## Environment Configuration

### Backend
- [ ] Database URL configured (`DATABASE_URL`)
- [ ] Correct environment: development/staging/production
- [ ] All required environment variables set
- [ ] No hardcoded secrets in code
- [ ] Log level appropriate for environment

### Frontend
- [ ] API URL configured (`REACT_APP_API_URL`)
- [ ] Correct environment variables set
- [ ] Build artifacts optimized (minified, gzipped)
- [ ] Source maps disabled or protected in production

## Database Setup

### SQLite (Local/Small Scale)
- [ ] Database file location writable
- [ ] Database backup strategy in place
- [ ] File permissions correct
- [ ] Regular backups automated

### PostgreSQL (Production)
- [ ] PostgreSQL server running and accessible
- [ ] Database created: `agile_board`
- [ ] Database user with correct permissions
- [ ] Connection string correct in `DATABASE_URL`
- [ ] SSL/TLS enabled (if over network)
- [ ] Regular backups configured
- [ ] Replication configured (if HA needed)

## Reverse Proxy Setup

### Nginx
- [ ] Nginx installed and running
- [ ] Configuration files created for frontend and backend
- [ ] SSL certificates installed and valid
- [ ] HTTP redirects to HTTPS
- [ ] CORS headers configured correctly
- [ ] Proxy pass settings correct for both services
- [ ] SSL certificate auto-renewal configured
- [ ] Load testing passes without errors

### Apache  
- [ ] Apache installed and running
- [ ] Virtual hosts configured for frontend and backend
- [ ] mod_proxy enabled
- [ ] mod_ssl enabled
- [ ] SSL certificates installed
- [ ] HTTP redirects to HTTPS
- [ ] CORS headers set in configuration

## Security

### Application Security
- [ ] All inputs validated server-side
- [ ] API authentication configured (if needed)
- [ ] CORS origins restricted to valid domains
- [ ] Security headers set (CSP, X-Frame-Options, etc.)
- [ ] Dependencies updated to latest secure versions
- [ ] No console.log or debug output in production code

### Infrastructure Security
- [ ] Firewall configured (HTTPS: 443, HTTP: 80 for redirects)
- [ ] SSH access configured securely
- [ ] Database not publicly accessible
- [ ] Secrets not in Git repository
- [ ] .env files git-ignored
- [ ] Backups encrypted at rest

### Credentials Management
- [ ] Database passwords changed from defaults
- [ ] Harbor credentials (if used) stored securely
- [ ] GitHub Actions secrets configured
- [ ] No credentials in environment variables file
- [ ] Credential rotation policy in place

## Monitoring & Logging

### Application Monitoring
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring enabled (New Relic, Datadog, etc.)
- [ ] Uptime monitoring configured
- [ ] Alerts configured for critical events
- [ ] Alert escalation policy defined

### Logging
- [ ] Backend logs captured and stored
- [ ] Frontend errors logged to backend
- [ ] Log retention policy set
- [ ] Sensitive data not logged (passwords, tokens)
- [ ] Log aggregation configured (ELK, Splunk, etc.)

### Health Checks
- [ ] Database connectivity check implemented
- [ ] API health endpoint working
- [ ] Health check endpoint accessible at `/health`
- [ ] Frontend displays connection status

## Performance

### Backend
- [ ] Database queries optimized
- [ ] Caching configured for static assets
- [ ] API response times acceptable (<100ms)
- [ ] Pagination implemented for large datasets
- [ ] No N+1 queries

### Frontend
- [ ] Bundle size minimized
- [ ] Code splitting implemented
- [ ] Assets minified and gzipped
- [ ] CSS optimized (unused styles removed)
- [ ] Images optimized and lazy-loaded
- [ ] Page load time < 3 seconds

### Infrastructure
- [ ] Server resources adequate (CPU, RAM, disk)
- [ ] Network bandwidth sufficient
- [ ] Database indexes created
- [ ] Query performance monitored

## Backup & Recovery

### Backup Strategy
- [ ] Database backups automated and tested
- [ ] Backup schedule documented (daily, hourly, etc.)
- [ ] Backup retention policy defined
- [ ] Off-site backups configured
- [ ] Backup encryption enabled

### Disaster Recovery
- [ ] Backup restoration tested and documented
- [ ] Recovery time objective (RTO) defined: __ hours
- [ ] Recovery point objective (RPO) defined: __ minutes
- [ ] Runbook for disaster recovery created
- [ ] Team trained on recovery procedures

## Container Registry (if applicable)

### Harbor Setup
- [ ] Harbor instance running and accessible
- [ ] Projects created (backend, frontend)
- [ ] Credentials configured in GitHub Actions
- [ ] Images successfully pushed
- [ ] Image scanning enabled
- [ ] Image retention policy set

### Image Management
- [ ] Images tagged with version numbers
- [ ] Latest tag points to stable release
- [ ] SHA tags for audit trail
- [ ] Old images cleaned up periodically

## CI/CD Pipeline

### Automated Testing
- [ ] All tests passing in GitHub Actions
- [ ] Test coverage > 70%
- [ ] Code coverage reports generated
- [ ] Linting passes in CI

### Automated Building
- [ ] Docker images build automatically
- [ ] Build artifacts stored securely
- [ ] Build logs preserved for audit

### Automated Deployment (Optional)
- [ ] Deployment triggers only on main branch
- [ ] Blue-green deployment configured (if applicable)
- [ ] Automatic rollback on failure configured
- [ ] Deployment notifications sent to team

## DNS & SSL/TLS

### Domain Setup
- [ ] Domain registered
- [ ] DNS records pointing to load balancer/reverse proxy
- [ ] DNS propagation verified globally

### SSL/TLS Certificates
- [ ] Valid SSL certificate for production domain
- [ ] Certificate expiration monitored
- [ ] Auto-renewal configured (Let's Encrypt)
- [ ] Certificate covers subdomains (*.domain.com or separate)

## Deployment Verification

### Before Going Live
- [ ] Load test completed successfully
- [ ] All features tested in staging environment
- [ ] Performance meets requirements
- [ ] Security scan passed
- [ ] Stakeholder approval obtained

### Go-Live
- [ ] Maintenance window scheduled (if needed)
- [ ] Team on standby for issues
- [ ] Communication plan for users
- [ ] Rollback plan in place

### Post-Deployment  
- [ ] Monitor error rates for 24 hours
- [ ] Verify all integrations working
- [ ] User feedback collected
- [ ] Performance metrics validated
- [ ] Log into production and verify

## Documentation

### Deployment Documentation
- [ ] Deployment procedure documented
- [ ] Environment configuration documented
- [ ] Backup procedures documented
- [ ] Runbooks created for common tasks
- [ ] Troubleshooting guides updated

### Operations Runbooks
- [ ] How to restart services
- [ ] How to check logs
- [ ] How to perform backups
- [ ] How to rollback deployment
- [ ] How to scale services

## Team Readiness

### Support Team
- [ ] Support team trained on application
- [ ] Support team has access to logs
- [ ] Escalation procedures documented
- [ ] On-call rotation established

### Development Team
- [ ] Everyone knows deployment procedure
- [ ] Everyone can access monitoring tools
- [ ] Everyone can view logs
- [ ] Incident response procedure documented

## Final Sign-Off

- [ ] Product owner approval: _________________  Date: ________
- [ ] Development lead approval: _________________  Date: ________
- [ ] Operations approval: _________________  Date: ________
- [ ] Security review passed: _________________  Date: ________

## Post-Deployment

### 24 Hours After Deployment
- [ ] No critical errors in production
- [ ] Performance metrics normal
- [ ] User feedback positive
- [ ] Monitor backup jobs completed

### 1 Week After Deployment
- [ ] All systems stable
- [ ] No unplanned downtime
- [ ] Performance remains good
- [ ] Lessons learned documented

### Monthly
- [ ] Review logs for errors
- [ ] Check security scanning results
- [ ] Test disaster recovery procedure
- [ ] Review performance metrics

## Additional Resources

- [Administrator Guide](ADMIN_GUIDE.md) - Deployment configuration
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues
- [GitHub Setup Guide](GITHUB_SETUP.md) - CI/CD configuration
- [README](../README.md) - Project overview
