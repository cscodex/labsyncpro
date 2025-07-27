# Deploy LabSyncPro to Render

## Quick Deployment Guide

### Prerequisites
- GitHub repository with your LabSyncPro code
- Render account (free tier works)
- Supabase project already set up

### Step 1: Deploy Using render.yaml

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Deploy to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository containing LabSyncPro
   - Render will automatically detect the `render.yaml` file
   - Click "Apply" to start deployment

### Step 2: Verify Environment Variables

The `render.yaml` file is already configured with your Supabase credentials. Render will automatically set:

**Backend Service (labsyncpro-api):**
- `SUPABASE_URL`: https://awcgutnuuyemhmoykokk.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: [Your service role key]
- `DATABASE_URL`: [Your Supabase PostgreSQL connection string]
- `CLIENT_URL`: https://labsyncpro-frontend.onrender.com

**Frontend Service (labsyncpro-frontend):**
- `VITE_API_URL`: https://labsyncpro-api.onrender.com/api
- `VITE_SUPABASE_URL`: https://awcgutnuuyemhmoykokk.supabase.co
- `VITE_SUPABASE_ANON_KEY`: [Your anon key]

### Step 3: Access Your Application

After deployment completes (usually 5-10 minutes):

- **Frontend**: https://labsyncpro-frontend.onrender.com
- **Backend API**: https://labsyncpro-api.onrender.com
- **Health Check**: https://labsyncpro-api.onrender.com/health

### Step 4: Test the Deployment

1. Visit the frontend URL
2. Try logging in with existing credentials
3. Test basic functionality like viewing dashboard
4. Check browser console for any errors

### Troubleshooting

**If deployment fails:**
1. Check the build logs in Render dashboard
2. Ensure all dependencies are in package.json
3. Verify environment variables are set correctly

**If API calls fail:**
1. Check that backend service is running
2. Verify CORS settings allow frontend domain
3. Test API health endpoint directly

**Common Issues:**
- **Build timeout**: Free tier has limited build time
- **Cold starts**: Free tier services sleep after inactivity
- **CORS errors**: Check CLIENT_URL environment variable

### Production Considerations

For production use, consider:
- Upgrading to paid Render plans for better performance
- Setting up custom domains
- Implementing proper monitoring and logging
- Regular database backups
- SSL certificate configuration (handled automatically by Render)

### Manual Environment Variable Updates

If you need to update environment variables after deployment:
1. Go to Render dashboard
2. Select your service
3. Go to "Environment" tab
4. Update variables
5. Trigger manual deploy

---

## Current Configuration Status

✅ **Supabase Database**: Connected and configured  
✅ **Environment Variables**: Set in render.yaml  
✅ **CORS Configuration**: Configured for Render domains  
✅ **Build Commands**: Optimized for Render deployment  
✅ **SSL/HTTPS**: Automatically handled by Render  

Your application is ready for deployment to Render!
