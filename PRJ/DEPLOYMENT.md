# Deployment Guide - Render Platform

This guide walks you through deploying the Team Evaluation System to Render, a Platform as a Service that supports both backend web services and static sites.

## Prerequisites

- A GitHub account
- A Render account (sign up at [render.com](https://render.com))
- Your project pushed to a GitHub repository

## Overview

The deployment consists of two services:

1. **Backend Web Service**: Node.js Express API
2. **Frontend Static Site**: React app built with Vite

## Deployment Methods

### Method 1: Using Render Blueprint (Recommended)

This is the easiest method using the `render.yaml` configuration file.

#### Step 1: Push to GitHub

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

#### Step 2: Create Blueprint on Render

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will detect the `render.yaml` file
5. Review the services and click **"Apply"**

#### Step 3: Configure Environment Variables

After the blueprint is created, you need to set environment variables:

**Backend Service (`team-eval-backend`):**

1. Go to the backend service dashboard
2. Navigate to **"Environment"** tab
3. Set the following variables:

   - `JWT_SECRET`: Generate a strong secret (32+ characters)
     - You can use: `openssl rand -base64 32` or an online generator
   - `CORS_ORIGIN`: Your frontend URL (will be set after frontend deploys)
     - Example: `https://team-eval-frontend.onrender.com`
   - `ADMIN_EMAILS`: Comma-separated admin emails (optional)
     - Example: `admin@example.com,admin2@example.com`

**Frontend Service (`team-eval-frontend`):**

1. Go to the frontend service dashboard
2. Navigate to **"Environment"** tab
3. Set the following variable:

   - `VITE_API_URL`: Your backend URL
     - Example: `https://team-eval-backend.onrender.com`

#### Step 4: Update CORS Origin

After both services are deployed:

1. Get your frontend URL from the frontend service dashboard
2. Go to backend service → **"Environment"** tab
3. Update `CORS_ORIGIN` with your frontend URL
4. Save changes (this will trigger a redeploy)

#### Step 5: Verify Deployment

1. Check backend logs for successful startup
2. Check frontend logs for successful build
3. Visit your frontend URL in a browser
4. Test login/signup functionality

### Method 2: Manual Deployment

If you prefer to configure services manually:

#### Backend Service Setup

1. **Create Web Service:**
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository
   - Configure:
     - **Name**: `team-eval-backend`
     - **Environment**: `Node`
     - **Region**: Choose closest to your users
     - **Branch**: `main`
     - **Root Directory**: `PRJ/backend`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

2. **Add Persistent Disk:**
   - Go to **"Disks"** tab
   - Click **"Create Disk"**
   - Name: `database-disk`
   - Mount Path: `/opt/render/project/src/PRJ/backend/data`
   - Size: 1 GB

3. **Set Environment Variables:**
   - Go to **"Environment"** tab
   - Add variables (see Environment Variables section below)

#### Frontend Service Setup

1. **Create Static Site:**
   - Click **"New +"** → **"Static Site"**
   - Connect your GitHub repository
   - Configure:
     - **Name**: `team-eval-frontend`
     - **Branch**: `main`
     - **Root Directory**: `PRJ/frontend`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `dist`

2. **Set Environment Variables:**
   - Go to **"Environment"** tab
   - Add `VITE_API_URL` with your backend URL

## Environment Variables

### Backend Service

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens (32+ chars) | `your-super-secret-key-here-32-chars-min` |
| `PORT` | Server port (Render sets automatically) | `10000` |
| `DATABASE_PATH` | Path to SQLite database | `/opt/render/project/src/PRJ/backend/data/database.sqlite` |
| `NODE_ENV` | Environment mode | `production` |

#### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:5173` | `https://team-eval-frontend.onrender.com` |
| `ADMIN_EMAILS` | Comma-separated admin emails | `[]` | `admin@example.com` |
| `EVAL_WEIGHT_SELF` | Self evaluation weight | `0.20` | `0.20` |
| `EVAL_WEIGHT_PEER` | Peer evaluation weight | `0.50` | `0.50` |
| `EVAL_WEIGHT_MANAGER` | Manager evaluation weight | `0.30` | `0.30` |
| `LOG_LEVEL` | Logging level | `info` | `info`, `debug`, `warn`, `error` |

### Frontend Service

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://team-eval-backend.onrender.com` |

## Database Persistence

The SQLite database is stored on a persistent disk to survive deployments and restarts.

**Important Notes:**

- The database file persists across deployments
- Database migrations run automatically on server startup
- Back up your database regularly (see Backup section)

## Custom Domain

To use a custom domain:

1. Go to your service dashboard
2. Navigate to **"Settings"** → **"Custom Domains"**
3. Add your domain
4. Follow DNS configuration instructions
5. Update `CORS_ORIGIN` and `VITE_API_URL` if needed

## Monitoring & Logs

### Viewing Logs

1. Go to your service dashboard
2. Click **"Logs"** tab
3. View real-time logs or download log files

### Health Checks

The backend service includes health check endpoint at `/` (root). Render automatically monitors this.

## Troubleshooting

### Backend Won't Start

**Issue**: Service fails to start

**Solutions:**
- Check logs for error messages
- Verify all required environment variables are set
- Ensure `JWT_SECRET` is at least 32 characters
- Check that `DATABASE_PATH` points to persistent disk mount path
- Verify Node.js version compatibility (v18+ recommended)

### Frontend Build Fails

**Issue**: Static site build fails

**Solutions:**
- Check build logs for specific errors
- Verify `VITE_API_URL` is set correctly
- Ensure all dependencies are in `package.json`
- Check that `vite.config.js` is configured correctly

### CORS Errors

**Issue**: Frontend can't connect to backend

**Solutions:**
- Verify `CORS_ORIGIN` in backend matches frontend URL exactly
- Check that `VITE_API_URL` in frontend matches backend URL
- Ensure both services are deployed and running
- Check browser console for specific CORS error messages

### Database Issues

**Issue**: Database errors or data loss

**Solutions:**
- Verify persistent disk is mounted correctly
- Check `DATABASE_PATH` points to disk mount path
- Ensure disk has sufficient space
- Check database file permissions

### Cold Starts (Free Tier)

**Issue**: First request takes 30+ seconds

**Solutions:**
- This is normal on Render free tier
- Consider upgrading to paid tier for faster cold starts
- Use a health check service to keep service warm

## Backup & Recovery

### Database Backup

1. **Manual Backup:**
   - SSH into your Render service (if available)
   - Copy database file from persistent disk
   - Store in secure location

2. **Automated Backup:**
   - Set up a cron job or scheduled task
   - Use Render's API or webhooks
   - Store backups in cloud storage (S3, etc.)

### Recovery

1. Stop the service
2. Replace database file on persistent disk
3. Restart the service
4. Verify data integrity

## Scaling

### Free Tier Limitations

- **Cold Starts**: ~30 seconds on first request
- **Sleep**: Services sleep after 15 minutes of inactivity
- **Build Time**: Limited build minutes per month

### Paid Tier Benefits

- **No Cold Starts**: Services stay warm
- **Faster Builds**: More build minutes
- **Better Performance**: More resources

### Upgrade Considerations

1. **Backend**: Consider PostgreSQL for high-traffic scenarios
2. **Frontend**: CDN for static assets
3. **Database**: Regular backups and monitoring

## Security Best Practices

1. **Environment Variables**: Never commit secrets to Git
2. **JWT Secret**: Use strong, randomly generated secrets
3. **HTTPS**: Render provides HTTPS automatically
4. **CORS**: Restrict CORS to specific origins
5. **Rate Limiting**: Already configured in backend
6. **Database**: Regular backups and access control

## Support

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Render Support**: [render.com/support](https://render.com/support)
- **Project Issues**: Create an issue in the GitHub repository

## Post-Deployment Checklist

- [ ] Backend service is running
- [ ] Frontend service is running
- [ ] Environment variables are set correctly
- [ ] CORS is configured properly
- [ ] Database migrations ran successfully
- [ ] Can access frontend URL
- [ ] Can login/signup
- [ ] API calls work from frontend
- [ ] Database persists across deployments
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring and alerts set up (if applicable)

## Next Steps

After successful deployment:

1. Test all features thoroughly
2. Set up monitoring and alerts
3. Configure regular database backups
4. Update documentation with production URLs
5. Set up CI/CD for automated deployments (optional)
