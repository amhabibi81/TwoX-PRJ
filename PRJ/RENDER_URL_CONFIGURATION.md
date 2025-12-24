# How to Configure URLs in Render - Detailed Step-by-Step Guide

This guide will walk you through every single step to configure the environment variables in Render dashboard.

---

## Part 1: Getting Your Service URLs

Before you can configure anything, you need to know your service URLs.

### Step 1: Open Render Dashboard

1. Open your web browser
2. Go to: `https://dashboard.render.com`
3. Log in if you're not already logged in
4. You should see a list of your services

### Step 2: Find Your Backend URL

1. In the list of services, look for a service named **`team-eval-backend`**
2. Click on **`team-eval-backend`** (click anywhere on the service card/row)
3. You should now see the backend service dashboard
4. Look at the top of the page, below the service name
5. You should see a section that says something like:
   - "Your service is live at:"
   - Or just a URL displayed prominently
6. The URL will look like: `https://team-eval-backend.onrender.com`
7. **Copy this URL** - you'll need it later
   - You can click on it to select it, or right-click and copy
   - Write it down somewhere safe

### Step 3: Find Your Frontend URL

1. Go back to the main dashboard (click "Dashboard" or "Services" in the top navigation)
2. In the list of services, look for a service named **`team-eval-frontend`**
3. Click on **`team-eval-frontend`**
4. You should now see the frontend service dashboard
5. Look at the top of the page, below the service name
6. You should see the URL displayed, like: `https://team-eval-frontend.onrender.com`
7. **Copy this URL** - you'll need it later
   - Write it down somewhere safe

**You now have:**
- Backend URL: `https://team-eval-backend.onrender.com` (your actual URL)
- Frontend URL: `https://team-eval-frontend.onrender.com` (your actual URL)

---

## Part 2: Configure Frontend (Set VITE_API_URL)

This tells your frontend where to find the backend.

### Step 1: Open Frontend Service

1. Make sure you're on the Render dashboard
2. Click on **`team-eval-frontend`** service
3. You should see the frontend service dashboard

### Step 2: Open Environment Tab

