# Quick Start Guide

Get Agile Board up and running in minutes.

## Prerequisites

- Docker and Docker Compose (recommended), or
- Python 3.11+ and Node.js 18+

## Option 1: Docker Compose (Fastest)

```bash
docker-compose up
```

Wait for both services to report healthy status, then open http://localhost:3000 in your browser.

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs

To stop: Press Ctrl+C

## Option 2: Local Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend will be available at http://localhost:8000

### Frontend

In a new terminal:

```bash
cd frontend
npm install
npm start
```

Frontend will open at http://localhost:3000

## First Steps in the Application

### 1. Create Your First Project

1. Navigate to Configuration (gear icon)
2. Click "Create New Project"
3. Enter project name and description
4. Save

### 2. Set Up Your Team

1. In Configuration, go to Team Members
2. Click "Add Team Member"
3. Enter name and role
4. Assign to your project
5. Save

### 3. Create a Sprint

1. Go to Configuration > Sprint Settings
2. Click "Create New Sprint"
3. Set sprint duration (typically 1-4 weeks)
4. Configure other settings
5. Create

### 4. Add Stories to Your Backlog

1. Navigate to Backlog
2. Click "Create New Story"
3. Fill in story details:
   - Title
   - Description
   - Effort estimate
   - Business value
4. Save

### 5. Plan Your Sprint

1. Go to Backlog
2. Drag stories from Backlog section to Sprint section
3. Assign team members to stories
4. View in Kanban Board to start work

### 6. Track Progress

1. Use Kanban Board to move stories through workflow
2. View Analytics for sprint metrics
3. Monitor team velocity

## Importing Test Data

### Option A: CSV File

1. Place CSV file in `data/` directory
2. Columns: ID, Title, Description, Epic, Effort, Business Value
3. Go to Configuration > Import/Export
4. Click "Import Stories"
5. Select your CSV file

### Option B: Sample Data

Sample data is provided in `data/us.csv` for testing.

## Stop and Clean Up

### Docker Compose

```bash
docker-compose down
docker system prune  # Optional: remove unused images
```

### Local Development

Stop terminals with Ctrl+C. To reset database:

```bash
# Remove database file
rm backend/agile.db

# Restart backend
cd backend
python main.py
```

## Troubleshooting

**Port already in use:**
- Docker: `docker-compose down` first
- Local: Check what's using port 3000/8000

**Database errors:**
- Delete `agile.db` file and restart

**API connection errors:**
- Ensure backend is running
- Check REACT_APP_API_URL is correct

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more help.

## Next Steps

- Read [USER_GUIDE.md](USER_GUIDE.md) to learn core features
- Check [ADMIN_GUIDE.md](ADMIN_GUIDE.md) for deployment
- Explore API with Swagger at http://localhost:8000/docs

---

## 💡 Pro Tips

1. **Bulk Operations**: Select multiple cards and update status at once
2. **Keyboard Shortcuts**: Press `?` to see available shortcuts
3. **Export Statistics**: Dashboard charts can be exported as images
4. **API Testing**: Use `/docs` for interactive API testing
5. **Mobile Friendly**: Board is responsive, works on tablets

---

## 📚 Learn More

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **SQLAlchemy**: https://docs.sqlalchemy.org/

---

## 🎉 You're All Set!

Your agile board is **10x better looking than Jira** and fully customizable.

Start the app and begin managing your sprints today!

---

**Questions?** Check the [README.md](./README.md) for detailed documentation.
