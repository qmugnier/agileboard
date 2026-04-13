# Quick Start Guide - Authentication System

## 🚀 5-Minute Setup

### Step 1: Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 3: Environment Setup

**Backend** - Create `backend/.env`:
```bash
JWT_SECRET_KEY=dev-secret-key-change-for-production
SIGNUP_ENABLED=true
AUTO_CREATE_TEAM_MEMBER=true
OCDC_ENABLED=false
```

**Frontend** - Create `frontend/.env`:
```bash
REACT_APP_API_URL=http://localhost:8000/api
```

### Step 4: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
# or with auto-reload:
# uvicorn main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Step 5: Test Authentication

1. Open http://localhost:3000
2. You'll be redirected to http://localhost:3000/login
3. Click "Sign up"
4. Enter email: `test@example.com`
5. Enter password: `MySecurePass123!` (meets all rules)
6. Check "Stay connected"
7. Click "Sign Up"
8. You're now logged in and at the dashboard!

## ✅ Verification Checklist

- [ ] Backend starts without errors
- [ ] Frontend displays login page
- [ ] Password rules display on signup
- [ ] Signup succeeds with valid data
- [ ] Signup fails with weak password (shows specific errors)
- [ ] Login works with correct credentials
- [ ] User email appears in header menu
- [ ] Logout button works
- [ ] Token persists in localStorage (check browser dev tools)
- [ ] Refresh page keeps you logged in (if "Stay connected" checked)

## 🔑 API Test Commands

### Get Configuration
```bash
curl http://localhost:8000/api/auth/config
```

### Password Rules
```bash
curl http://localhost:8000/api/auth/password-rules
```

### Signup
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MySecurePass123!",
    "stay_connected": true
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MySecurePass123!",
    "stay_connected": true
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 1,
  "email": "user@example.com",
  "team_member_id": 1,
  "stay_connected": true
}
```

### Use Token to Access Protected Resource
```bash
curl http://localhost:8000/api/sprints \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🎭 Test Accounts

### Valid passwords (meet all requirements):
- `MySecurePass123!`
- `TestPass@2024#`
- `SecureP@ssw0rd`

### Invalid passwords (will be rejected):
- `password` (no uppercase, numbers, special chars)
- `Pass123` (no special character)
- `Pass!` (too short, no numbers)
- `PASSWORD123!` (no lowercase)

## 🐛 Common Issues & Fixes

### Backend won't start
```bash
# Delete old database and restart
rm agile.db
python main.py
```

### "Module not found" errors
```bash
# Make sure you're in the right directory and reinstall
cd backend
pip install --upgrade -r requirements.txt
```

### Frontend won't load
```bash
# Check REACT_APP_API_URL in .env matches backend
# Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
```

### Can't login after signup
- Check browser console (F12) for errors
- Verify backend is running
- Check localStorage has auth_token (Dev Tools > Application > Local Storage)

### CORS errors
- Verify backend running on port 8000
- Check frontend using correct REACT_APP_API_URL

## 📱 User Flow Visualization

```
┌─────────────────┐
│   Unauthenticated   
│  www.localhost:3000 
└────────┬────────┘
         │
    Redirects to /login
         │
    ┌────▼─────────────────┬──────────────────┐
    │  /login              │  /signup         │
    │  (if enabled)        │  (if enabled)    │
    └────┬─────────────────┴──────────┬───────┘
         │                            │
    Enter email/password        Enter email/password
         │       (existing)           │ (new user)
         │                            │
         └────┬──────────────┬────────┘
              │              │
              ▼              ▼
    ┌──────────────────────────────────┐
    │  Backend Validation              │
    │  - Check email exists (login)    │
    │  - Check password strength       │
    │  - Hash password (signup)        │
    │  - Create JWT token             │
    └──────────────┬───────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Frontend stores token           │
    │  localStorage.auth_token         │
    └──────────────┬───────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │  Redirect to /dashboard          │
    │  Use token in API requests       │
    └──────────────────────────────────┘
```

## 🔐 Security Notes

⚠️ **Development vs Production**:

**Development (Current)**:
- JWT_SECRET_KEY can be simple
- CORS allows all origins
- No HTTPS required

**Production (TODO)**:
- Generate strong JWT_SECRET_KEY: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Restrict CORS to specific origins
- Use HTTPS only
- set `stay_connected` max age
- Implement password reset flow
- Add rate limiting on auth endpoints

## 📚 Full Documentation

See `AUTHENTICATION_SETUP.md` for:
- Complete API reference
- Environment variable documentation
- OCDC integration setup
- Production deployment guide
- Troubleshooting guide
