# OIDC Authentication Setup

Agile Board supports **OpenID Connect (OIDC)** authentication, allowing users to log in using external identity providers like Okta, Azure AD, Keycloak, or other OIDC-compliant service providers.

## Overview

OIDC enables:
- **Single Sign-On (SSO)** - Users log in with their existing identity provider
- **No password management** - Credentials managed by your identity provider
- **User provisioning** - Users automatically created on first login
- **Team management** - Easy team assignment and role management
- **Enterprise integration** - Support for corporate identity systems

## Prerequisites

- OIDC-compatible identity provider (Okta, Azure AD, Keycloak, Google Workspace, etc.)
- OIDC application registration in your identity provider
- Client ID and Client Secret for the OIDC application
- Discovery URL (metadata endpoint) from your OIDC provider
- Access to environment variables in your deployment

## OIDC Configuration

### 1. Register OIDC Application

In your identity provider, create/register a new OIDC application:

**Example: Okta**
1. Go to **Applications → Applications**
2. Click **Create App Integration**
3. Choose **OIDC - OpenID Connect**
4. Choose **Single-Page Application (SPA)**
5. Fill in redirects URI: `http://your-domain/auth/callback`

**Example: Azure AD**
1. Go to **Azure AD → App registrations**
2. Click **New registration**
3. Set Redirect URI to `http://your-domain/auth/callback`
4. Go to **Certificates & secrets** to create a secret

**Example: Keycloak**
1. Go to **Clients**
2. Click **Create**
3. Choose **OIDC** protocol
4. Set Valid Redirect URIs to `http://your-domain/auth/callback`

### 2. Collect OIDC Configuration

From your identity provider, collect:
- **Client ID** - Unique application identifier
- **Client Secret** - Secret key (keep secure!)
- **Discovery URL** - Usually ends with `/.well-known/openid-configuration`
  - Okta: `https://your-domain.okta.com/.well-known/openid-configuration`
  - Azure: `https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration`
  - Keycloak: `https://keycloak.example.com/auth/realms/{realm}/.well-known/openid-configuration`

### 3. Configure Agile Board

Set these environment variables:

```bash
# Enable OIDC
OCDC_ENABLED=true

# OIDC Provider Details
OCDC_CLIENT_ID=your-client-id-from-provider
OCDC_CLIENT_SECRET=your-client-secret-from-provider
OCDC_DISCOVERY_URL=https://your-provider/.well-known/openid-configuration

# Redirect URI (where user returns after login)
OCDC_REDIRECT_URI=http://your-domain:3000/auth/callback
```

### 4. Docker Compose Setup

In `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - OCDC_ENABLED=true
      - OCDC_CLIENT_ID=${OCDC_CLIENT_ID}
      - OCDC_CLIENT_SECRET=${OCDC_CLIENT_SECRET}
      - OCDC_DISCOVERY_URL=${OCDC_DISCOVERY_URL}
      - OCDC_REDIRECT_URI=http://localhost:3000/auth/callback

  frontend:
    environment:
      - REACT_APP_API_URL=http://localhost:8000/api
```

Create `.env.local` file:

```bash
OCDC_CLIENT_ID=your-client-id
OCDC_CLIENT_SECRET=your-client-secret
OCDC_DISCOVERY_URL=https://your-provider/.well-known/openid-configuration
```

Then run:

```bash
docker-compose up
```

### 5. Local Development Setup

If running locally without Docker:

**Backend (.env or environment variables):**
```bash
export OCDC_ENABLED=true
export OCDC_CLIENT_ID=your-client-id
export OCDC_CLIENT_SECRET=your-client-secret
export OCDC_DISCOVERY_URL=https://your-provider/.well-known/openid-configuration
export OCDC_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Frontend (.env.local or environment variables):**
```bash
export REACT_APP_API_URL=http://localhost:8000/api
```

Start services:

```bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend
cd frontend
npm start
```

## OIDC Authentication Flow

### How OIDC Login Works

```
User → Frontend
  ↓
Frontend calls: GET /api/auth/ocdc/login-url
  ↓
Backend returns: OIDC provider login URL
  ↓
User redirected → OIDC Provider login
  ↓
User enters credentials at OIDC provider
  ↓
Provider redirects back → http://localhost:3000/auth/callback?code=...
  ↓
Frontend exchanges code for token
  ↓
Frontend calls: POST /api/auth/ocdc/token with OIDC ID and email
  ↓
