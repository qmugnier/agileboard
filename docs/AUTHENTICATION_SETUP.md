# Authentication System Setup Guide

## Overview
A complete user authentication system has been implemented with:
- ✅ User registration/signup with complex password validation
- ✅ User login with "Stay Connected" (remember me) option
- ✅ JWT-based token authentication
- ✅ Email-required registration (no email confirmation yet)
- ✅ Automatic Team Member creation for new users (become assignees)
- ✅ OpenID Connect (OCDC) support with "spi" user mapping
- ✅ Route protection and authentication flow

## Backend Changes

### New Files Created
1. **`backend/auth_utils.py`** - Password hashing, validation, and JWT token management
2. **`backend/config.py`** - Centralized configuration for auth settings

### Modified Files
1. **`backend/database.py`** - Added `User` model with email, password hash, OCDC fields
2. **`backend/schemas.py`** - Added auth-related Pydantic schemas
3. **`backend/main.py`** - Added authentication endpoints and JWT dependency
4. **`backend/requirements.txt`** - Added PyJWT, bcrypt, pydantic-extra-types, requests

### Database Changes
New `users` table with fields:
- `id` (PK)
- `email` (unique, required)
- `password_hash` (bcrypt)
- `is_active` (default: 1)
- `stay_connected` (for remember-me functionality)
- `team_member_id` (FK to TeamMember - automatic on signup)
- `ocdc_id` (for OpenID Connect integration)
- `created_at`, `updated_at`

### New API Endpoints

#### Public Endpoints (No Auth Required)
- `GET /api/auth/config` - Get auth config (signup enabled, OCDC, password rules)
- `GET /api/auth/password-rules` - Get password validation rules for UI
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login (returns JWT token)

#### Protected Endpoints (Auth Required)
- `GET /api/auth/me` - Get current logged-in user info
- `POST /api/auth/logout` - Logout (for token invalidation tracking)

#### OCDC Endpoints
- `GET /api/auth/ocdc/login-url` - Get OCDC provider login URL
- `POST /api/auth/ocdc/callback` - Handle OCDC callback (placeholder)
- `POST /api/auth/ocdc/token` - Exchange OCDC ID for app token

