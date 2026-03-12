# 📦 NPM Package Analytics Dashboard

A comprehensive analytics dashboard for tracking npm packages across multiple repositories. This tool helps teams monitor package versions, identify outdated dependencies, and maintain healthy codebases.

## ✨ Features

- **Repository Analysis**: Clone and analyze multiple repositories from a JSON configuration
- **Version Tracking**: Automatically check npm registry for latest package versions
- **Interactive Dashboard**: Beautiful web interface with multiple views and visualizations
- **Analytics & Insights**: Charts, statistics, and actionable insights about your dependencies
- **Search & Filter**: Easily find specific packages or repositories
- **Health Scoring**: Visual representation of repository maintenance status

## 📊 Dashboard Views

1. **Overview**: High-level statistics and distribution charts
2. **Repositories**: Detailed view of each repository and its packages
3. **Packages**: Comprehensive list of all packages across repositories
4. **Analytics**: Advanced charts and insights

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd npm-package-analytics-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Configure your repositories in `repos.json`:
```json
[
  {
    "name": "my-project",
    "url": "https://github.com/username/repo.git",
    "branch": "main"
  }
]
```

### Usage

#### Option 1: Run Complete Analysis and Start Server
```bash
npm start
```
This will:
1. Clone/update all repositories
2. Analyze package.json files
3. Check npm registry for latest versions
4. Start the dashboard server

#### Option 2: Run Steps Separately

**Step 1: Analyze Repositories**
```bash
npm run analyze
```
This runs both the repository analyzer and version checker.

**Step 2: Start Dashboard Server**
```bash
npm run serve
```

The dashboard will be available at: `http://localhost:3000`

## 📁 Project Structure

```
npm-package-analytics-dashboard/
├── src/
│   ├── analyzer.js          # Repository cloning and analysis
│   ├── version-checker.js   # NPM version checking
│   ├── index.js            # Main orchestrator
│   └── server.js           # Express server
├── public/
│   ├── index.html          # Dashboard HTML
│   ├── styles.css          # Dashboard styles
│   └── app.js              # Dashboard JavaScript
├── data/                   # Generated analysis data (auto-created)
├── repos/                  # Cloned repositories (auto-created)
├── repos.json              # Repository configuration
├── package.json            # Project dependencies
└── README.md              # This file
```

## 🔧 Configuration

### repos.json Format

```json
[
  {
    "name": "repository-name",
    "url": "https://github.com/username/repository.git",
    "branch": "main"
  }
]
```

**Fields:**
- `name`: Unique identifier for the repository
- `url`: Git clone URL (HTTPS or SSH)
- `branch`: Branch to checkout (default: "main")

### Environment Variables

You can customize the server port:
```bash
PORT=8080 npm run serve
```

## 📊 Data Files

The analysis generates several JSON files in the `data/` directory:

- `analysis-results.json`: Raw repository and package data
- `enriched-results.json`: Data with version information
- `version-stats.json`: Statistical summary
- `summary.json`: Quick overview statistics

## 🎨 Dashboard Features

### Overview Tab
- Total repositories and packages count
- Up-to-date vs outdated statistics
- Status distribution pie chart
- Packages per repository bar chart
- Update type distribution

### Repositories Tab
- List of all analyzed repositories
- Package statistics per repository
- Expandable package details
- Search functionality

### Packages Tab
- All unique packages across repositories
- Version information and status
- Repository usage details
- Search and filter by status

### Analytics Tab
- Most used packages chart
- Dependency types distribution
- Repository health scores
- Automated insights and recommendations

## 🔍 API Endpoints

The server provides several REST API endpoints:

- `GET /api/data` - All repository data with package information
- `GET /api/stats` - Statistical summary
- `GET /api/summary` - Quick overview
- `GET /api/packages` - All unique packages
- `GET /api/repo/:name` - Specific repository data
- `GET /api/health` - Server health check

## 🛠️ Development

### Running in Development Mode

1. Make changes to source files
2. Run analysis: `npm run analyze`
3. Start server: `npm run serve`
4. Open browser to `http://localhost:3000`

### Adding New Features

The project is modular and easy to extend:

- **Add new analysis**: Modify `src/analyzer.js`
- **Add version checks**: Modify `src/version-checker.js`
- **Add API endpoints**: Modify `src/server.js`
- **Add dashboard views**: Modify `public/index.html` and `public/app.js`

## 📈 Understanding the Data

### Package Status

- **Up to Date**: Current version matches latest npm version
- **Outdated**: Newer version available on npm
- **Unknown**: Unable to determine version status
- **Error**: Package not found or API error

### Update Types

- **Major**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **Minor**: New features, backward compatible (e.g., 1.0.0 → 1.1.0)
- **Patch**: Bug fixes (e.g., 1.0.0 → 1.0.1)

### Health Score

Repository health score is calculated as:
```
(Up-to-date packages / Total packages) × 100
```

- **80-100%**: Excellent (Green)
- **50-79%**: Moderate (Yellow)
- **0-49%**: Needs attention (Red)

## 🔒 Security Considerations

- Repository credentials: Use SSH keys or personal access tokens for private repos
- API rate limiting: The tool includes delays to avoid npm registry rate limits
- Data privacy: All data is stored locally, nothing is sent to external services

## 🐛 Troubleshooting

### "No data available" Error
- Run `npm run analyze` first to generate data
- Check that `repos.json` is properly configured
- Verify repository URLs are accessible

### Repository Clone Failures
- Check Git credentials and permissions
- Verify repository URLs are correct
- Ensure sufficient disk space

### Version Check Failures
- Check internet connectivity
- npm registry might be temporarily unavailable
- Some packages might be private or unpublished

### Port Already in Use
- Change port: `PORT=8080 npm run serve`
- Or stop the process using port 3000

## 📝 Best Practices

1. **Regular Analysis**: Run analysis weekly to stay updated
2. **Review Major Updates**: Check breaking changes before updating
3. **Prioritize Security**: Update packages with known vulnerabilities first
4. **Test Updates**: Test in development before updating production
5. **Document Changes**: Keep track of why packages are at specific versions

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- Additional chart types and visualizations
- Export functionality (PDF, CSV)
- Email notifications for outdated packages
- Integration with CI/CD pipelines
- Support for other package managers (pip, maven, etc.)

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

Built with:
- [Express.js](https://expressjs.com/) - Web server
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [simple-git](https://github.com/steveukx/git-js) - Git operations
- [axios](https://axios-http.com/) - HTTP client
- [semver](https://github.com/npm/node-semver) - Semantic versioning

## 📞 Support

For issues, questions, or suggestions:
1. Check the troubleshooting section
2. Review existing issues
3. Create a new issue with detailed information

---

**Happy Package Tracking! 📦✨**