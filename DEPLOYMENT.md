# Project Aura - Deployment Guide

This guide will help you deploy Project Aura to Vercel (Frontend) and Render (Backend + Database) for free.

## Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com with GitHub)
- Render account (sign up at render.com with GitHub)
- Git installed on your computer

---

## Step 1: Prepare Your Repository

### 1.1 Initialize Git (if not already done)
```bash
cd d:\FINAL\Project_Aura
git init
git add .
git commit -m "Initial commit for deployment"
```

### 1.2 Create GitHub Repository
1. Go to github.com and create a new repository (e.g., "project-aura")
2. Don't initialize with README (you already have files)
3. Copy the repository URL

### 1.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/project-aura.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

### 2.2 Create MySQL Database
1. Click "New +" → "MySQL"
2. Configure:
   - **Name**: project-aura-db
   - **Database**: aura
   - **User**: aura_user
   - **Region**: Choose closest to you
   - **Plan**: Free
3. Click "Create Database"
4. **IMPORTANT**: Save these credentials (you'll need them):
   - Internal Database URL
   - External Database URL
   - Username
   - Password

### 2.3 Deploy Laravel Backend
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: project-aura-backend
   - **Region**: Same as database
   - **Branch**: main
   - **Root Directory**: backend/laravel_app
   - **Runtime**: Docker
   - **Plan**: Free

4. **Environment Variables** - Add these:
   ```
   APP_NAME=Project_Aura
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://project-aura-backend.onrender.com
   APP_KEY=base64:YOUR_EXISTING_KEY_FROM_.env
   
   DB_CONNECTION=mysql
   DB_HOST=<Your MySQL Internal Host from Step 2.2>
   DB_PORT=3306
   DB_DATABASE=aura
   DB_USERNAME=aura_user
   DB_PASSWORD=<Your MySQL Password from Step 2.2>
   
   LOG_CHANNEL=stack
   LOG_LEVEL=error
   
   CACHE_DRIVER=file
   SESSION_DRIVER=cookie
   QUEUE_CONNECTION=sync
   SESSION_LIFETIME=120
   
   FRONTEND_URL=https://your-app.vercel.app
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
   
   SANCTUM_STATEFUL_DOMAINS=your-app.vercel.app
   ```

5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes)
7. **Save your backend URL**: https://project-aura-backend.onrender.com

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Update Environment Variable
1. Open `client/.env.production`
2. Replace with your actual Render backend URL:
   ```
   VITE_API_URL=https://project-aura-backend.onrender.com
   ```
3. Save the file
4. Commit and push:
   ```bash
   git add client/.env.production
   git commit -m "Update production API URL"
   git push
   ```

### 3.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: client
   - **Build Command**: npm run build
   - **Output Directory**: dist
6. Click "Deploy"
7. Wait for deployment (2-3 minutes)
8. **Save your frontend URL**: https://your-app.vercel.app

### 3.3 Update Backend CORS Settings
1. Go back to Render dashboard
2. Open your backend service
3. Update these environment variables with your actual Vercel URL:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
   SANCTUM_STATEFUL_DOMAINS=your-app.vercel.app
   ```
4. Save changes (backend will redeploy automatically)

---

## Step 4: Verify Deployment

### 4.1 Test Backend
1. Visit: `https://project-aura-backend.onrender.com`
2. You should see Laravel default page or your API response

### 4.2 Test Frontend
1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Your React app should load
3. Test API connectivity by trying to login/interact with forms

### 4.3 Check Database
1. In Render dashboard, go to your MySQL database
2. Click "Connect" → "External Connection"
3. You can use MySQL Workbench or any MySQL client to verify tables were created

---

## Troubleshooting

### Backend Issues
- **500 Error**: Check Render logs in dashboard
- **Database Connection Failed**: Verify DB credentials in environment variables
- **CORS Error**: Make sure CORS_ALLOWED_ORIGINS matches your Vercel URL exactly

### Frontend Issues
- **API Connection Failed**: Check that VITE_API_URL is correct in .env.production
- **Build Failed**: Check Vercel build logs for errors
- **404 on Refresh**: vercel.json should handle this (already configured)

### Free Tier Limitations
- **Render**: Services sleep after 15 mins of inactivity (cold start takes ~30 seconds)
- **Vercel**: 100GB bandwidth/month
- **MySQL on Render**: 1GB storage, expires after 90 days of inactivity

---

## Important Notes

1. **Cold Starts**: Free tier services sleep when inactive. First request after sleep takes 30-60 seconds.

2. **Database Backup**: Free MySQL databases are deleted after 90 days of inactivity. Export data regularly.

3. **SSL/HTTPS**: Both Vercel and Render provide free SSL certificates automatically.

4. **Custom Domain**: You can add custom domains later (free on both platforms).

5. **Logs**: Check logs in Render dashboard if something goes wrong.

---

## Maintenance

### Updating Your App
```bash
# Make changes to your code
git add .
git commit -m "Your update message"
git push
```
- Vercel and Render will auto-deploy on push to main branch

### Checking Logs
- **Render**: Dashboard → Your Service → Logs tab
- **Vercel**: Dashboard → Your Project → Deployments → View Function Logs

### Database Migrations
Render will run migrations automatically on each deployment (configured in build.sh)

---

## Next Steps for Production

When you're ready to upgrade:
1. **Render**: Upgrade to $7/month for no sleep + better performance
2. **Database**: Consider upgrading to paid MySQL or use PlanetScale
3. **Monitoring**: Add error tracking (Sentry free tier)
4. **CDN**: Vercel provides this by default
5. **Backups**: Set up automated database backups

---

## Support

If you encounter issues:
- Check Render logs: https://render.com/docs/troubleshooting
- Check Vercel docs: https://vercel.com/docs
- Laravel deployment: https://laravel.com/docs/deployment

---

**Your deployment URLs:**
- Frontend: https://your-app.vercel.app (update after deployment)
- Backend: https://project-aura-backend.onrender.com (update after deployment)

Good luck with your client presentation! 🚀
