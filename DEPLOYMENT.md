# 🚀 Deployment Guide - LabSyncPro

Complete guide to deploy LabSyncPro to Render with Supabase database.

## 📋 Prerequisites

- GitHub account
- Supabase account
- Render account (free tier available)

## 🗄️ Database Setup (Supabase)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and fill details:
   - **Name**: `LabSyncPro`
   - **Database Password**: Choose strong password
   - **Region**: Select closest region
4. Wait for project creation (~2 minutes)

### Step 2: Get Database Credentials
1. Go to **Settings > Database**
2. Note down:
   - **Host**: `db.xxx.supabase.co`
   - **Database**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: Your chosen password

### Step 3: Run Database Schema
1. Go to **SQL Editor** in Supabase dashboard
2. Copy and paste the schema from `supabase-schema.sql`
3. Click **Run** to create all tables

## 🔧 Code Preparation

### Step 1: Update Environment Variables
Update `server/.env` with Supabase credentials:
```env
# Supabase Database Configuration
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password

# Application Configuration
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
CLIENT_URL=https://your-app-name.onrender.com
MAX_TEXT_LENGTH=10000
MAX_OUTPUT_LENGTH=5000
```

### Step 2: Update Client Environment
Update `client/.env`:
```env
VITE_API_URL=https://your-api-name.onrender.com/api
```

## 📦 GitHub Repository Setup

### Step 1: Initialize Git (if not done)
```bash
git init
git add .
git commit -m "Initial commit: LabSyncPro text-based system"
```

### Step 2: Create GitHub Repository
1. Go to [github.com](https://github.com)
2. Click "New repository"
3. Repository settings:
   - **Name**: `LabSyncPro`
   - **Description**: `Laboratory Management System with text-based submissions`
   - **Visibility**: Public or Private
   - **Don't initialize** with README (we have one)

### Step 3: Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/LabSyncPro.git
git branch -M main
git push -u origin main
```

## 🌐 Render Deployment

### Step 1: Create Backend Service
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name**: `labsyncpro-api`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free

### Step 2: Set Environment Variables
In Render dashboard, add these environment variables:
```
NODE_ENV=production
PORT=10000
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
CLIENT_URL=https://your-frontend-name.onrender.com
MAX_TEXT_LENGTH=10000
MAX_OUTPUT_LENGTH=5000
```

### Step 3: Create Frontend Service
1. Click "New +" → "Static Site"
2. Connect same GitHub repository
3. Configure:
   - **Name**: `labsyncpro-frontend`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/dist`

### Step 4: Set Frontend Environment Variables
```
VITE_API_URL=https://labsyncpro-api.onrender.com/api
```

## 🔗 Final Configuration

### Step 1: Update CORS Settings
After deployment, update `CLIENT_URL` in backend environment variables to match your frontend URL.

### Step 2: Test Deployment
1. Visit your frontend URL
2. Try logging in with default admin credentials
3. Create a test assignment
4. Test student submission flow

## 📊 Features Available

### ✅ Text-Based Submissions
- Students copy-paste their code input
- Students copy-paste their code output
- No file upload requirements
- Supports multiple programming languages

### ✅ Assignment Management
- Create text-based coding assignments
- Set difficulty levels and time limits
- Track student submissions
- Grade submissions with feedback

### ✅ User Management
- Admin, Instructor, Student roles
- Class and group organization
- User authentication with JWT

### ✅ Timetable Management
- Schedule management with WEF dates
- Period configuration
- Academic calendar support

## 🔧 Environment Variables Reference

### Backend (.env)
```env
# Database
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

# Application
NODE_ENV=production
PORT=10000
JWT_SECRET=your-secret
JWT_EXPIRE=7d
CLIENT_URL=https://your-frontend.onrender.com

# Text Submission Limits
MAX_TEXT_LENGTH=10000
MAX_OUTPUT_LENGTH=5000
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

## 🆘 Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check Supabase credentials
   - Verify database is running
   - Check SSL configuration

2. **CORS Errors**
   - Update CLIENT_URL in backend
   - Check frontend API URL

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed

4. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names

## 📈 Scaling Considerations

### Free Tier Limits:
- **Render**: 750 hours/month, sleeps after 15min inactivity
- **Supabase**: 500MB database, 2GB bandwidth

### Upgrade Options:
- **Render Pro**: $7/month for always-on service
- **Supabase Pro**: $25/month for 8GB database

---

**Your LabSyncPro system is now ready for production deployment! 🎉**