### Password Validation Rules
Default rules (configurable via environment variables):
- Minimum length: 8 characters
- Require uppercase letters (A-Z)
- Require lowercase letters (a-z)
- Require numbers (0-9)
- Require special characters (!@#$%^&*)

### Configuration Environment Variables
```bash
# Auth Settings
SIGNUP_ENABLED=true
STAY_CONNECTED_ENABLED=true
AUTO_CREATE_TEAM_MEMBER=true

# OCDC (OpenID Connect)
OCDC_ENABLED=false
OCDC_CLIENT_ID=your-client-id
OCDC_CLIENT_SECRET=your-secret
OCDC_DISCOVERY_URL=https://auth-provider/.well-known/openid-configuration
OCDC_REDIRECT_URI=http://localhost:3000/auth/callback

# Password Rules
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true

# JWT
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRY_DAYS=7
```

## Frontend Changes

### New Files Created
1. **`frontend/src/context/AuthContext.js`** - Auth state management with login/signup/logout
2. **`frontend/src/components/Login.js`** - Login page with email/password fields
3. **`frontend/src/components/Signup.js`** - Signup page with password strength indicator
4. **`frontend/src/components/ProtectedRoute.js`** - Route protection wrapper
5. **`frontend/src/components/MainDashboard.js`** - Main board view (extracted from App.js)

### Modified Files
1. **`frontend/src/App.js`** - Updated to use React Router with auth routing
2. **`frontend/src/index.js`** - Added AuthProvider to component tree
3. **`frontend/src/services/api.js`** - Added JWT token interceptor
4. **`frontend/src/components/Header.js`** - Added user menu with logout
5. **`frontend/package.json`** - Added react-router-dom dependency

### Authentication Flow
1. User navigates to `/login` or `/signup`
2. On success, JWT token stored in localStorage
3. Token automatically included in all API requests via interceptor
4. 401 errors redirect to `/login`
5. Authenticated users redirected to `/dashboard`

### New Routes
- `/login` - Login page (public)
- `/signup` - Signup page (public, if enabled)
- `/dashboard` - Main board view (protected)
- `/` - Redirects to `/dashboard`

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Environment Configuration
Create `.env` file in backend directory (or set environment variables):
```bash
JWT_SECRET_KEY=your-super-secret-key
SIGNUP_ENABLED=true
OCDC_ENABLED=false
AUTO_CREATE_TEAM_MEMBER=true
```

#### Initialize Database
```bash
# Database will auto-initialize on first run
# Delete agile.db if you want to reset
python main.py
```

The backend will:
1. Create the `users` table automatically
2. Initialize with sample data from CSV
3. Accept requests on http://localhost:8000

### 2. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Environment Configuration
Create `.env` file in frontend directory:
```bash
REACT_APP_API_URL=http://localhost:8000/api
```

#### Start Development Server
```bash
npm start
```

The frontend will:
1. Start on http://localhost:3000
2. Redirect unauthenticated users to `/login`
3. Load auth config and password rules from backend

## Usage

### First Time Login

1. Navigate to http://localhost:3000
2. Click "Sign up" (if enabled)
3. Enter email and password (must meet complexity rules)
4. Password strength indicator shows real-time validation
5. Check "Stay connected" to enable remember-me
6. User automatically becomes a TeamMember assignee

### Returning User
1. Navigate to http://localhost:3000
2. If "Stay connected" was checked, auto-login occurs
3. Otherwise, click "Sign in" and enter credentials

### Using with OpenID Connect (OCDC)
1. Set `OCDC_ENABLED=true` in backend config
2. Configure OCDC provider credentials
3. Frontend shows "Sign in with OpenID Connect" button
4. Clicking button redirects to OCDC provider
5. After auth, special "spi" user/assignee is created
6. User maps to "spi" team member for assignments

## API Request Format

### Without Auth
```bash
curl http://localhost:8000/api/auth/config
```

### With Auth
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/sprints
```

## Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Security Notes

⚠️ **Important for Production**:
1. Change `JWT_SECRET_KEY` to a strong, random value
2. Use HTTPS for all API calls
3. Set secure cookie flags
4. Implement rate limiting on auth endpoints
5. Add email verification for signup
6. Consider implementing refresh token rotation
7. Use environment-specific configurations

## New User Flow

When a new user signs up:
1. Password is hashed with bcrypt
2. User record created in database
3. Email extracted from address (before @) becomes TeamMember name
4. User becomes potential assignee in projects
5. JWT token issued
6. Token stored in localStorage (if "Stay connected")
7. User redirected to dashboard

## OCDC Integration Details

When OCDC is enabled and user authenticates:
1. Frontend obtains ID token from OCDC provider
2. Frontend calls `/api/auth/ocdc/token` with OCDC ID and email
3. Backend creates/updates user record
4. Special "spi" TeamMember created if not exists
5. User linked to "spi" as assignee
6. JWT token issued for app access

## Error Handling

### Common Errors
- **Invalid credentials**: Check email/password
- **Password doesn't meet requirements**: Check password rules display
- **Email already registered**: Use login instead
- **signup_disabled**: Admin has disabled user registration
- **Token expired**: User needs to login again (if not "Stay connected")
- **401 Unauthorized**: Token missing or invalid - redirect to login

## Troubleshooting

### Backend won't start
- Check Python version (3.8+)
- Verify all dependencies installed: `pip install -r requirements.txt`
- Delete `agile.db` to reset database

### Frontend shows blank login page
- Check browser console for errors
- Verify backend running on correct port
- Check REACT_APP_API_URL in .env

### Auth endpoints return 404
- Verify backend dependencies installed
- Restart backend after installing packages
- Check backend logs for import errors

### Token interceptor not working
- Verify AuthProvider wraps entire app (in index.js)
- Check localStorage for 'auth_token' key
- Verify API_URL matches backend

## Testing Checklist

- [ ] Signup with valid email and strong password
- [ ] Signup fails with weak password (shows specific rules)
- [ ] Signup fails with duplicate email
- [ ] Login with correct credentials succeeds
- [ ] Login with wrong password fails
- [ ] "Stay connected" persists session
- [ ] Without "Stay connected", new login required
- [ ] User menu shows logged-in email
- [ ] Logout clears token and redirects to login
- [ ] Protected routes redirect to login when not authenticated
- [ ] API requests include JWT token
- [ ] 401 responses redirect to login

## Next Steps

1. **Email Verification**: Add email confirmation flow
2. **Password Reset**: Implement forgot password
3. **Rate Limiting**: Add auth endpoint rate limits
4. **Audit Logging**: Log auth events
5. **2FA**: Implement two-factor authentication
6. **Role-Based Access**: Add permission levels beyond auth
7. **OAuth**: Integrate with GitHub, Google, etc.
