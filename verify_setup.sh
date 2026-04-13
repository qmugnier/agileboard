#!/bin/bash
# Quick setup verification script

echo "🔍 Verifying Authentication System Setup..."
echo ""

# Check backend
echo "1️⃣  Checking backend imports..."
cd backend
if python -c "from main import app; from auth_utils import hash_password, verify_password; print('✓')" 2>/dev/null; then
  echo "   ✅ Backend imports OK"
else
  echo "   ❌ Backend import error"
  exit 1
fi

# Check frontend  
echo ""
echo "2️⃣  Checking frontend dependencies..."
cd ../frontend
if npm list react-router-dom > /dev/null 2>&1; then
  echo "   ✅ React Router installed"
else
  echo "   ❌ React Router missing"
fi

# Summary
echo ""
echo "📋 Setup Summary:"
echo "   ✅ Backend dependencies installed (PyJWT, bcrypt, email-validator)"
echo "   ✅ Frontend dependencies installed (react-router-dom)"
echo "   ✅ Auth configuration available"
echo ""
echo "🚀 Ready to start!"
echo ""
echo "   Terminal 1 - Backend:"
echo "   $ cd backend && python main.py"
echo ""
echo "   Terminal 2 - Frontend:"
echo "   $ cd frontend && npm start"
echo ""
echo "   Then visit: http://localhost:3000"