Backend creates/updates user and returns JWT
  ↓
Frontend stores JWT and is now authenticated
```

## Using OIDC Login

### On the Login Screen

1. When OIDC is enabled, a **"Sign in with OpenID Connect"** button appears
2. User clicks the button
3. User is redirected to their identity provider
4. User enters credentials
5. User is redirected back to Agile Board and automatically logged in
6. New users are automatically created with:
   - Email from OIDC provider
   - OIDC ID linked in database
   - Team role: "spi" (Service Provider)

### First-Time Users

On first OIDC login, Agile Board:
1. Receives OIDC claims (ID, email)
2. Checks if user exists
3. If new: Creates user with email from OIDC provider
4. Links OIDC ID to user account
5. Assigns team member role

### Team Assignment After Login

1. New users log in via OIDC
2. Users appear in **Configuration → Team Management** with role "spi"
3. Administrators can assign users to projects
4. Users can immediately access assigned projects

### No Password Required

When OIDC is enabled:
- Users don't create passwords in Agile Board
- Users authenticate through their identity provider
- Team management note reminds admins: *"If OIDC is enabled, no password setup required"*

## OIDC Provider Examples

### Okta Configuration

**In Okta:**
1. Note your **Org URL** (e.g., https://dev-12345.okta.com)
2. In app registration, set redirect URI: `http://your-domain/auth/callback`

**Environment variables:**
```bash
OCDC_CLIENT_ID=0oa1234567890abcdef1
OCDC_CLIENT_SECRET=your-client-secret-here
OCDC_DISCOVERY_URL=https://dev-12345.okta.com/.well-known/openid-configuration
OCDC_REDIRECT_URI=http://your-domain:3000/auth/callback
```

### Azure AD Configuration

**In Azure:**
1. Create app registration
2. Note your **Tenant ID** and **Application (client) ID**
3. Create a secret in "Certificates & secrets"
4. Add redirect URI: `http://your-domain/auth/callback`

**Environment variables:**
```bash
OCDC_CLIENT_ID=your-application-id
OCDC_CLIENT_SECRET=your-secret-value
OCDC_DISCOVERY_URL=https://login.microsoftonline.com/your-tenant-id/v2.0/.well-known/openid-configuration
OCDC_REDIRECT_URI=http://your-domain:3000/auth/callback
```

### Keycloak Configuration

**In Keycloak:**
1. Create realm (e.g., "agile-board")
2. Create OIDC client with protocol "openid-connect"
3. Set Valid Redirect URIs: `http://your-domain/auth/callback`
4. Get credentials from "Credentials" tab

**Environment variables:**
```bash
OCDC_CLIENT_ID=your-client-id
OCDC_CLIENT_SECRET=your-client-secret
OCDC_DISCOVERY_URL=https://keycloak.example.com/auth/realms/agile-board/.well-known/openid-configuration
OCDC_REDIRECT_URI=http://your-domain:3000/auth/callback
```

## Security Best Practices

### Credential Management

- **Never commit secrets** to Git
- Use environment variables or secrets management system
- Rotate `OCDC_CLIENT_SECRET` regularly
- Use HTTPS in production (redirect URIs must match exactly)

### HTTPS Requirement

In production, use HTTPS:

```bash
# ❌ Not secure for production
OCDC_REDIRECT_URI=http://your-domain:3000/auth/callback

# ✅ Secure for production
OCDC_REDIRECT_URI=https://your-domain:3000/auth/callback
```

### Reverse Proxy Configuration

If using Nginx or Apache as reverse proxy, ensure:

```nginx
# Nginx example
location /auth/callback {
    proxy_pass http://frontend:3000/auth/callback;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Host $host;
}
```

### Token Security

- JWT tokens stored in frontend localStorage
- OIDC Client Secret stored only in backend environment
- Secrets never logged or exposed in frontend code
- Tokens validated on each API request

## Troubleshooting

### "Sign in with OpenID Connect" Button Not Appearing

**Problem:** OIDC button not visible on login screen

**Solution:** Check backend configuration
```bash
# Verify OCDC_ENABLED is set
echo $OCDC_ENABLED

# Should return 'true'
```

If using Docker:
```bash
docker-compose logs backend | grep OCDC_ENABLED
```

### "Invalid Redirect URI" Error

**Problem:** OIDC provider rejects redirect

**Cause:** `OCDC_REDIRECT_URI` doesn't match provider configuration

