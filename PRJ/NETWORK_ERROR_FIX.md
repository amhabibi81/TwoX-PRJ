# How to Fix Network Error - Simple Guide

> **Need more detailed instructions?** See [RENDER_URL_CONFIGURATION.md](RENDER_URL_CONFIGURATION.md) for step-by-step guide with exact button names and navigation paths.

## The Problem
Your website shows "Network Error" because the frontend doesn't know where to find the backend server.

## What You Need
You need two URLs from your Render dashboard:
1. Your backend URL (something like `https://team-eval-backend.onrender.com`)
2. Your frontend URL (something like `https://team-eval-frontend.onrender.com`)

## How to Find Your URLs

1. Go to https://dashboard.render.com
2. Click on your `team-eval-backend` service
3. Look at the top of the page - you'll see the URL (copy it)
4. Go back and click on your `team-eval-frontend` service
5. Look at the top of the page - you'll see the URL (copy it)

## Step 1: Tell Frontend Where Backend Is

1. In Render dashboard, click on `team-eval-frontend` service
2. Click the "Environment" tab (on the left side)
3. Look for `VITE_API_URL` in the list
   - If you see it: Click on it and change the value
   - If you don't see it: Click "Add Environment Variable" button
4. Set the value to your backend URL (the one you copied from step 1)
   - Example: `https://team-eval-backend.onrender.com`
5. Click "Save Changes"
6. Click "Manual Deploy" button (top right)
7. Click "Deploy latest commit"
8. Wait for deployment to finish (about 2-3 minutes)

## Step 2: Tell Backend to Allow Frontend

1. In Render dashboard, click on `team-eval-backend` service
2. Click the "Environment" tab (on the left side)
3. Look for `CORS_ORIGIN` in the list
   - If you see it: Click on it and change the value
   - If you don't see it: Click "Add Environment Variable" button
4. Set the value to your frontend URL (the one you copied from step 2)
   - Example: `https://team-eval-frontend.onrender.com`
5. Click "Save Changes"
6. Click "Manual Deploy" button (top right)
7. Click "Restart"
8. Wait for restart to finish (about 30 seconds)

## How to Know It Worked

1. Open your frontend website in a browser
2. Try to login or signup
3. If it works without showing "Network Error", you're done!
4. If you still see "Network Error":
   - Make sure both deployments finished
   - Check that you copied the URLs correctly (no typos)
   - Wait a few more minutes and try again

## Quick Summary

- Frontend needs: `VITE_API_URL` = your backend URL
- Backend needs: `CORS_ORIGIN` = your frontend URL
- After setting them, deploy frontend and restart backend
- Test by trying to login

That's it! The network error should be fixed.