1. Look at the left sidebar menu
2. You should see tabs like: **Overview**, **Logs**, **Environment**, **Settings**, etc.
3. Click on **Environment** (it's usually the third or fourth option)
4. You should now see a page titled "Environment Variables" or similar
5. You should see a list of environment variables (or an empty list if none are set)

### Step 3: Find or Add VITE_API_URL

**Option A: If VITE_API_URL already exists:**

1. Look through the list of environment variables
2. Find the one named **`VITE_API_URL`**
3. You should see it has a "Key" column and a "Value" column
4. Click on the row with **`VITE_API_URL`** (or click an "Edit" button if there is one)
5. You should see an edit form or the value field becomes editable

**Option B: If VITE_API_URL does NOT exist:**

1. Look for a button that says:
   - **"Add Environment Variable"**
   - **"Add Variable"**
   - **"New Variable"**
   - Or a **"+"** button
2. Click that button
3. You should see a form with two fields:
   - **Key** (or "Name")
   - **Value**

### Step 4: Enter the Value

1. If you're editing an existing variable:
   - The **Key** field should already say **`VITE_API_URL`** (don't change it)
   - Click in the **Value** field
   - Delete any existing value
   - Type or paste your backend URL: `https://team-eval-backend.onrender.com`
     - Replace `team-eval-backend.onrender.com` with YOUR actual backend URL

2. If you're adding a new variable:
   - In the **Key** field, type exactly: `VITE_API_URL`
   - In the **Value** field, type your backend URL: `https://team-eval-backend.onrender.com`
     - Replace with YOUR actual backend URL

3. **Important**: Make sure:
   - The URL starts with `https://`
   - There are no spaces before or after the URL
   - You copied the URL correctly (no typos)

### Step 5: Save the Changes

1. Look for a button that says:
   - **"Save Changes"**
   - **"Save"**
   - **"Update"**
   - Or a checkmark icon
2. Click that button
3. You should see a message like "Changes saved" or the page should refresh
4. The **`VITE_API_URL`** should now appear in the list with your backend URL as the value

### Step 6: Trigger New Deployment

**Important**: Because Vite embeds environment variables at build time, you MUST rebuild the frontend after setting this variable.

1. Look at the top right of the page
2. You should see a button that says **"Manual Deploy"** or **"Deploy"**
3. Click **"Manual Deploy"**
4. A dropdown menu should appear
5. Click **"Deploy latest commit"** (or just "Deploy" if that's the only option)
6. You should see a deployment start
7. The page should show deployment progress
8. Wait for it to finish (usually 2-3 minutes)
9. You'll know it's done when you see "Live" status or "Deployed successfully"

**What's happening**: Render is rebuilding your frontend with the new API URL embedded in it.

---

## Part 3: Configure Backend (Set CORS_ORIGIN)

This tells your backend to allow requests from your frontend.

### Step 1: Open Backend Service

1. Go back to the Render dashboard (click "Dashboard" in top navigation)
2. Click on **`team-eval-backend`** service
3. You should see the backend service dashboard

### Step 2: Open Environment Tab

1. Look at the left sidebar menu
2. Click on **Environment** tab
3. You should see the environment variables page

### Step 3: Find or Add CORS_ORIGIN

**Option A: If CORS_ORIGIN already exists:**

1. Look through the list for **`CORS_ORIGIN`**
2. Click on it to edit (or click an "Edit" button)

**Option B: If CORS_ORIGIN does NOT exist:**

1. Click **"Add Environment Variable"** button (or similar)
2. You should see a form with Key and Value fields

### Step 4: Enter the Value

1. If editing:
   - Make sure **Key** is **`CORS_ORIGIN`**
   - In **Value** field, enter your frontend URL: `https://team-eval-frontend.onrender.com`
     - Replace with YOUR actual frontend URL

2. If adding new:
   - **Key**: Type exactly `CORS_ORIGIN`
   - **Value**: Type your frontend URL: `https://team-eval-frontend.onrender.com`
     - Replace with YOUR actual frontend URL

3. **Important**: Make sure:
   - The URL starts with `https://`
   - No spaces
   - Correct URL (no typos)

### Step 5: Save the Changes

1. Click **"Save Changes"** button
2. You should see a confirmation message
3. The **`CORS_ORIGIN`** should now be in the list with your frontend URL

### Step 6: Restart Backend Service

**Important**: Backend CORS settings take effect when the service restarts.

1. Look at the top right of the page
2. Click **"Manual Deploy"** button
3. A dropdown should appear
4. Click **"Restart"** (or "Restart Service")
5. You should see the service restarting
6. Wait for it to finish (usually 30-60 seconds)
7. You'll know it's done when you see "Live" status

**What's happening**: Render is restarting your backend with the new CORS setting, so it will now accept requests from your frontend URL.

---

## Part 4: Verify It Worked

### Step 1: Wait for Deployments to Finish

1. Make sure both services show "Live" status:
   - Frontend should show "Live" (after deployment finished)
   - Backend should show "Live" (after restart finished)

### Step 2: Test Your Website

1. Open a new browser tab
2. Go to your frontend URL: `https://team-eval-frontend.onrender.com` (your actual URL)
3. The website should load

### Step 3: Test Login/Signup

1. Try to sign up for a new account, or
2. Try to log in with an existing account
3. **If it works** (no "Network Error"), you're done!
4. **If you still see "Network Error"**, continue to troubleshooting

### Step 4: Check Browser Console (If Still Having Issues)

1. Open browser DevTools:
   - Press **F12**, or
   - Right-click on the page → "Inspect", or
   - Press **Ctrl+Shift+I** (Windows) or **Cmd+Option+I** (Mac)
2. Click the **"Console"** tab
3. Look for any error messages
4. You might see a warning about API configuration - that's okay if you just set it up

### Step 5: Check Network Tab (Advanced)

1. In DevTools, click the **"Network"** tab
2. Try to login or signup again
3. Look for API requests in the list
4. Click on one of the requests
5. Check the request URL:
   - It should be your backend URL (not `localhost:5000`)
   - If it shows `localhost:5000`, the frontend wasn't rebuilt properly
6. Check response headers:
   - Look for `Access-Control-Allow-Origin`
   - It should show your frontend URL

---

## Troubleshooting

### Problem: "I can't find the Environment tab"

**Solution**: 
- Make sure you clicked on the service name first
- The tabs are in the left sidebar, not the top navigation
- Try refreshing the page

### Problem: "I don't see VITE_API_URL or CORS_ORIGIN in the list"

**Solution**:
- That's okay! Click "Add Environment Variable" button
- Type the name exactly as shown: `VITE_API_URL` or `CORS_ORIGIN`
- Make sure there are no typos

### Problem: "I saved the variable but it's not working"

**For Frontend (VITE_API_URL)**:
- Did you trigger a new deployment after saving?
- Go to "Manual Deploy" → "Deploy latest commit"
- Wait for deployment to finish

**For Backend (CORS_ORIGIN)**:
- Did you restart the service after saving?
- Go to "Manual Deploy" → "Restart"
- Wait for restart to finish

### Problem: "I still see Network Error"

**Checklist**:
1. Did you wait for both deployments to finish? (Check "Live" status)
2. Did you copy the URLs correctly? (No typos, includes `https://`)
3. Frontend `VITE_API_URL` = your backend URL? (Check in Environment tab)
4. Backend `CORS_ORIGIN` = your frontend URL? (Check in Environment tab)
5. Try clearing browser cache: Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
6. Wait a few more minutes and try again

### Problem: "I don't know which URL to use"

**Solution**:
- Backend URL goes in frontend's `VITE_API_URL`
- Frontend URL goes in backend's `CORS_ORIGIN`
- Think of it as: Frontend needs to know where Backend is, Backend needs to know who Frontend is

---

## Quick Reference

**Frontend Service (`team-eval-frontend`):**
- Variable name: `VITE_API_URL`
- Value: Your backend URL (e.g., `https://team-eval-backend.onrender.com`)
- After setting: Deploy (rebuild)

**Backend Service (`team-eval-backend`):**
- Variable name: `CORS_ORIGIN`
- Value: Your frontend URL (e.g., `https://team-eval-frontend.onrender.com`)
- After setting: Restart

---

## Summary

1. Get your two URLs from Render dashboard
2. Set `VITE_API_URL` in frontend = backend URL → Deploy
3. Set `CORS_ORIGIN` in backend = frontend URL → Restart
4. Test by logging in

That's it! Your network error should be fixed.
