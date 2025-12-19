# How to Run the Team Evaluation System

## Quick Start Guide

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher (comes with Node.js)

### Step 1: Clone the Repository

```bash
git clone https://github.com/amhabibi81/TwoX-PRJ.git
cd TwoX-PRJ/PRJ
```

### Step 2: Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** in the `backend/` directory:
   ```env
   JWT_SECRET=your-secret-key-must-be-at-least-32-characters-long-for-security
   PORT=5000
   DATABASE_PATH=./data/database.sqlite
   ```

   **Important**: Replace `your-secret-key-must-be-at-least-32-characters-long-for-security` with a strong random string (at least 32 characters).

4. **Start the backend server**:
   ```bash
   npm run dev
   ```

   The backend will:
   - Automatically create the database
   - Run migrations
   - Seed default questions
   - Start on http://localhost:5000

### Step 3: Frontend Setup

Open a **new terminal window**:

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the frontend development server**:
   ```bash
   npm run dev
   ```

   The frontend will start on http://localhost:5173

### Step 4: Access the Application

1. Open your browser and go to: **http://localhost:5173**
2. You should see the login page
3. Create a new account or login with existing credentials

## Running Both Services

### Option 1: Two Terminal Windows (Recommended)

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

### Option 2: Using npm scripts (if configured)

You can create a root `package.json` with scripts to run both:

```json
{
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\""
  }
}
```

## Verification

### Check Backend
- Backend should be running on: http://localhost:5000
- Check logs for: "Backend running on port 5000"

### Check Frontend
- Frontend should be running on: http://localhost:5173
- Browser should show the login page

### Test the Application

1. **Sign Up**: Create a new account
2. **Login**: Use your credentials
3. **Dashboard**: View your team (if teams are generated)
4. **Evaluation**: Complete the evaluation form
5. **Results**: View team rankings

## Troubleshooting

### Backend won't start

**Error**: "Missing required environment variables"
- **Solution**: Create `.env` file in `backend/` directory with all required variables

**Error**: "Invalid JWT_SECRET"
- **Solution**: Ensure JWT_SECRET is at least 32 characters long

**Error**: "Failed to connect to database"
- **Solution**: Check that `DATABASE_PATH` directory exists and is writable

### Frontend can't connect to backend

**Error**: "Network Error" or "CORS Error"
- **Solution**: 
  1. Verify backend is running on port 5000
  2. Check `frontend/src/api.js` has correct `baseURL: 'http://localhost:5000'`
  3. Ensure CORS is enabled in backend (it is by default)

### Database issues

**Error**: "Migration failed"
- **Solution**: Delete the database file and restart (migrations will run automatically)

**Error**: "Database locked"
- **Solution**: Ensure only one instance of the backend is running

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | `my-super-secret-key-12345678901234567890` |
| `PORT` | Backend server port | `5000` |
| `DATABASE_PATH` | Path to SQLite database file | `./data/database.sqlite` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_EMAILS` | Comma-separated admin emails | (empty - demo mode) |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` (production) or `debug` (development) |
| `NODE_ENV` | Environment (development/production/test) | `development` |

## Production Deployment

For production deployment, see the [Deployment section in README.md](README.md#deployment).

## Need Help?

- Check the [README.md](README.md) for detailed documentation
- Review error logs in the terminal
- Ensure all dependencies are installed
- Verify environment variables are set correctly
