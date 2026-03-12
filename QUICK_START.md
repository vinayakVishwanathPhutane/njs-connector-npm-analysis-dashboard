# 🚀 Quick Start Guide

Get your NPM Package Analytics Dashboard up and running in 5 minutes!

## Step 1: Install Dependencies ✅

```bash
npm install
```

## Step 2: Configure Your Repositories 📝

Edit the `repos.json` file with your actual repositories:

```json
[
  {
    "name": "my-frontend-app",
    "url": "https://github.com/myorg/frontend-app.git",
    "branch": "main"
  },
  {
    "name": "my-backend-api",
    "url": "https://github.com/myorg/backend-api.git",
    "branch": "main"
  }
]
```

**Tips:**
- Use HTTPS URLs for public repos
- Use SSH URLs (git@github.com:...) if you have SSH keys set up
- Specify the correct branch name (main, master, develop, etc.)

## Step 3: Run the Analysis 🔍

```bash
npm run analyze
```

This will:
1. Clone or update all repositories to the `repos/` folder
2. Extract package.json from each repository
3. Check npm registry for latest versions
4. Generate analysis data in the `data/` folder

**Expected output:**
```
🚀 Starting repository analysis...
============================================================

📦 Analyzing: my-frontend-app
  Cloning repository: my-frontend-app
  ✓ Found 45 packages

📦 Analyzing: my-backend-api
  Updating existing repository: my-backend-api
  ✓ Found 32 packages

============================================================
✓ Analysis complete!

🔍 Checking package versions...
============================================================

📦 Checking packages for: my-frontend-app
   Total packages: 45
   ✓ Up to date: 38
   ⚠ Outdated: 7

============================================================
✓ Version check complete!
```

## Step 4: Start the Dashboard 🎨

```bash
npm run serve
```

The dashboard will start at: **http://localhost:3000**

Open your browser and navigate to the URL to see your analytics dashboard!

## Step 5: Explore the Dashboard 📊

### Overview Tab
- See total statistics at a glance
- View distribution charts
- Understand your package health

### Repositories Tab
- Browse all analyzed repositories
- Expand to see package details
- Search for specific repositories

### Packages Tab
- View all unique packages
- Filter by status (outdated, up-to-date)
- See which repos use each package

### Analytics Tab
- Most used packages
- Dependency type distribution
- Repository health scores
- Automated insights

## 🔄 Updating Data

To refresh the analysis with latest data:

```bash
# Stop the server (Ctrl+C)
npm run analyze
npm run serve
```

Or use the "Refresh Data" button in the dashboard (requires re-running analysis first).

## 💡 Pro Tips

1. **Schedule Regular Analysis**: Set up a cron job or scheduled task to run analysis weekly
   ```bash
   # Example cron (every Monday at 9 AM)
   0 9 * * 1 cd /path/to/dashboard && npm run analyze
   ```

2. **Custom Port**: Run on a different port
   ```bash
   PORT=8080 npm run serve
   ```

3. **Quick Command**: Run everything at once
   ```bash
   npm start
   ```
   This runs analysis and starts the server automatically.

4. **Private Repositories**: For private repos, ensure you have:
   - SSH keys configured, OR
   - Git credentials cached, OR
   - Personal access token in the URL

5. **Large Repositories**: If you have many repos or large repos:
   - The first run will take longer (cloning)
   - Subsequent runs are faster (just pulls updates)
   - Consider running analysis during off-hours

## 🐛 Common Issues

### "No data available" in dashboard
**Solution**: Run `npm run analyze` first to generate data

### Repository clone fails
**Solution**: 
- Check repository URL is correct
- Verify you have access to the repository
- For private repos, ensure credentials are set up

### Port 3000 already in use
**Solution**: Use a different port
```bash
PORT=8080 npm run serve
```

### npm registry timeout
**Solution**: 
- Check internet connection
- Try again (temporary npm registry issue)
- The tool will continue with other packages

## 📱 Sharing with Team

### Option 1: Local Network
If running on your machine, team members on the same network can access:
```
http://YOUR_IP_ADDRESS:3000
```

### Option 2: Deploy to Server
Deploy to a server for permanent access:
1. Copy project to server
2. Run `npm install`
3. Set up as a service (systemd, pm2, etc.)
4. Configure firewall/reverse proxy

### Option 3: Export Data
Share the generated JSON files from the `data/` folder:
- `enriched-results.json` - Complete data
- `version-stats.json` - Statistics

## 🎯 Next Steps

1. ✅ Set up your repositories
2. ✅ Run first analysis
3. ✅ Explore the dashboard
4. 📅 Schedule regular updates
5. 👥 Share with your team
6. 🔧 Customize for your needs

## 📚 Need More Help?

- Read the full [README.md](README.md)
- Check the [API documentation](#) in README
- Review the troubleshooting section

---

**You're all set! Happy tracking! 📦✨**