# Render Deployment Troubleshooting

## Current Issue: Backend API Not Responding

### Problem
The frontend is deployed successfully at `https://labsyncpro-frontend.onrender.com`, but the backend API at `https://labsyncpro-api.onrender.com` is returning 404 errors.

### Possible Causes

1. **Free Tier Cold Start**
   - Render free tier services go to sleep after 15 minutes of inactivity
   - First request after sleep can take 30-60 seconds to wake up

2. **Backend Deployment Failure**
   - Build process might have failed
   - Environment variables might be incorrect
   - Dependencies might be missing

3. **Service Naming Mismatch**
   - Actual service URL might be different from expected
   - Render might append random strings to service names

### Troubleshooting Steps

#### Step 1: Check Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Look for your services:
   - `labsyncpro-api` (Backend)
   - `labsyncpro-frontend` (Frontend)
3. Check service status and logs

#### Step 2: Wake Up Backend Service
If the backend service is sleeping, try accessing it directly:
- Visit: `https://labsyncpro-api.onrender.com/health`
- Wait 30-60 seconds for cold start
- Refresh the page if it doesn't respond immediately

#### Step 3: Check Build Logs
1. Click on the backend service in Render dashboard
2. Go to "Logs" tab
3. Look for build errors or runtime errors
4. Common issues:
   - Missing environment variables
   - Database connection failures
   - Port binding issues

#### Step 4: Verify Environment Variables
Ensure these are set in the backend service:
```
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://awcgutnuuyemhmoykokk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-key]
DATABASE_URL=[your-connection-string]
CLIENT_URL=https://labsyncpro-frontend.onrender.com
```

#### Step 5: Test API Endpoints
Once the backend is responding, test these endpoints:
- Health check: `https://labsyncpro-api.onrender.com/health`
- API root: `https://labsyncpro-api.onrender.com/api`
- Test endpoint: `https://labsyncpro-api.onrender.com/api/users` (should require auth)

### Quick Fixes

#### Fix 1: Manual Redeploy
1. Go to backend service in Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete

#### Fix 2: Update Environment Variables
If environment variables are missing:
1. Go to service settings
2. Add missing variables
3. Trigger redeploy

#### Fix 3: Check Service URLs
Sometimes Render uses different URLs:
- Check the actual service URL in the dashboard
- Update frontend API configuration if needed

### Expected Behavior After Fix

1. **Backend Health Check**: `https://labsyncpro-api.onrender.com/health` should return:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-01-27T...",
     "database": "connected"
   }
   ```

2. **Frontend API Calls**: Should successfully connect to backend
3. **No 404 Errors**: All API endpoints should respond (with auth errors if not logged in)

### Prevention

1. **Keep Services Warm**: Set up a simple ping service to prevent cold starts
2. **Monitor Logs**: Regularly check service logs for issues
3. **Test After Deployment**: Always test both frontend and backend after deployment

### Contact Support

If issues persist:
1. Check Render status page: https://status.render.com
2. Contact Render support with service logs
3. Consider upgrading to paid plan for better reliability

---

## Current Status

- ✅ Frontend: Deployed and accessible
- ❌ Backend: Not responding (likely sleeping or failed deployment)
- 🔄 Next: Check Render dashboard and wake up backend service
