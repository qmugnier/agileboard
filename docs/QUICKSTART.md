# 🚀 Quick Start Guide

## Your Modern Agile Board is Ready!

### What You Got

A complete, production-ready agile management system with:
- **FastAPI Backend** with SQLite database
- **React Frontend** with Tailwind CSS
- **Kanban Board** for sprint management
- **Analytics Dashboard** with velocity charts
- **Team Management** with user assignments
- **CSV Import** from your existing backlog

---

## ⚡ Getting Started (5 minutes)

### Option 1: Windows Users (Easiest)
```bash
# Navigate to agile directory
cd c:\apps\systemcontroller\agile

# Double-click start.bat
# OR run in terminal:
start.bat
```

### Option 2: macOS/Linux
```bash
cd /path/to/agile
chmod +x start.sh
./start.sh
```

### Option 3: Manual Setup

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate (Windows)
pip install -r requirements.txt
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## 🎯 Access the Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Direct API**: http://localhost:8000/api

---

## 📊 Features at a Glance

### Kanban Board
- 4-column workflow: Backlog → Ready → In Progress → Done
- Click cards to expand and view details
- Change status with dropdown menu
- Assign team members to stories
- See dependencies and business value

### Dashboard
- **Velocity Trends**: Monitor sprint performance over time
- **Sprint Progress**: Real-time completion tracking
- **Effort Distribution**: Pie chart of effort breakdown
- **Story Status**: Visual breakdown of story counts by status
- **KPI Cards**: Key metrics at a glance

### Team Management
- Add team members with roles
- Assign multiple people to stories
- Track who's working on what

### Data Import
- Your CSV is automatically imported on first run
- Create sprints and assign stories
- Track business value and effort estimates

---

## 📁 Project Structure

```
agile/
├── backend/               # FastAPI server
│   ├── main.py           # API endpoints & startup
│   ├── database.py       # SQLAlchemy ORM models
│   ├── schemas.py        # Pydantic validation
│   ├── import_utils.py   # CSV import logic
│   └── requirements.txt  # Dependencies
│
├── frontend/             # React app
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── context/      # State management
│   │   ├── services/     # API client
│   │   └── index.css     # Tailwind styles
│   ├── package.json
│   └── tailwind.config.js
│
├── data/
│   └── us.csv           # Your backlog
│
└── README.md            # Full documentation
```

---

## 🎨 Customization Examples

### Change Brand Colors
Edit `frontend/tailwind.config.js`:
```javascript
const colors = {
  primary: "#your-color",      // Main blue
  secondary: "#your-color",    // Cyan
  accent: "#your-color",       // Orange/highlight
  success: "#your-color",      // Green (done)
  danger: "#your-color",       // Red (blocked)
}
```

### Add More Statuses
Edit `backend/database.py` UserStory status values
Edit `frontend/components/KanbanBoard.js` for UI columns

### Connect to Remote Database
Change `DATABASE_URL` in `backend/database.py`:
```python
DATABASE_URL = "postgresql://user:pwd@host/db"
```

---

## 🐳 Docker Deployment (Optional)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Access at:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

---

## 🆘 Troubleshooting

**"Port 3000 already in use"**
```bash
# Use different port
PORT=3001 npm start
```

**"Port 8000 already in use"**
```python
# In backend/main.py, change:
uvicorn.run(app, host="0.0.0.0", port=8001)
```

**Database corrupted?**
```bash
# Delete and rebuild
rm backend/agile.db
python backend/main.py  # Will recreate and import CSV
```

**API not connecting?**
Check `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:8000/api
```

---

## 📈 Key API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sprints` | List all sprints |
| POST | `/api/sprints` | Create new sprint |
| GET | `/api/user-stories` | Get stories (filterable) |
| PUT | `/api/user-stories/{id}` | Update story status/sprint |
| POST | `/api/user-stories/{id}/assign` | Assign user to story |
| GET | `/api/team-members` | List team |
| GET | `/api/stats/velocity` | Velocity metrics |
| GET | `/api/stats/active-sprint` | Current sprint stats |

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
