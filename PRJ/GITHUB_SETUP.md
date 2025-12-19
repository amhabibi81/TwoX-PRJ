# GitHub Repository Setup Instructions

## Step 1: Create GitHub Repository

### Option A: Via GitHub Web Interface (Recommended)

1. Go to https://github.com/new
2. **Repository name**: `team-evaluation-system` (or your preferred name)
3. **Description**: "Monthly team performance evaluation system - Full-stack web application"
4. **Visibility**: Choose Public or Private
5. **Important**: Do NOT check any of these boxes:
   - ❌ Add a README file (we already have one)
   - ❌ Add .gitignore (we already have one)
   - ❌ Choose a license (optional, add later if needed)
6. Click **"Create repository"**

### Option B: Via GitHub CLI

If you have GitHub CLI installed:

```bash
gh repo create team-evaluation-system --public --description "Monthly team performance evaluation system" --source=. --remote=origin --push
```

## Step 2: Push Your Code

After creating the repository on GitHub, run these commands:

```bash
# If you don't have a remote yet, add it (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/team-evaluation-system.git

# Or if remote already exists, update it
git remote set-url origin https://github.com/YOUR_USERNAME/team-evaluation-system.git

# Push to GitHub
git push -u origin main
```

If you get an error about the branch name, try:

```bash
git push -u origin main:main
```

Or if your default branch is `master`:

```bash
git push -u origin main:master
```

## Step 3: Verify

1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/team-evaluation-system`
2. Verify all files are present:
   - ✅ `README.md` should render nicely
   - ✅ `backend/` directory with all files
   - ✅ `frontend/` directory with all files
   - ✅ `.gitignore` file
3. Check that sensitive files are NOT visible:
   - ❌ No `.env` files
   - ❌ No `node_modules/` directories
   - ❌ No database files (`.sqlite`)

## Step 4: Update README Clone URL

After pushing, update the clone URL in `README.md`:

1. Find this line in README.md:
   ```markdown
   git clone https://github.com/YOUR_USERNAME/team-evaluation-system.git
   ```

2. Replace `YOUR_USERNAME` with your actual GitHub username

3. Commit and push:
   ```bash
   git add README.md
   git commit -m "Update README with correct GitHub URL"
   git push
   ```

## Troubleshooting

### "Remote origin already exists"
If you get this error, update the remote URL:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/team-evaluation-system.git
```

### "Authentication failed"
You may need to authenticate:
- Use a Personal Access Token instead of password
- Or set up SSH keys for GitHub
- Or use GitHub CLI: `gh auth login`

### "Branch name mismatch"
If GitHub uses `master` instead of `main`:
```bash
git branch -M main  # Rename local branch to main
git push -u origin main
```

## Next Steps

After successfully pushing:

1. **Add repository topics** (optional): Go to repository settings → Topics, add: `nodejs`, `react`, `express`, `sqlite`, `team-evaluation`

2. **Add a license** (optional): Go to repository → Add file → Create new file → Name it `LICENSE` → Choose a license

3. **Set up GitHub Actions** (optional): For CI/CD, testing, etc.

4. **Share your repository**: The clone URL is now ready to share!
