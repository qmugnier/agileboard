# Troubleshooting Guide

Common issues and solutions for Agile Board.

## Startup Issues

### Port Already in Use

**Error:** `Address already in use` or `OSError: [Errno 48/98]`

**Solutions:**

Find and stop the process using the port:
```bash
# macOS/Linux
lsof -i :8000        # Backend
lsof -i :3000        # Frontend
kill -9 <PID>

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

Use different ports:
```bash
# Backend
python main.py --port 8001

# Frontend
PORT=3001 npm start
```

Kill containers if using Docker:
```bash
docker-compose down
docker container prune
```

### Database Connection Error

**Error:** `sqlite3.DatabaseError` or PostgreSQL connection failure

**Solutions:**

Verify database file exists and has write permissions:
```bash
ls -la agile.db
chmod 666 agile.db        # SQLite
```

Check DATABASE_URL is correct:
```bash
echo $DATABASE_URL        # Should show database path
```

Reset database:
```bash
rm agile.db               # SQLite
python main.py            # Will recreate on first run

# PostgreSQL
dropdb agile_prod
createdb agile_prod
```

### Python/Node Module Not Found

**Error:** `ModuleNotFoundError` or `npm ERR!`

**Solutions:**

Reinstall dependencies:
```bash
# Backend
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

Check for typos in requirements.txt or package.json versions.

## Runtime Issues

### API Connection Errors

**Error:** `GET http://localhost:8000/api... failed` or connection timeout

**Symptoms:**
- Frontend shows error messages
- API calls take very long
- Dashboard shows no data

**Solutions:**

Verify both services are running:
```bash
# Check processes
ps aux | grep python      # Backend
ps aux | grep node        # Frontend

# Or with Docker
docker-compose ps
```

Test API endpoint directly:
```bash
curl http://localhost:8000/docs
curl http://localhost:8000/api/projects
```

Check REACT_APP_API_URL environment variable:
```bash
# In frontend/.env or console
echo $REACT_APP_API_URL
# Should show: http://localhost:8000/api
```

Verify no firewall blocking ports:
```bash
# macOS/Linux
sudo lsof -i :8000
sudo lsof -i :3000
```

### Blank Dashboard or Missing Data

**Symptoms:**
- Dashboard loads but shows no content
- Sprints/stories list is empty

**Solutions:**

Check that data exists:
```bash
# Backend API
curl http://localhost:8000/api/projects
curl http://localhost:8000/api/sprints
curl http://localhost:8000/api/user-stories
```

Import sample data if needed:
```bash
# Place CSV in data/ directory
# Use Configuration > Import/Export to load
```

Check browser console for errors:
- Open Developer Tools (F12 or Cmd+Option+I)
- Look for red error messages
- Note error details for debugging

Clear browser cache:
```bash
# Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (macOS)

# Or clear manually
- Chrome: Settings > Privacy > Clear browsing data
- Firefox: History > Clear Recent History
```

### Slow Performance

**Symptoms:**
- Page takes long time to load
- Drag and drop is laggy
- API calls are slow

**Solutions:**

Check API response time:
```bash
curl -w "Total: %{time_total}s\n" http://localhost:8000/api/user-stories
```

Monitor system resources:
```bash
top           # macOS/Linux
taskmgr       # Windows
```

Database performance:
```bash
# SQLite - check database size
du -h agile.db

# Run maintenance
sqlite3 agile.db "VACUUM;"
sqlite3 agile.db "ANALYZE;"
```

Reduce data scope:
- Archive old completed sprints
- Delete test data
- Filter to active projects only

### Memory Leaks or High Memory Usage

**Symptoms:**
- Service gets slower over time
- Memory usage continuously increases
- Eventually crashes or freezes

**Solutions:**

Restart services regularly:
```bash
docker-compose restart backend
docker-compose restart frontend
```

Check for memory issues in logs:
```bash
docker-compose logs backend | grep -i memory
docker-compose logs backend | grep -i error
```

Reduce number of worker processes:
```bash
# In gunicorn or uvicorn config
workers: 2  # Instead of 4 or more
```

Increase available memory:
```bash
# Docker
docker-compose.yml - add mem_limit
services:
  backend:
    mem_limit: 512m
```

## Data Issues

### Stories Not Saving

**Error:** Story disappears after creating or updating

**Solutions:**

Check API is receiving requests:
```bash
curl -X POST http://localhost:8000/api/user-stories \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test"}'
```

Verify database writes:
```bash
# SQLite
sqlite3 agile.db "SELECT COUNT(*) FROM user_stories;"
```

Check backend logs for errors:
```bash
docker-compose logs backend | tail -50
```