**Solution:**
1. Check provider configuration (Okta, Azure, Keycloak)
2. Ensure redirect URI is registered in provider
3. Must match exactly (including scheme, domain, port, path)
4. In production: Use HTTPS and correct domain

### "Client ID/Secret Invalid" Error

**Problem:** Login fails with authentication error

**Solution:**
1. Verify credentials in environment variables
2. Check OIDC provider to confirm Client ID and Secret
3. Ensure Client Secret is not rotated
4. If rotated, update environment variables
5. Restart application after updating secrets

### "Discovery URL Not Accessible"

**Problem:** Backend cannot reach OIDC provider

**Solution:**
1. Verify `OCDC_DISCOVERY_URL` is correct and accessible
2. Check network/firewall allows outbound HTTPS
3. If behind proxy, configure proxy settings
4. Test URL directly: `curl https://your-provider/.well-known/openid-configuration`

### User Created with Wrong Email

**Problem:** User logged in but email incorrect

**Solution:**
1. Verify identity provider is sending correct email claim
2. Check provider configuration
3. Manually update user email in team management if needed

## API Endpoints

### Get OIDC Login URL

```bash
GET /api/auth/ocdc/login-url
```

**Response:**
```json
{
  "login_url": "https://provider.okta.com/oauth2/v1/authorize?client_id=..."
}
```

### OIDC Token Exchange

```bash
POST /api/auth/ocdc/token
Content-Type: application/json

{
  "ocdc_id": "user@provider.com",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Get Auth Configuration

```bash
GET /api/auth/config
```

**Response:**
```json
{
  "ocdc_enabled": true,
  "ocdc_client_id": "0oa1234567890..."
}
```

## Disabling OIDC

To disable OIDC and use traditional login:

```bash
# Disable OIDC
OCDC_ENABLED=false

# Or simply remove the variable
unset OCDC_ENABLED
```

Then:
1. Restart application
2. Traditional login form appears
3. Existing users can log in with passwords

## Migration from Password to OIDC

If migrating existing users to OIDC:

1. **Prepare identity provider:**
   - Add all users to identity provider
   - Ensure email addresses match

2. **Enable OIDC:**
   - Set environment variables
   - Restart application

3. **User migration:**
   - OIDC matches by email address
   - Existing users log in with OIDC
   - OIDC ID is linked on first login
   - User record is updated

4. **Verify:**
   - Test with a few users first
   - Monitor for issues
   - Communicate change to team

## Production Deployment Checklist

- [ ] OIDC provider registered with correct redirect URI
- [ ] HTTPS enabled in production
- [ ] Environment variables set securely
- [ ] `OCDC_CLIENT_SECRET` secured (not in Git)
- [ ] `OCDC_REDIRECT_URI` uses HTTPS and correct domain
- [ ] OIDC discovery URL tested and accessible
- [ ] Backend and frontend both deployed with OIDC config
- [ ] Test login flow before going live
- [ ] Team informed of OIDC login process
- [ ] Backup plan if OIDC provider unavailable

## Frequently Asked Questions

**Q: Can I use both OIDC and password login?**
A: Currently, OIDC enables/disables for all users. Set `OCDC_ENABLED=false` to use password login.

**Q: What if an OIDC user changes email at the provider?**
A: The user record uses OIDC ID, not email. Email changes won't affect login.

**Q: Can I integrate with my corporate directory?**
A: Yes! Most corporate directories support OIDC (Active Directory via Azure AD, LDAP via Keycloak, etc.).

**Q: How do I know which OIDC provider to use?**
A: Check your organization's existing identity system or IT department recommendations.

**Q: Is OIDC more secure than passwords?**
A: Yes, OIDC delegated authentication to specialist identity providers with better security practices, MFA options, and monitoring.

## Support

For OIDC issues:
1. Check provider configuration first
2. Verify all environment variables
3. Review backend logs: `docker-compose logs backend`
4. Test discovery URL accessibility
5. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for general issues

## Related Documentation

- [Admin Guide - Environment Configuration](ADMIN_GUIDE.md#environment-variables)
- [Team Management](USER_GUIDE.md#team-management)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)

## References

- [OpenID Connect Official](https://openid.net/connect/)
- [Okta OIDC Documentation](https://developer.okta.com/docs/guides/implement-oauth-okta-sign-in/)
- [Azure AD OIDC](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc)
- [Keycloak OIDC](https://www.keycloak.org/docs/latest/server_admin/#_oidc)
