# 📋 LabSyncPro Deployment Checklist

Follow these steps in order for successful deployment.

## ✅ **Step 1: GitHub Repository** 

### 1.1 Create GitHub Repository
- [ ] Go to [github.com](https://github.com) and sign in
- [ ] Click "+" → "New repository"
- [ ] Name: `LabSyncPro`
- [ ] Description: `Laboratory Management System with text-based coding submissions`
- [ ] Visibility: **Public** (required for free Render deployment)
- [ ] **Don't initialize** with README (we have one)
- [ ] Click "Create repository"

### 1.2 Connect Local Repository
- [ ] Edit `github-setup.sh` and replace `YOUR_USERNAME` with your GitHub username
- [ ] Run: `./github-setup.sh`
- [ ] Verify repository is visible on GitHub

---

## ✅ **Step 2: Supabase Database Setup**

### 2.1 Create Supabase Project
- [ ] Go to [supabase.com](https://supabase.com) and sign up/login
- [ ] Click "New Project"
- [ ] Organization: Choose or create one
- [ ] Project details:
  - **Name**: `LabSyncPro`
  - **Database Password**: Choose a strong password (save it!)
  - **Region**: Select closest to your users
- [ ] Click "Create new project"
- [ ] Wait 2-3 minutes for setup to complete

### 2.2 Get Database Credentials
- [ ] Go to **Settings** → **Database**
- [ ] Copy these values (you'll need them later):
  ```
  Host: db.xxxxxxxxxxxxx.supabase.co
  Database: postgres
  Port: 5432
  User: postgres
  Password: [your chosen password]
  ```

### 2.3 Run Database Schema
- [ ] Go to **SQL Editor** in Supabase dashboard
- [ ] Copy entire content from `supabase-schema.sql`
- [ ] Paste in SQL Editor
- [ ] Click **Run** button
- [ ] Verify all tables are created (check **Table Editor**)

---

## ✅ **Step 3: Render Backend Deployment**

### 3.1 Create Web Service
- [ ] Go to [render.com](https://render.com) and sign up/login
- [ ] Click "New +" → "Web Service"
- [ ] Connect your GitHub account
- [ ] Select your `LabSyncPro` repository
- [ ] Configure service:
  - **Name**: `labsyncpro-api`
  - **Environment**: `Node`
  - **Build Command**: `cd server && npm install`
  - **Start Command**: `cd server && npm start`
  - **Plan**: Free

### 3.2 Set Environment Variables
Click "Environment" and add these variables:
```
NODE_ENV=production
PORT=10000
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[your supabase password]
JWT_SECRET=[generate a random 32+ character string]
JWT_EXPIRE=7d
CLIENT_URL=https://labsyncpro-frontend.onrender.com
MAX_TEXT_LENGTH=10000
MAX_OUTPUT_LENGTH=5000
```

### 3.3 Deploy Backend
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (5-10 minutes)
- [ ] Check logs for any errors
- [ ] Note your backend URL: `https://labsyncpro-api.onrender.com`

---

## ✅ **Step 4: Render Frontend Deployment**

### 4.1 Create Static Site
- [ ] Click "New +" → "Static Site"
- [ ] Select same `LabSyncPro` repository
- [ ] Configure:
  - **Name**: `labsyncpro-frontend`
  - **Build Command**: `cd client && npm install && npm run build`
  - **Publish Directory**: `client/dist`

### 4.2 Set Frontend Environment Variables
```
VITE_API_URL=https://labsyncpro-api.onrender.com/api
```

### 4.3 Deploy Frontend
- [ ] Click "Create Static Site"
- [ ] Wait for build and deployment
- [ ] Note your frontend URL: `https://labsyncpro-frontend.onrender.com`

---

## ✅ **Step 5: Final Configuration**

### 5.1 Update Backend CORS
- [ ] Go to backend service on Render
- [ ] Update `CLIENT_URL` environment variable to your actual frontend URL
- [ ] Trigger redeploy

### 5.2 Test Application
- [ ] Visit your frontend URL
- [ ] Try creating an account
- [ ] Test login functionality
- [ ] Create a test assignment
- [ ] Test student submission flow

---

## 🎯 **Default Login Credentials**

After deployment, you can login with:
- **Email**: `admin@labsyncpro.com`
- **Password**: `admin123`

**⚠️ Change these credentials immediately after first login!**

---

## 🔧 **Troubleshooting**

### Common Issues:

**Backend won't start:**
- Check environment variables are set correctly
- Verify Supabase database credentials
- Check build logs for errors

**Frontend can't connect to backend:**
- Verify `VITE_API_URL` points to correct backend URL
- Check CORS settings in backend
- Ensure backend is running

**Database connection failed:**
- Double-check Supabase credentials
- Verify database is running
- Check SSL configuration

---

## 📱 **URLs After Deployment**

- **Frontend**: `https://labsyncpro-frontend.onrender.com`
- **Backend API**: `https://labsyncpro-api.onrender.com`
- **Supabase Dashboard**: `https://app.supabase.com/project/[your-project-id]`

---

## 🎉 **Success!**

Your LabSyncPro system is now live and ready for use!

**Features Available:**
- ✅ Text-based coding assignments
- ✅ Copy-paste submissions interface
- ✅ User management (Admin/Instructor/Student)
- ✅ Class and group organization
- ✅ Grading system
- ✅ Timetable management
- ✅ Mobile-friendly interface
