# 📊 Asaaniyat Admin Dashboard

<p align="left">
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Recharts-22C55E?style=for-the-badge&logo=react&logoColor=white" alt="Recharts" />
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" />
</p>

A premium, high-performance web-based administration panel designed to manage, monitor, and audit the **Asaaniyat** service orchestration platform.

---

## ✨ Core Capabilities

### 📈 Real-Time Analytics & Key Metrics
* **Core KPI Cards**: Instant insights into *Total Bookings*, *Active Providers*, *Revenue Generated*, and *Customer Satisfaction*.
* **Interactive Visualizations**: Dynamic booking distribution pie charts, revenue trends, and geospatial activity analysis powered by **Recharts**.

### 👥 Comprehensive User & Provider Management
* **Role-Based Controls**: Easily elevate standard users to Administrators or view active provider metrics.
* **Geospatial Auditing**: Monitor registered service providers, their status (verified/pending), and operational areas.

### 📅 Booking Lifecycle Management
* **Execution Trace**: Review the outputs and logs of the **8-Agent AI Pipeline** for every transaction.
* **Conflict Resolution**: Intervene in case of service provider cancellations, check real-time agent re-routing logs.

---

## 🚀 Quick Start & Installation

### Prerequisites
* **Node.js**: `18.0.0+` recommended
* **Backend Server**: Ensure the Express backend is running on `http://localhost:3001`

### Installation Steps

1. **Navigate to the dashboard directory**:
   ```bash
   cd "admin dashboard"
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root of the `admin dashboard` folder:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. **Launch the local development server**:
   ```bash
   npm run dev
   ```
   *The application will launch automatically at [http://localhost:5173](http://localhost:5173).*

---

## 🏗️ Technical Architecture

### Frontend Tech Stack
* **UI Foundation**: React 19 (Component-driven flow)
* **Build tool**: Vite (Sub-second HMR updates)
* **Chart Engine**: Recharts (Custom SVG elements matching the light mint theme)
* **API Client**: Axios (Includes global authorization interceptors)

### Directory Overview
```text
admin dashboard/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx        # Overview KPIs, Status Pie Chart, Recent Bookings
│   │   ├── Users.jsx            # User list, Role toggle (isAdmin)
│   │   ├── Bookings.jsx         # Booking history, Deletion, Detailed logs
│   │   ├── Analytics.jsx        # Interactive Charts, Geo-distribution
│   │   ├── Settings.jsx         # System versioning & stack information
│   │   └── LoginPage.jsx        # Authentication (JWT local persistence)
│   ├── components/
│   │   └── StatCard.jsx         # Reusable glassmorphic KPI card
│   ├── App.jsx                  # Navigation bar & Route handler
│   ├── App.css                  # Mint Glassmorphism components layout
│   ├── index.css                # Base Tailwind-compatible core styles
│   └── main.jsx                 # Client entry point
```

---

> [!TIP]
> **First Time Logging In?**
> Simply sign up with a new account from the `/login` page. The first administrator account is automatically created. To enable additional administrators, toggle the **Admin Status** switch in the *Users* tab.

---

## 📡 API Reference (Admin Space)

The dashboard communicates with the backend via secure routes prefixed with `/api/admin/*`:

| Endpoint | Method | Purpose |
| :--- | :---: | :--- |
| `/api/admin/dashboard-stats` | `GET` | Aggregated key performance metrics. |
| `/api/admin/users` | `GET` | Paginated user records. |
| `/api/admin/bookings` | `GET` | Booking history and trace logs. |
| `/api/admin/analytics/bookings-by-day` | `GET` | Last 30 days of booking activity trends. |
| `/api/admin/users/:id/toggle-admin` | `POST` | Grants/revokes administrative roles. |
| `/api/admin/bookings/:id` | `DELETE` | Removes a booking record in demo mode. |

---

## 🎨 Visual System Compliance

The dashboard shares its color palette design language with the mobile client:
* **Background Canvas**: `#F5FBF7` (Soft Mint Green)
* **Primary Branding**: `#0E8F46` (Forest Emerald)
* **Status Accents**: Emerald Shadow borders (`rgba(14, 143, 70, 0.12)`) and translucent glass cards.

---

<div align="center">
  <p>Part of the <b>Asaaniyat Ecosystem</b> for the Google Antigravity Hackathon</p>
</div>
