# Quick Start: Admin Dashboard

## 1. Start Backend (if not running)

```bash
cd backend
npm install
npm start
```

Backend will run on: `http://localhost:3001`

## 2. Start Admin Dashboard

```bash
cd "admin dashboard"
npm install
npm run dev
```

Dashboard will run on: `http://localhost:5173`

## 3. First Time Login

1. Open browser: `http://localhost:5173`
2. Click "Sign Up"
3. Enter:
   - Email: `admin@example.com`
   - Password: `password123` (min 8 chars)
   - Display Name: `Admin User`
4. Click "Create Account"

## 4. Enable Admin Access

**Option A: Via Backend (First Admin)**
- Stop backend
- Edit `backend/db.js` - find `createUser()` function
- After user creation, add: `user.isAdmin = true`
- Start backend again

**Option B: Via Dashboard (Already Admin)**
- Login with existing admin account
- Go to Users page
- Find your new account
- Click "Make Admin" button

## 5. Access Dashboard

Login and start using:
- **Dashboard** - See overview stats and charts
- **Users** - Manage user accounts and roles
- **Bookings** - View and manage bookings
- **Analytics** - Analyze trends and insights
- **Settings** - Account and system info

## Useful API Testing

Test endpoints manually:

```bash
# Create test booking
curl -X POST http://localhost:3001/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "Plumbing",
    "city": "Karachi",
    "area": "Defence",
    "amount_pkr": 2000
  }'

# Fetch all stats
curl http://localhost:3001/api/admin/dashboard-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

**Port already in use?**
- Backend: `npm start -- --port 3002`
- Frontend: `npm run dev -- --port 5174`

**CORS errors?**
- Check backend CORS config
- Verify API URL in `.env`

**Can't login?**
- Verify backend is running
- Check user exists on backend
- Check browser console for errors

**Charts not showing?**
- Run: `npm install recharts`
- Restart dev server

## Next Steps

- ✅ Create admin accounts
- ✅ View dashboard metrics
- ✅ Manage users and bookings
- ✅ Analyze business insights
- 🚀 Deploy to production

For full documentation, see `ADMIN_DASHBOARD_README.md`