### CSV Import Not Working

**Error:** CSV upload fails or creates no stories

**Solutions:**

Verify CSV format:
- Required columns: ID, Title, Description, Epic, Effort, Business Value
- Use comma delimiter
- Check encoding is UTF-8 (not UTF-16 or Latin-1)

Test with sample file first:
```bash
# Use provided data/us.csv
```

Check file permissions:
```bash
ls -la data/us.csv
chmod 644 data/us.csv
```

View import errors in backend logs:
```bash
docker-compose logs backend | grep -i import
```

### Stories Won't Move Between Sprints

**Symptoms:**
- Drag and drop doesn't work
- Dropdown selection doesn't change sprint

**Solutions:**

Check if sprint is closed:
- Closed sprints are read-only
- Create or activate a different sprint

Verify story status is compatible:
- Some workflow transitions may not be allowed
- Check Configuration > Workflow settings

Check for JavaScript errors:
- Open browser console (F12)
- Look for red error messages

### Data Corruption or Inconsistency

**Symptoms:**
- Stories show invalid data
- Dependencies are broken
- Database has orphaned records

**Solutions:**

Backup and reset:
```bash
cp agile.db agile.db.corrupt
rm agile.db
python main.py      # Will recreate from schema
```

For PostgreSQL:
```sql
-- Repair foreign keys
ALTER TABLE user_stories 
ADD CONSTRAINT fk_project 
FOREIGN KEY (project_id) 
REFERENCES projects(id);
```

Export data before reset:
```bash
# Use Configuration > Export
# Then re-import after reset
```

## Docker-Specific Issues

### Container Won't Start

**Error:** `docker-compose up` fails or containers exit immediately

**Solutions:**

Check logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

Verify Docker daemon is running:
```bash
docker ps
```

Rebuild images:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

Check system resources:
```bash
docker system df
docker system prune  # Clean up unused images/containers
```

### Port Binding Error

**Error:** `Bind for 0.0.0.0:8000 failed`

**Solution:**
```bash
docker-compose down
docker container ls -a      # Find conflicting containers
docker container rm <name>
docker-compose up
```

### Network Issues

**Error:** Backend and frontend can't communicate

**Solutions:**

Check they're on same network:
```bash
docker network ls
docker network inspect agile_default
```

Verify environment variables:
```bash
docker inspect agile-frontend | grep REACT_APP_API_URL
```

Test connectivity:
```bash
docker-compose exec frontend curl http://backend:8000/api/projects
```

## Browser-Specific Issues

### Page Won't Load

**Symptoms:**
- Blank page or 404 error
- Stuck on loading screen

**Solutions:**

Hard refresh browser:
```
Windows/Linux: Ctrl+Shift+R
macOS: Cmd+Shift+R
```

Clear local storage:
- Developer Tools > Application > Local Storage
- Select domain and delete all

Check console for errors:
- Open Developer Tools (F12)
- Go to Console tab
- Note any error messages

### Drag and Drop Not Working

**Symptoms:**
- Can't drag stories between columns
- Dropzone highlighting doesn't appear

**Solutions:**

Use different browser:
- Try Chrome, Firefox, Safari, Edge
- Some older browsers not fully supported

Check browser extensions:
- Disable extensions (especially ones affecting drag/drop)
- Try in private/incognito mode

Clear browser cache:
```
Chrome: Ctrl+Shift+Delete
Firefox: Ctrl+Shift+Delete
Safari: Cmd+Option+E
```

### Charts Not Displaying

**Symptoms:**
- Analytics page blank
- Velocity chart shows no data

**Solutions:**

Make sure sprint has data:
- Need at least one closed sprint with completed stories
- Active sprints without closed history show empty chart

Create test data:
- Use CSV import to load sample data
- Close a sprint with completed stories

Check browser JavaScript:
- Developer Tools > Console
- Look for Recharts or chart library errors

## Getting Help

If issues persist:

1. Check [QUICKSTART.md](QUICKSTART.md) for basic setup
2. Review [ADMIN_GUIDE.md](ADMIN_GUIDE.md) for deployment
3. Search existing GitHub issues
4. Create new issue with:
   - Error message and logs
   - Steps to reproduce
   - System details (OS, Docker version, etc.)
   - Screenshots if helpful

## Performance Reference

Expected performance metrics:

- Page load time: < 2 seconds
- API response time: < 200ms
- Drag and drop: < 100ms latency
- Memory usage: 200-500MB total
- Database size: < 100MB for typical usage

If your system is significantly slower, review:
- System resources (CPU, memory, disk)
- Network connectivity
- Database performance
- Browser and extension configuration
