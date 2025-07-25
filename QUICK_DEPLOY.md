# 🚀 Quick Deploy Reference - LabSyncPro

## 📋 **Your Information**
- **GitHub Repo**: https://github.com/cscodex/labsyncpro ✅
- **Supabase Keys**: You have ANON_KEY and SERVICE_ROLE_KEY ✅

## 🎯 **Deployment Steps (30 minutes total)**

### **1. Supabase Database (10 min)**
1. Go to [supabase.com](https://supabase.com) → New Project
2. **Name**: `LabSyncPro`
3. **Password**: Choose strong password (save it!)
4. **SQL Editor** → Copy/paste from `supabase-schema.sql` → Run
5. **Settings → Database** → Copy connection details

### **2. Render Backend (10 min)**
1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub → Select `cscodex/labsyncpro`
3. **Name**: `labsyncpro-api`
4. **Build**: `cd server && npm install`
5. **Start**: `cd server && npm start`
6. Add environment variables (see below)

### **3. Render Frontend (5 min)**
1. New Static Site → Same repo
2. **Name**: `labsyncpro-frontend`
3. **Build**: `cd client && npm install && npm run build`
4. **Publish**: `client/dist`
5. Add frontend environment variables

### **4. Update CORS (5 min)**
Update backend `CLIENT_URL` with actual frontend URL

---

## 🔑 **Environment Variables**

### **Backend (Render Web Service)**
```env
NODE_ENV=production
PORT=10000

# Database (from Supabase Settings → Database)
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password

# Supabase API (from Supabase Settings → API)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key

# JWT (generate random 32+ char string)
JWT_SECRET=your-super-secret-random-string-here
JWT_EXPIRE=7d

# CORS (update after frontend deployment)
CLIENT_URL=https://labsyncpro-frontend.onrender.com

# Limits
MAX_TEXT_LENGTH=10000
MAX_OUTPUT_LENGTH=5000
```

### **Frontend (Render Static Site)**
```env
VITE_API_URL=https://labsyncpro-api.onrender.com/api
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

---

## 🎯 **Default Login After Deployment**
- **Email**: `admin@labsyncpro.com`
- **Password**: `admin123`

**⚠️ Change these immediately after first login!**

---

## 📱 **Expected URLs**
- **Frontend**: `https://labsyncpro-frontend.onrender.com`
- **Backend**: `https://labsyncpro-api.onrender.com`
- **API**: `https://labsyncpro-api.onrender.com/api`

---

## 🔧 **JWT Secret Generator**
Use this command to generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ **Deployment Checklist**
- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Render
- [ ] Environment variables set
- [ ] CORS updated
- [ ] Test login works
- [ ] Test assignment creation
- [ ] Test student submission

---

## 🆘 **Common Issues**

**Backend won't start:**
- Check all environment variables are set
- Verify Supabase password is correct
- Check build logs for errors

**Frontend can't connect:**
- Verify `VITE_API_URL` is correct
- Check backend is running
- Update `CLIENT_URL` in backend

**Database connection failed:**
- Double-check Supabase credentials
- Ensure SSL is configured
- Verify database is running

---

## 🎉 **Success Indicators**
- ✅ Backend shows "Server running on port 10000"
- ✅ Frontend loads without errors
- ✅ Can login with admin credentials
- ✅ Can create assignments
- ✅ Students can submit text-based code

**Your LabSyncPro is ready for production! 🚀**
