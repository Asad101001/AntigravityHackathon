# Admin Dashboard - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Features](#features)
5. [Setup & Installation](#setup--installation)
6. [Project Structure](#project-structure)
7. [Authentication System](#authentication-system)
8. [API Endpoints](#api-endpoints)
9. [Pages & Components](#pages--components)
10. [Theme & Styling](#theme--styling)
11. [Database Schema](#database-schema)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The Admin Dashboard is a comprehensive web-based management interface built for the Asaaniyat platform. It provides administrators with centralized control over:
- User management and monitoring
- Booking tracking and operations
- Real-time analytics and insights
- System configuration and settings

**Type**: Web application (React + Vite)
**Access**: Browser-only (no mobile support)
**Authentication**: JWT-based admin authentication
**Database**: MongoDB

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Admin Dashboard (React)                  │
│                    http://localhost:5173                │
├─────────────────────────────────────────────────────────┤
│  Pages: Login, Dashboard, Users, Bookings, Analytics    │
│  Components: Modal, StatCard, Charts                    │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/REST
                   ↓
┌─────────────────────────────────────────────────────────┐
│            Backend API (Express.js)                      │
│            http://localhost:3001                        │
├─────────────────────────────────────────────────────────┤
│  Routes: /api/admin/*, /api/auth/admin-login            │
│  Middleware: requireAuth, requireAdmin                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│              MongoDB Atlas                              │
│  Collections: users, bookings, providers, admin_users   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Login
    ↓
POST /api/auth/admin-login
    ↓
Check admin_users collection
    ↓
Verify bcrypt password
    ↓
Return JWT token
    ↓
Store in localStorage
    ↓
Access Dashboard
    ↓
All requests include Authorization header
    ↓
Backend verifies JWT + admin status
    ↓
Return data/operation result
```

---

## Technology Stack

### Frontend
| Technology | Purpose | Version |
|-----------|---------|---------|
| React | UI Framework | 19+ |
| Vite | Build Tool | 8.0+ |
| Axios | HTTP Client | Latest |
| Recharts | Data Visualization | Latest |
| CSS3 | Styling | Native |

### Backend
| Technology | Purpose | Version |
|-----------|---------|---------|
| Express.js | Server Framework | 4.x |
| MongoDB | Database | Cloud (Atlas) |
| JWT | Authentication | Native Node.js |
| bcryptjs | Password Hashing | ^2.4.3 |

### Development Tools
- Node.js 16+
- npm or yarn
- Git
- Environment variables (.env)

---

## Features

### 1. Authentication
✅ Admin-only login system  
✅ Separate admin_users collection  
✅ JWT token-based auth  
✅ Demo admin account (auto-created)  
✅ Password hashing with bcryptjs  
✅ Secure session management  

**Demo Credentials**:
- Email: `admin@asaaniyat.com`
- Password: `AdminPassword123`

### 2. Dashboard
✅ Real-time statistics display  
✅ Key metrics (users, bookings, revenue)  
✅ Status breakdown charts  
✅ Recent bookings listing  
✅ Interactive data visualization  

### 3. Users Management
✅ Complete user directory  
✅ User information display  
✅ Pagination (20 per page)  
✅ User filtering capabilities  
✅ Login history tracking  

### 4. Bookings Management
✅ Full booking list with pagination  
✅ Status filtering (pending/confirmed/completed/cancelled)  
✅ Booking detail modal with full information  
✅ Recipient & provider details enrichment  
✅ Status update functionality  
✅ Booking deletion capability  
✅ Invalid date handling  

### 5. Analytics
✅ Bookings over time (30-day trend)  
✅ Service type breakdown  
✅ Top cities by bookings  
✅ Revenue analysis  
✅ Custom charts with Recharts  

### 6. Settings
✅ Admin profile information  
✅ System configuration display  
✅ Account details  
✅ Login statistics  

---

## Setup & Installation

### Prerequisites
```bash
Node.js >= 16.x
npm >= 8.x
MongoDB Atlas account
Optional: Git
```

### Installation Steps

#### 1. Clone/Extract Project
```bash
cd C:\Users\Rizwan Ellahi\Desktop\AntigravityHackathon
```

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create/verify .env file with:
PORT=3001
MONGODB_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]
MONGODB_DB_NAME=asaaniyat
JWT_SECRET=ubit2024
GROQ_API_KEY=your_key
GEMINI_API_KEY=your_key

# Start backend
npm start
```

#### 3. Admin Dashboard Setup
```bash
cd "../admin dashboard"

# Install dependencies
npm install

# Create .env file with:
VITE_API_URL=http://localhost:3001

# Start development server
npm run dev
```

#### 4. Access Dashboard
Open browser and navigate to: **http://localhost:5173**

---

## Project Structure

### Backend Admin Routes
```
backend/
├── routes/
│   ├── adminRoutes.js          # All admin endpoints
│   ├── authRoutes.js           # Auth endpoints (includes admin-login)
│   └── serviceRoutes.js        # Service booking routes
├── middleware/
│   └── requireAuth.js          # JWT verification
├── db.js                       # MongoDB connection & setup
└── server.js                   # Main server file
```

### Frontend Admin Dashboard
```
admin dashboard/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx       # Admin login form
│   │   ├── Dashboard.jsx       # Main dashboard
│   │   ├── Users.jsx           # User management
│   │   ├── Bookings.jsx        # Booking list & modal
│   │   ├── Analytics.jsx       # Charts & insights
│   │   └── Settings.jsx        # Admin settings
│   ├── components/
│   │   ├── StatCard.jsx        # Stat display card
│   │   └── BookingDetailModal.jsx # Booking detail view
│   ├── pages/*.css             # Page stylesheets
│   ├── components/*.css        # Component stylesheets
│   ├── App.jsx                 # Main app component
│   ├── App.css                 # App layout styles
│   ├── index.css               # Global styles
│   └── index.html              # HTML entry point
├── public/                     # Static assets
├── vite.config.js              # Vite configuration
└── package.json                # Dependencies
```

---

## Authentication System

### Overview
Admin authentication uses a separate `admin_users` collection to prevent unauthorized access.

### Key Components

#### 1. Admin Users Collection
```javascript
{
  _id: ObjectId,
  emailLower: String,           // Email in lowercase
  email: String,                // Admin email
  passwordHash: String,         // bcryptjs hashed
  isAdmin: Boolean,             // Always true
  createdAt: Date,              // Account creation
  lastLoginAt: Date,            // Last login time
  loginCount: Number            // Login counter
}
```

#### 2. Login Flow
```
User submits email & password
        ↓
POST /api/auth/admin-login
        ↓
Check admin_users collection by emailLower
        ↓
If not found → Error: "Invalid credentials"
        ↓
Compare password with bcryptjs
        ↓
If invalid → Error: "Invalid credentials"
        ↓
Generate JWT with: { email, _id }
        ↓
Update lastLoginAt timestamp
        ↓
Increment loginCount
        ↓
Return token + user data
        ↓
Frontend stores in localStorage
        ↓
All API calls include Authorization header
```

#### 3. Backend Admin Middleware
```javascript
const requireAdmin = async (req, res, next) => {
  // All admin routes use this middleware
  const adminUserDoc = await db.collection('admin_users')
    .findOne({ emailLower: req.auth.email });
  
  if (!adminUserDoc) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  req.adminUser = adminUserDoc;
  next();
}
```

#### 4. Demo Account Auto-Creation
On backend startup, if `admin_users` collection is empty:
- Auto-creates: `admin@asaaniyat.com` / `AdminPassword123`
- Password is bcryptjs hashed (10 salt rounds)
- Account created with full admin permissions

---

## API Endpoints

### Authentication

#### Login (Admin)
```
POST /api/auth/admin-login
Content-Type: application/json

Request Body:
{
  "email": "admin@asaaniyat.com",
  "password": "AdminPassword123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "admin_user_id",
    "email": "admin@asaaniyat.com"
  }
}
```

### Admin Dashboard Endpoints

#### Dashboard Statistics
```
GET /api/admin/dashboard-stats
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalBookings": 320,
    "totalChats": 450,
    "bookingsByStatus": [
      { "_id": "pending", "count": 50 },
      { "_id": "confirmed", "count": 200 },
      { "_id": "completed", "count": 60 },
      { "_id": "cancelled", "count": 10 }
    ],
    "recentBookings": [...],
    "activeUsers": 45,
    "totalRevenue": 125000
  }
}
```

#### List Users
```
GET /api/admin/users?page=1&limit=20
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "USR_123",
        "email": "user@example.com",
        "displayName": "John Doe",
        "city": "Karachi",
        "createdAt": "2026-05-18T10:00:00Z",
        "loginCount": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### List Bookings (Enriched)
```
GET /api/admin/bookings?page=1&limit=20&status=confirmed
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "bookings": [
      {
        "_id": "BK_123",
        "user_id": "USR_123",
        "user_name": "John Doe",           // Enriched
        "user_email": "user@example.com",  // Enriched
        "user_phone": "03001234567",       // Enriched
        "provider_id": "AC069",
        "provider_name": "Zahid AC Tech",  // Enriched
        "provider_phone": "03209876543",   // Enriched
        "provider_rating": 4.7,            // Enriched
        "service_type": "AC Technician",
        "city": "Karachi",
        "area": "PECHS",
        "quote_pkr": 2500,
        "status": "confirmed",
        "created_at": "2026-05-18T11:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

#### Update Booking Status
```
PUT /api/admin/bookings/{bookingId}/status
Headers: Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "status": "completed"
}

Response:
{
  "success": true,
  "message": "Booking status updated",
  "booking": { ... updated booking ... }
}
```

#### Delete Booking
```
DELETE /api/admin/bookings/{bookingId}
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Booking deleted"
}
```

#### Analytics - Bookings by Day (30 days)
```
GET /api/admin/analytics/bookings-by-day
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "_id": "2026-05-18",
      "count": 12,
      "revenue": 30000
    },
    ...
  ]
}
```

#### Analytics - Service Types
```
GET /api/admin/analytics/service-types
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "_id": "AC Technician",
      "count": 120,
      "revenue": 300000
    },
    ...
  ]
}
```

#### Analytics - Top Cities
```
GET /api/admin/analytics/top-cities
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "_id": "Karachi",
      "count": 200,
      "revenue": 500000
    },
    ...
  ]
}
```

---

## Pages & Components

### LoginPage
**File**: `admin dashboard/src/pages/LoginPage.jsx`

**Purpose**: Admin authentication interface

**Features**:
- Email input field
- Password input field
- Error message display
- Demo credentials display
- Remember login state in localStorage
- JWT token storage for API access

**Styling**: Modern gradient header with mint/green theme

---

### Dashboard Page
**File**: `admin dashboard/src/pages/Dashboard.jsx`

**Purpose**: Central hub showing system overview and key metrics

**Components**:
- StatCard (x4): Total Users, Total Bookings, Total Chats, Revenue
- BarChart: Bookings by status
- LineChart: Recent activity trend
- RecentBookingsTable: Latest 10 bookings

**Data Sources**:
- GET `/api/admin/dashboard-stats`

**Refresh Interval**: Manual (no auto-refresh)

---

### Users Page
**File**: `admin dashboard/src/pages/Users.jsx`

**Purpose**: Monitor and manage all platform users

**Features**:
- User directory listing
- Pagination (20 users per page)
- User columns: ID, Email, Name, City, Status, Joined Date, Logins
- Search/filter capabilities (optional)
- No edit functionality (view-only)

**Data Sources**:
- GET `/api/admin/users?page={page}&limit=20`

---

### Bookings Page
**File**: `admin dashboard/src/pages/Bookings.jsx`

**Purpose**: Comprehensive booking management interface

**Features**:
- Booking list with pagination
- Status filtering (dropdown)
- Sorting by date
- Click-to-view functionality
- Detail modal with full information
- Status update capability
- Delete functionality with confirmation

**Table Columns**:
- Booking ID (clickable)
- User ID (shortened)
- Service Type
- City
- Area
- Amount (PKR)
- Status (color-coded badge)
- Date/Time
- View Button

**Detail Modal**:
- Full booking information
- Recipient details (name, email, phone, address)
- Provider details (name, phone, rating)
- Status dropdown with update button
- Delete button with confirmation
- Additional booking JSON data
- Close/Cancel buttons

**Data Sources**:
- GET `/api/admin/bookings?page={page}&status={filter}`
- PUT `/api/admin/bookings/{id}/status`
- DELETE `/api/admin/bookings/{id}`
- Auto-enriches with user & provider data

---

### Analytics Page
**File**: `admin dashboard/src/pages/Analytics.jsx`

**Purpose**: Advanced business intelligence and reporting

**Charts**:
1. **Bookings Over Time** (LineChart)
   - Last 30 days
   - Shows daily booking count & revenue
   - Interactive hover tooltips

2. **Service Type Breakdown** (PieChart)
   - Distribution of bookings by service
   - Color-coded segments
   - Percentage labels

3. **Top Cities** (BarChart)
   - Cities sorted by booking count
   - Revenue overlay
   - Top 10 displayed

**Data Sources**:
- GET `/api/admin/analytics/bookings-by-day`
- GET `/api/admin/analytics/service-types`
- GET `/api/admin/analytics/top-cities`

---

### Settings Page
**File**: `admin dashboard/src/pages/Settings.jsx`

**Purpose**: System configuration and admin account information

**Sections**:
1. **Admin Account**
   - Admin email
   - Account creation date
   - Last login time
   - Total logins

2. **System Information**
   - API endpoint URL
   - Database connection status
   - MongoDB version
   - Node.js version

**Data Sources**:
- User data from localStorage
- Dashboard stats for system info

---

### BookingDetailModal Component
**File**: `admin dashboard/src/components/BookingDetailModal.jsx`

**Purpose**: Display comprehensive booking information in modal overlay

**Sections**:
1. **Header**: Booking ID, close button
2. **Booking Information**: Service, City, Area, Amount, Dates, Location
3. **Recipient Information**: User ID, Name, Email, Phone, Address
4. **Provider Information**: Provider ID, Name, Phone, Rating, Area, Response Time, Verified Status
5. **Description**: Booking description (if available)
6. **Additional Data**: Raw JSON data display
7. **Status Management**: Status dropdown with update button
8. **Footer**: Close and Delete buttons

**Features**:
- Responsive design
- Smooth animations (slide-in)
- Color-coded status badges
- Clickable elements
- Confirmation dialogs for delete/update

---

### StatCard Component
**File**: `admin dashboard/src/components/StatCard.jsx`

**Purpose**: Display individual statistics with icons and values

**Props**:
```javascript
{
  title: String,        // "Total Users"
  value: Number,        // 150
  icon: String,         // "👥"
  color: Color,         // green, blue, red, orange
  trend: Number,        // Optional: +5 (percentage change)
}
```

**Styling**:
- Colored top border (accent)
- Hover elevation effect
- Icon on left, value on right
- Responsive grid layout

---

## Theme & Styling

### Color System

#### Palette
```css
--mint-50: #F5FBF7          (Background)
--mint-100: #EAF8EF         (Soft background)
--mint-200: #D8F0E1         (Accents)
--green-500: #22C55E        (Accent color)
--green-600: #0E8F46        (Primary)
--green-700: #087238        (Primary dim)
--green-900: #10251A        (Text)
--emerald-ink: #0B2A18      (Dark text)
--white: #FFFFFF
--amber: #D97706            (Warning)
--red: #DC2626              (Danger)
--blue: #2F80ED             (Info)
```

#### Semantic Colors
```css
--primary-color: var(--green-600)           /* Buttons, Headers */
--accent-color: var(--green-500)            /* Highlights */
--text-color: var(--green-900)              /* Main text */
--bg-color: var(--mint-50)                  /* Page background */
--success-color: var(--green-500)           /* Success messages */
--error-color: var(--red)                   /* Error/Danger */
--warning-color: var(--amber)               /* Warnings */
```

### Layout & Spacing

#### Border Radius
```css
xs: 6px
sm: 8px
md: 12px (cards, inputs)
lg: 16px (modals)
```

#### Shadows
```css
--shadow: rgba(14, 143, 70, 0.20)
Used in: cards, modals, buttons on hover
```

#### Spacing Scale
```css
4px, 8px, 12px, 16px, 20px, 28px, 36px
Used in: padding, margin, gaps
```

### Components Styling

#### Cards
```css
background: white/light mint
border: 1px solid mint
border-radius: 12px
box-shadow: 0 4px 12px rgba(14,143,70,0.20)
padding: 16-24px
hover: translateY(-2px), enhanced shadow
```

#### Buttons
```css
Primary: Linear gradient (green-600 → green-700)
Secondary: Mint background with green text
Danger: Red background
Border-radius: 8px
Padding: 10px 16-20px
Hover: translateY(-2px), shadow enhancement
```

#### Inputs
```css
background: white
border: 1px solid mint border
border-radius: 8px
padding: 10-12px
focus: Primary color border + glow shadow
color: green-900
```

#### Tables
```css
Header: Mint background (--mint-100)
Rows: White with mint hover
Borders: Subtle mint
Status badges: Color-coded with transparency
```

#### Status Badges
```css
pending: rgba(217,119,6,0.1) bg + amber text
confirmed: rgba(34,197,94,0.13) bg + green text
completed: rgba(34,197,94,0.1) bg + green text
cancelled: rgba(220,38,38,0.1) bg + red text
border-radius: 6px
padding: 3px 8px
```

---

## Database Schema

### Collections Used

#### admin_users
```javascript
{
  _id: ObjectId,
  emailLower: String,           // "admin@asaaniyat.com"
  email: String,                // "admin@asaaniyat.com"
  passwordHash: String,         // bcrypt: $2b$12$...
  isAdmin: Boolean,             // true
  createdAt: Date,              // "2026-05-18T11:00:00Z"
  lastLoginAt: Date,            // "2026-05-18T14:30:00Z"
  loginCount: Number            // 5
}
```

#### users
```javascript
{
  _id: String,                  // "USR_1779044133775_h5qhuz"
  email: String,                // "user@example.com"
  emailLower: String,
  displayName: String,          // "John Doe"
  city: String,                 // "Karachi"
  phone: String,                // "03001234567"
  address: String,
  passwordHash: String,
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  loginCount: Number
}
```

#### bookings
```javascript
{
  _id: String,                  // "BK_1779102226066_eove8w"
  user_id: String,              // "USR_..."
  provider_id: String,          // "AC069"
  service_type: String,         // "AC Technician"
  location: String,             // "Tariq Road Karachi"
  city: String,                 // "Karachi"
  area: String,                 // "PECHS"
  booking_start_time: Date,     // "2026-05-18T09:00:00Z"
  quote_pkr: Number,            // 2046
  status: String,               // "confirmed"
  description: String,          // Optional
  raw_data: Object,             // Extended booking info
  created_at: Date,
  updated_at: Date,
  completedAt: Date             // When status = "completed"
}
```

#### providers
```javascript
{
  _id: ObjectId,
  id: String,                   // "AC069"
  name: String,                 // "PECHS Clean AC Technician Zahid"
  service: String,              // "AC Technician"
  city: String,                 // "Karachi"
  area: String,                 // "PECHS"
  lat: Number,                  // 24.8761
  lng: Number,                  // 67.0644
  distance_km: Number,          // 4.8
  rating: Number,               // 4.7 (out of 5)
  reviews_count: Number,        // 72
  phone: String,                // "0378-1538492"
  response_time_min: Number,    // 18
  verified: Boolean,            // true
  base_rate_pkr: Number,        // 1395
  on_time_score: Number,        // 95
  cancellation_risk: String,    // "low"
  created_at: Date,
  updated_at: Date
}
```

### Data Enrichment

The `/api/admin/bookings` endpoint automatically enriches each booking with:
1. **User data** from `users` collection:
   - user_name ← displayName
   - user_email ← email
   - user_phone ← phone
   - user_address ← address

2. **Provider data** from `providers` collection:
   - provider_name ← name
   - provider_phone ← phone
   - provider_rating ← rating
   - provider_service ← service
   - provider_area ← area
   - provider_verified ← verified
   - provider_response_time ← response_time_min

---

## Deployment

### Prerequisites for Deployment
- Node.js 16+ on server
- MongoDB Atlas cluster
- Environment variables configured
- SSL certificate (for HTTPS)
- Domain name or IP address

### Production Build

#### Backend
```bash
cd backend

# Verify environment variables
cat .env

# Tests (optional)
npm test

# Run in production
NODE_ENV=production npm start
```

#### Admin Dashboard
```bash
cd "admin dashboard"

# Build optimized version
npm run build

# Output: dist/ folder
# Upload to hosting (Vercel, Netlify, etc.)
# Or serve with express static middleware
```

### Environment Variables (Production)

**Backend (.env)**:
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/asaaniyat?retryWrites=true&w=majority
MONGODB_DB_NAME=asaaniyat
JWT_SECRET=very-secret-key-change-in-production
GROQ_API_KEY=your-api-key
GEMINI_API_KEY=your-api-key
```

**Frontend (.env.production)**:
```env
VITE_API_URL=https://your-api-domain.com
```

### Hosting Options

#### Backend
- Heroku
- AWS EC2
- Google Cloud Run
- Railway
- Render
- DigitalOcean

#### Frontend
- Vercel (recommended for Vite)
- Netlify
- AWS S3 + CloudFront
- Google Cloud Storage
- GitHub Pages

### SSL/HTTPS Setup
- Obtain certificate from Let's Encrypt
- Configure in reverse proxy (Nginx, Apache)
- Redirect HTTP to HTTPS
- Update CORS settings

### Monitoring
- Error logging (Sentry, LogRocket)
- Performance monitoring (New Relic, DataDog)
- MongoDB Atlas monitoring
- Uptime monitoring (UptimeRobot)

---

## Troubleshooting

### Common Issues & Solutions

#### 1. MongoDB Connection Failed
**Error**: `MongoServerSelectionError: Server selection timed out`

**Solutions**:
```bash
# Check MongoDB URI in .env
# Verify IP whitelist in MongoDB Atlas
# Test connection: mongosh "mongodb+srv://..."
# Check internet connection
# Verify credentials are URL-encoded if special chars
```

#### 2. Admin Login Not Working
**Error**: `Invalid credentials` or `Admin access required`

**Solutions**:
```bash
# Check admin_users collection exists
# Verify demo admin was created (check logs)
# Manually create admin user:
db.admin_users.insertOne({
  emailLower: "admin@asaaniyat.com",
  email: "admin@asaaniyat.com",
  passwordHash: bcrypt.hashSync("AdminPassword123", 10),
  isAdmin: true,
  createdAt: new Date()
})

# Clear browser localStorage and retry login
```

#### 3. Booking Data Shows "N/A"
**Error**: Missing user/provider information in detail modal

**Solutions**:
```bash
# Backend auto-enriches data during fetch
# Verify users collection has matching user_id
# Verify providers collection has matching provider_id
# Check booking raw_data for troubleshooting
# Ensure MongoDB indexes exist: db.users.createIndex({ _id: 1 })
```

#### 4. Invalid Date Display
**Error**: Shows `Invalid Date` or `N/A` in booking list

**Solutions**:
- Frontend has fallback handling for invalid dates
- Ensure booking.created_at or booking.createdAt is valid ISO string
- Backend query sorts by: `created_at: -1, createdAt: -1`

#### 5. API Endpoints Return 403 Forbidden
**Error**: `Admin access required`

**Solutions**:
```bash
# Verify JWT token is valid
# Check Authorization header present: Bearer {token}
# Confirm admin status in admin_users collection
# JWT might be expired: re-login
# Check browser localStorage for valid token
```

#### 6. Frontend Not Loading
**Error**: White screen or 404

**Solutions**:
```bash
# Check Vite dev server is running: npm run dev
# Verify port 5173 not in use: lsof -i :5173
# Clear browser cache: Ctrl+Shift+Delete
# Check console for errors: F12 → Console tab
# Verify API_URL in .env points to correct backend
```

#### 7. Booking Status Update Not Working
**Error**: Modal closes but status doesn't change

**Solutions**:
```bash
# Check backend is running and /api/admin/bookings/{id}/status exists
# Verify PUT request headers include Authorization
# Check MongoDB booking document exists with that _id
# Look for error in browser console (F12)
# Verify admin user has permissions
```

#### 8. Performance Issues - Slow Dashboard Load
**Solutions**:
```bash
# Limit pagination to 20 records (already done)
# Add database indexes:
  db.bookings.createIndex({ status: 1 })
  db.bookings.createIndex({ created_at: -1 })
# Cache dashboard stats (optional enhancement)
# Use CDN for frontend assets
# Enable gzip compression in backend
```

---

## Security Considerations

### Current Security Measures
✅ JWT-based authentication  
✅ Separate admin_users collection  
✅ bcryptjs password hashing (10 salt rounds)  
✅ CORS headers configured  
✅ Admin middleware on all protected routes  
✅ HttpOnly cookie support (optional)  
✅ Rate limiting (optional)  

### Recommended Enhancements
- [ ] Implement rate limiting on login endpoint
- [ ] Add CSRF token validation
- [ ] Set secure HttpOnly cookies instead of localStorage
- [ ] Implement 2-factor authentication
- [ ] Add request validation/sanitization
- [ ] Log admin actions for audit trail
- [ ] Implement session timeout
- [ ] Add IP whitelist for admin access
- [ ] Encrypt sensitive environment variables
- [ ] Regular security audits

---

## Future Enhancements

### Planned Features
- [ ] Admin activity audit logs
- [ ] Bulk operations (delete multiple bookings)
- [ ] CSV/PDF export functionality
- [ ] Advanced filtering and search
- [ ] Real-time notifications
- [ ] User role management (super-admin, moderator)
- [ ] Email digest reports
- [ ] Dark mode toggle
- [ ] Multi-language support
- [ ] Performance dashboard
- [ ] Booking templates
- [ ] Team collaboration features

### Technical Improvements
- [ ] WebSocket for real-time updates
- [ ] Redis caching for frequently accessed data
- [ ] GraphQL alternative to REST API
- [ ] Automated backup system
- [ ] Advanced analytics engine
- [ ] Machine learning predictions
- [ ] Integration with payment systems
- [ ] SMS/Email notifications system

---

## Support & Maintenance

### Maintenance Tasks
- Weekly database backup verification
- Monthly security updates review
- Quarterly performance optimization
- Annual infrastructure review

### Support Contacts
- Backend Issues: Check `/logs` directory
- Database Issues: MongoDB Atlas dashboard
- Frontend Issues: Browser console (F12)
- Authentication Issues: Check JWT/admin_users

### Useful Commands

```bash
# Backend logs
cat backend/logs/*.log

# Check backend health
curl http://localhost:3001/health

# MongoDB query examples
mongo "mongodb+srv://..."
db.bookings.countDocuments({ status: "pending" })
db.users.countDocuments()

# Frontend build
cd "admin dashboard"
npm run build

# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-18 | Initial release - Login, Dashboard, Users, Bookings, Analytics, Settings |
| - | - | Booking detail modal with status update |
| - | - | Theme: Green/mint color system |
| - | - | User & provider data enrichment |
| - | - | Demo admin auto-creation |

---

## Document Information

**Last Updated**: May 18, 2026  
**Document Version**: 1.0  
**Maintained By**: Development Team  
**Status**: Production Ready

For questions or issues, refer to troubleshooting section or contact development team.
