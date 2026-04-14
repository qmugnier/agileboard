# Administrator Guide

Deployment, configuration, and maintenance of Agile Board.

## Deployment

### Docker Compose (Recommended)

Suitable for small to medium team deployments:

```bash
docker-compose up -d
```

For production deployments:

```bash
# Create .env file
cat > .env << EOF
DATABASE_URL=sqlite:///./data/agile.db
REACT_APP_API_URL=https://your-domain.com/api
EOF

# Build and run
docker-compose up -d
```

Monitor logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Docker Individual Containers

For more control over deployment:

```bash
# Backend
docker build -t agile-backend ./backend
docker run -d \
  --name agile-backend \
  -p 8000:8000 \
  -e DATABASE_URL=sqlite:///./data/agile.db \
  -v $(pwd)/data:/app/data \
  agile-backend

# Frontend
docker build -t agile-frontend ./frontend
docker run -d \
  --name agile-frontend \
  -p 3000:3000 \
  -e REACT_APP_API_URL=http://localhost:8000/api \
  agile-frontend
```

### Local Deployment

To run Agile Board on a server without containers:

**Backend:**
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run with Gunicorn (production)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app

# Or with Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Serve with Node
npm install -g serve
serve -s build -l 3000
```

## Configuration

### Environment Variables

Backend:
- `DATABASE_URL` - Database connection string (default: sqlite:///./agile.db)
- `SECRET_KEY` - Secret key for sessions (if implementing auth in future)
- `OCDC_ENABLED` - Enable OIDC authentication (default: false)
- `OCDC_CLIENT_ID` - OIDC provider client ID
- `OCDC_CLIENT_SECRET` - OIDC provider client secret
- `OCDC_DISCOVERY_URL` - OIDC provider discovery URL endpoint
- `OCDC_REDIRECT_URI` - OIDC redirect URI after login (default: http://localhost:3000/auth/callback)

Frontend:
- `REACT_APP_API_URL` - Backend API endpoint (default: http://localhost:8000/api)
- `REACT_APP_API_TIMEOUT` - API request timeout in ms (default: 30000)

### Database Setup

#### SQLite (Default)

Suitable for single-server deployments and testing:

```bash
# Initialize database (automatic on first run)
python backend/main.py
```

Location: `./agile.db` or path specified in `DATABASE_URL`

#### PostgreSQL

For production deployments with multiple servers:

```bash
# Create PostgreSQL user and database
createuser agile
createdb -O agile agile_prod

# Update DATABASE_URL
export DATABASE_URL=postgresql://agile:password@localhost/agile_prod
```

Update `DATABASE_URL` in Docker environment or `.env` file.

#### Backup

**SQLite:**
```bash
# Simple file copy
cp agile.db agile.db.backup

# Or use built-in backup
sqlite3 agile.db ".backup agile.db.backup"
```

**PostgreSQL:**
```bash
pg_dump agile_prod > agile_backup.sql
```

### Reverse Proxy Setup

#### Nginx

```nginx
upstream agile_backend {
    server localhost:8000;
}

upstream agile_frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://agile_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://agile_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apache

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    ProxyPreserveHost On

    # Frontend
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # API (overrides frontend proxy)
    ProxyPass /api http://localhost:8000/api
    ProxyPassReverse /api http://localhost:8000/api
</VirtualHost>
```

## Authentication & Security

### OIDC Integration

Agile Board supports OpenID Connect (OIDC) for enterprise authentication with external identity providers.

**Supported providers:**
- Okta
- Azure Active Directory (Azure AD)
- Keycloak
- Google Workspace
- Other OIDC-compliant providers

**To enable OIDC:**

1. Register application with your OIDC provider
2. Collect credentials:
   - Client ID
   - Client Secret
   - Discovery URL
3. Set environment variables:
   ```bash
   OCDC_ENABLED=true
   OCDC_CLIENT_ID=your-client-id
   OCDC_CLIENT_SECRET=your-client-secret
   OCDC_DISCOVERY_URL=https://provider/.well-known/openid-configuration
   OCDC_REDIRECT_URI=https://your-domain/auth/callback
   ```
4. Restart application

See [OIDC_SETUP.md](OIDC_SETUP.md) for detailed configuration instructions for each provider.

**Security notes:**
- Store `OCDC_CLIENT_SECRET` securely (not in Git)
- Use HTTPS in production
- Ensure `OCDC_REDIRECT_URI` matches provider configuration exactly
- Rotate client secrets periodically

## Maintenance

### Log Management

**Docker Compose:**
```bash
# View logs
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real time
docker-compose logs -f

