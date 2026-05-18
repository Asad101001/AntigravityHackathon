# Asaaniyat Admin Dashboard

A comprehensive, web-based admin dashboard for managing the Asaaniyat platform. Built with React, Vite, and integrated with the backend API.

## Features

✅ **Dashboard Overview**
- Key metrics: Total users, bookings, active users, and revenue
- Booking status breakdown (Pie chart)
- Revenue analytics
- Recent bookings list

✅ **Users Management**
- View all platform users with pagination
- User statistics (login count, joined date, last login)
- Admin role toggle functionality

✅ **Bookings Management**
- Complete booking list with pagination
- Filter by booking status (pending, confirmed, completed, cancelled)
- Delete bookings
- View booking details

✅ **Analytics & Insights**
- Bookings over time (30-day trend)
- Bookings by service type
- Revenue by service type
- Top cities by booking activity
- Interactive charts with Recharts

✅ **Secure Access**
- Admin authentication
- JWT token-based sessions
- Role-based access control

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend server running on `http://localhost:3001`

### Installation

1. **Navigate to admin dashboard folder**
   ```bash
   cd "admin dashboard"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API URL**
   Update `.env` file:
   ```
   VITE_API_URL=http://localhost:3001
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The dashboard will be available at: `http://localhost:5173`

## Running in Production

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Preview production build**
   ```bash
   npm run preview
   ```

3. **Deploy**
   Build output is in the `dist/` folder. Deploy to any web server:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Firebase Hosting
   - Any static hosting service

## Usage

### First Time Setup

1. Start the backend server (if not already running)
   ```bash
   cd backend
   npm install
   npm start
   ```

2. Open admin dashboard in browser
   ```
   http://localhost:5173
   ```

3. **Create an account**
   - Click "Sign Up"
   - Enter email, password, and display name
   - Submit

4. **Enable Admin Access**
   - First admin account needs to be enabled manually via backend
   - OR login with an already-enabled admin account and go to Settings to assign admin roles

### Login

- Email: Your registered email
- Password: Your password (minimum 8 characters)

### Dashboard Pages

#### 📊 Dashboard
- View overall platform statistics
- See booking status distribution
- Check revenue metrics
- View recent bookings

#### 👥 Users
- Paginated list of all users
- View user details (email, name, city, login info)
- Toggle admin status for users
- Search and manage user roles

#### 📅 Bookings
- View all bookings with details
- Filter by status
- Delete bookings
- Track booking amounts and dates

#### 📈 Analytics
- Historical booking trends (last 30 days)
- Service type breakdown
- Geographic distribution (by city)
- Revenue analysis by service and location

#### ⚙️ Settings
- View account information
- Platform version and features
- Technology stack info

## Architecture

### Frontend Stack
- **React 19** - UI framework
- **Vite** - Build tool
- **Axios** - API client
- **Recharts** - Data visualization
- **React Router** - Navigation (future)

### Backend Integration
- RESTful API calls to `/api/admin/*` endpoints
- JWT authentication
- CORS-enabled requests
- Token stored in localStorage

### Data Models
- **Users** - Platform users with admin flags
- **Bookings** - Service bookings with status tracking
- **Analytics** - Aggregated data for insights

## API Endpoints

The dashboard communicates with these backend endpoints:

```
GET  /api/admin/dashboard-stats        - Overview statistics
GET  /api/admin/users                  - User list (paginated)
GET  /api/admin/bookings               - Booking list (paginated)
GET  /api/admin/analytics/bookings-by-day   - Daily booking trends
GET  /api/admin/analytics/service-types    - Service breakdown
GET  /api/admin/analytics/top-cities       - Geographic analytics
POST /api/admin/users/:id/toggle-admin     - Update admin status
DELETE /api/admin/bookings/:id             - Delete booking
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3001        # Backend API URL
```

For production, update to your backend URL:
```env
VITE_API_URL=https://api.yourdomain.com
```

## Troubleshooting

### "Failed to load stats" error
- Check if backend is running on `http://localhost:3001`
- Verify API URL in `.env` file
- Check browser console for CORS errors

### Login not working
- Ensure backend is running
- Check if account exists on backend
- Verify email/password are correct

### Charts not showing
- Check if Recharts package is installed (`npm install recharts`)
- Verify data is being fetched from API
- Check browser console for errors

### Admin features disabled
- Ensure your account has admin flags set
- Contact an existing admin to enable your admin status
- Via backend, set `isAdmin: true` on user document

## File Structure

```
admin dashboard/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx        - Overview dashboard
│   │   ├── Users.jsx           - User management
│   │   ├── Bookings.jsx        - Booking management
│   │   ├── Analytics.jsx       - Analytics & insights
│   │   ├── Settings.jsx        - Settings & info
│   │   └── LoginPage.jsx       - Authentication
│   ├── components/
│   │   └── StatCard.jsx        - Stat card component
│   ├── App.jsx                 - Main app component
│   ├── App.css                 - App styling
│   ├── index.css               - Global styles
│   └── main.jsx                - Entry point
├── vite.config.js              - Vite configuration
├── package.json                - Dependencies
├── .env                        - Environment variables
├── eslint.config.js            - Linting config
└── README.md                   - This file
```

## Development Tips

### Adding a New Admin Page

1. Create new file in `src/pages/NewPage.jsx`
2. Import in `App.jsx`
3. Add route case in App.jsx
4. Add nav button in navigation menu

### Styling
- Use CSS modules or create `.css` files alongside components
- Global styles in `index.css`
- CSS variables defined in `:root`

### API Integration
- Use `axios` for HTTP requests
- Include `Authorization: Bearer {token}` header
- Handle errors gracefully
- Update state after successful API calls

## Performance Optimization

- Pagination limits records displayed (20 per page)
- Lazy loading for chart data
- Memoization for expensive calculations
- Code splitting handled by Vite

## Security Considerations

- JWT tokens stored in localStorage
- Tokens included in all admin API requests
- Logout clears token from storage
- Authentication checked on app load
- Role-based access control on backend

## Support & Maintenance

For issues or feature requests:
1. Check backend logs
2. Verify API connectivity
3. Check browser console for errors
4. Review data in admin dashboard

## License

Part of Asaaniyat project for Google Antigravity Hackathon
