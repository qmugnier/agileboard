# Agile Board - Modern Sprint Management

A beautiful, modern single-page agile board application featuring Kanban board, velocity tracking, and real-time sprint management.

## Features

✨ **Modern UI with Tailwind CSS**
- Beautiful gradient design
- Responsive Kanban board
- Real-time status updates

📊 **Sprint Analytics**
- Velocity tracking and trends
- Sprint progress visualization
- Effort distribution charts
- Story status breakdown

👥 **Team Management**
- User story assignment
- Team member tracking
- Dependency management

🎯 **Agile Workflows**
- Backlog management
- Sprint planning
- Status transitions
- Daily progress updates

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database
- **SQLite** - Local database
- **Pandas** - CSV import

### Frontend
- **React 18** - UI library
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Axios** - HTTP client

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional):
```
REACT_APP_API_URL=http://localhost:8000/api
```

4. Start development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

## Project Structure

```
agile/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # SQLAlchemy models & setup
│   ├── schemas.py           # Pydantic schemas
│   ├── import_utils.py      # CSV import utilities
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # Context providers
│   │   ├── services/       # API client
│   │   ├── App.js          # Main app
│   │   ├── index.js        # Entry point
│   │   └── index.css       # Tailwind CSS
│   ├── package.json        # NPM dependencies
│   ├── tailwind.config.js  # Tailwind config
│   └── postcss.config.js   # PostCSS config
│
└── data/
    └── us.csv              # Backlog data
```

## API Endpoints

### Sprints
- `GET /api/sprints` - Get all sprints
- `POST /api/sprints` - Create sprint
- `PUT /api/sprints/{id}` - Update sprint
- `DELETE /api/sprints/{id}` - Delete sprint

### User Stories
- `GET /api/user-stories` - Get stories
- `PUT /api/user-stories/{id}` - Update story
- `POST /api/user-stories/{id}/assign` - Assign story
- `POST /api/user-stories/{id}/unassign` - Unassign story

### Team Members
- `GET /api/team-members` - Get team
- `POST /api/team-members` - Add member

### Statistics
- `GET /api/stats/velocity` - Velocity metrics
- `GET /api/stats/active-sprint` - Active sprint stats

## Usage

### Kanban Board
- Drag cards between columns to change status
- Click a card to expand details
- Assign team members from expanded view
- Use the sprint selector to switch between sprints

### Dashboard
- View velocity trends across sprints
- Monitor sprint progress
- Track effort distribution
- See story status breakdown

### Daily Updates
- Update story progress daily
- Track blockers and dependencies
- Monitor team capacity

## Customization

### Tailwind Theme
Edit `frontend/tailwind.config.js` to customize colors:

```javascript
colors: {
  primary: "#your-color",
  secondary: "#your-color",
  // ...
}
```

### API Base URL
Set environment variable in or `.env`:
```
REACT_APP_API_URL=http://your-api-url/api
```

## Database

The SQLite database is created automatically on first run. To reset:

```bash
# Remove the database file
rm agile.db

# Restart the backend to recreate
python main.py
```

## Performance Tips

- Import large CSVs will run on first startup
- Database is cached at `./agile.db`
- Frontend uses React Context for state management
- API responses are paginated (when applicable)

## Troubleshooting

**CORS Errors?**
- Ensure backend is running on port 8000
- Check API URL in frontend `.env`

**Database Issues?**
- Delete `agile.db` and restart backend
- Check that `data/us.csv` exists for initial import

**Port Already in Use?**
- Backend: Change port in `main.py: uvicorn.run(..., port=8001)`
- Frontend: Use `PORT=3001 npm start`

## License

MIT License

## Support

For issues or questions, check the documentation or create an issue in the repository.