# Export logs
docker-compose logs > logs.txt
```

**Local deployment:**
- Configure logging in each service
- stdout/stderr typically captured by process manager

### Monitoring

Monitor these key metrics:

- **API Response Time** - Target: <200ms
- **Database Size** - Prevent disk fill on SQLite deployments
- **Memory Usage** - Typical: 200-500MB for backend + frontend
- **CPU Usage** - Should be low during idle periods

### Performance Tuning

**Database:**
```sql
-- Create indexes for common queries
CREATE INDEX idx_stories_sprint_id ON user_stories(sprint_id);
CREATE INDEX idx_stories_project_id ON user_stories(project_id);
CREATE INDEX idx_stories_status ON user_stories(status);
```

**Backend:**
```bash
# Increase worker processes based on CPU cores
gunicorn -w 8 -b 0.0.0.0:8000 main:app

# Or with Uvicorn
uvicorn main:app --workers 4
```

**Frontend:**
- Enable browser caching headers
- Use CDN for static assets in production
- Consider gzip compression

### Database Maintenance

**SQLite:**
```bash
# Optimize database
sqlite3 agile.db "VACUUM;"

# Analyze query performance
sqlite3 agile.db "ANALYZE;"
```

**PostgreSQL:**
```sql
-- Regular maintenance
VACUUM ANALYZE;

-- Reindex if performance degrades
REINDEX DATABASE agile_prod;
```

### Backup Strategy

Implement regular automated backups:

**Daily backup script:**
```bash
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# For SQLite
cp agile.db $BACKUP_DIR/agile_$DATE.db

# For PostgreSQL
pg_dump agile_prod > $BACKUP_DIR/agile_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete
```

Add to cron:
```bash
0 2 * * * /path/to/backup-script.sh
```

### Updates and Upgrades

To upgrade Agile Board:

```bash
# Backup database
cp agile.db agile.db.backup

# Pull latest code
git pull

# Rebuild containers if needed
docker-compose build

# Restart services
docker-compose down
docker-compose up -d

# Verify health
docker-compose ps
```

## Troubleshooting

### Service Health Check

```bash
# Check backend
curl http://localhost:8000/docs

# Check frontend
curl http://localhost:3000

# Check API
curl http://localhost:8000/api/projects
```

### Common Issues

**Database locked (SQLite):**
- Restart backend service
- Ensure only one backend instance running

**High memory usage:**
- Reduce number of worker processes
- Check for memory leaks in logs
- Restart services

**API timeouts:**
- Check database performance
- Verify network connectivity
- Increase timeout values if needed

**Frontend not connecting to API:**
- Verify REACT_APP_API_URL is correct
- Check CORS headers if using different domain
- Verify reverse proxy configuration

### Log Analysis

Look for these patterns in logs:

- `ERROR` - Critical issues requiring attention
- `WARNING` - Potential problems to investigate
- `Database locked` - Concurrency issue
- `Connection refused` - Service connectivity problem

## Security Considerations

- Restrict database access to backend service only
- Use HTTPS in production (via reverse proxy)
- Keep dependencies updated regularly
- Run services with minimal required permissions
- Regular database backups stored separately
- Monitor for unusual access patterns

## Support

For deployment issues, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or create a GitHub issue with:
- Deployment method (Docker/local)
- Operating system and version
- Service logs showing the error
- Reproduction steps
