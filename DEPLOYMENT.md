# Deployment Guide: Render (Backend) & Vercel (Frontend)

Team CodeSpark • **Smart Canteen Order & Rush Tracker**

This guide outlines how to deploy the backend to **Render** and the frontend (Student & Admin) to **Vercel**, and connect them seamlessly.

---

## Part 1: Backend Deployment on Render

### Step 1: Create a Web Service on Render
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`Canteen_sys` or `codespark`).

### Step 2: Configure Service Settings
- **Name:** `codespark-canteen-backend`
- **Region:** Any (e.g. `Singapore` or `Oregon`)
- **Branch:** `main`
- **Root Directory:** `codespark/backend` (or leave empty if using `render.yaml`)
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** `Free`

### Step 3: Add Environment Variables on Render
Under **Environment Variables**, add:

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `CLIENT_ORIGIN` | `*` | Allows requests from your Vercel deployment |
| `STAFF_AUTH_SECRET` | `codespark-staff-secret-2026` | Token used by admin/staff operations |
| `STAFF_PASSCODE` | `staff123` | Passcode for staff login |
| `MONGODB_URI` | *(Optional)* | Your MongoDB Atlas connection string (`mongodb+srv://...`). If omitted, our backend boots an embedded In-Memory MongoDB engine automatically! |

### Step 4: Deploy & Copy URL
1. Click **Create Web Service**.
2. Once deployed, copy your service URL, e.g.:
   ```
   https://codespark-canteen-backend.onrender.com
   ```
3. Test health: `https://codespark-canteen-backend.onrender.com/api/health` should return `{"status":"ok"}`.

---

## Part 2: Frontend Deployment on Vercel

### Step 1: Import Project in Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Select your repository.

### Step 2: Project Settings
- **Root Directory:** `codespark` (Vercel will automatically read `vercel.json`).
- **Framework Preset:** `Other` (Vanilla HTML/CSS/JS).
- **Build & Output Settings:** Leave default (static).

### Step 3: Deploy & URLs
1. Click **Deploy**.
2. Vercel automatically deploys with clean routing configured via `vercel.json`:
   - **Student Portal:** `https://your-canteen-app.vercel.app/`
   - **Kitchen Admin Dashboard:** `https://your-canteen-app.vercel.app/admin` (or `/admin-ui`)

---

## Part 3: Connecting Frontend to Render Backend

You have two convenient ways to link the Vercel frontend to the Render backend:

### Option A: 1-Click Browser Link (Zero Code Change)
Open the deployed Vercel URL with the `?backend=` query parameter:
```
https://your-canteen-app.vercel.app/?backend=https://codespark-canteen-backend.onrender.com/api
```
The application will save this URL into `localStorage` on that device and reuse it automatically across tabs.

### Option B: Set Default in `frontend/student-ui/js/api.js`
In `codespark/frontend/student-ui/js/api.js`, update line 44:
```javascript
// Change from default placeholder to your live Render backend URL:
return 'https://codespark-canteen-backend.onrender.com/api';
```

---

## Part 4: Local Development & Testing

Run all three services locally:

```bash
# 1. Run Backend Server (Port 5000)
cd codespark/backend
npm run dev

# 2. Run Student Portal (Port 3000)
cd codespark
npm run start:student

# 3. Run Kitchen Admin Dashboard (Port 3001)
cd codespark
npm run start:admin
```

### Running Test Suites
```bash
# Frontend Unit Tests (19 passing)
cd codespark
npm run test

# Backend API Tests (40 passing)
cd codespark
npm run test:backend

# Full End-to-End Live Integration Tests (15 passing)
cd codespark
npm run test:integration
```
All **74 automated assertions** pass cleanly!
