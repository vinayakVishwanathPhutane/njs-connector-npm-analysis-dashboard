import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, '../data');
const PUBLIC_DIR = path.join(__dirname, '../public');

// Middleware
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// API Routes

// Get enriched results (main data)
app.get('/api/data', async (req, res) => {
  try {
    const dataPath = path.join(DATA_DIR, 'enriched-results.json');
    
    if (await fs.pathExists(dataPath)) {
      const data = await fs.readJson(dataPath);
      res.json(data);
    } else {
      res.status(404).json({ 
        error: 'No data available. Please run analysis first.',
        message: 'Run: npm run analyze'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const statsPath = path.join(DATA_DIR, 'version-stats.json');
    
    if (await fs.pathExists(statsPath)) {
      const stats = await fs.readJson(statsPath);
      res.json(stats);
    } else {
      res.status(404).json({ 
        error: 'No statistics available. Please run analysis first.' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get summary
app.get('/api/summary', async (req, res) => {
  try {
    const summaryPath = path.join(DATA_DIR, 'summary.json');
    
    if (await fs.pathExists(summaryPath)) {
      const summary = await fs.readJson(summaryPath);
      res.json(summary);
    } else {
      res.status(404).json({ 
        error: 'No summary available. Please run analysis first.' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get data for a specific repository
app.get('/api/repo/:repoName', async (req, res) => {
  try {
    const dataPath = path.join(DATA_DIR, 'enriched-results.json');
    
    if (await fs.pathExists(dataPath)) {
      const data = await fs.readJson(dataPath);
      const repo = data.find(r => r.repoName === req.params.repoName);
      
      if (repo) {
        res.json(repo);
      } else {
        res.status(404).json({ error: 'Repository not found' });
      }
    } else {
      res.status(404).json({ error: 'No data available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all unique packages across all repos
app.get('/api/packages', async (req, res) => {
  try {
    const dataPath = path.join(DATA_DIR, 'enriched-results.json');
    
    if (await fs.pathExists(dataPath)) {
      const data = await fs.readJson(dataPath);
      const packagesMap = new Map();
      
      data.forEach(repo => {
        if (repo.packages) {
          repo.packages.forEach(pkg => {
            if (!packagesMap.has(pkg.name)) {
              packagesMap.set(pkg.name, {
                name: pkg.name,
                latestVersion: pkg.latestVersion,
                description: pkg.description,
                homepage: pkg.homepage,
                usedInRepos: []
              });
            }
            
            packagesMap.get(pkg.name).usedInRepos.push({
              repoName: repo.repoName,
              currentVersion: pkg.currentVersion,
              status: pkg.status,
              needsUpdate: pkg.needsUpdate
            });
          });
        }
      });
      
      const packages = Array.from(packagesMap.values());
      res.json(packages);
    } else {
      res.status(404).json({ error: 'No data available' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start server
async function startServer() {
  try {
    // Ensure public directory exists
    await fs.ensureDir(PUBLIC_DIR);
    
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 NPM Package Analytics Dashboard Server');
      console.log('='.repeat(60));
      console.log(`\n✓ Server running at: http://localhost:${PORT}`);
      console.log(`✓ API available at: http://localhost:${PORT}/api`);
      console.log('\n📊 Available endpoints:');
      console.log('   GET /api/data      - All repository data');
      console.log('   GET /api/stats     - Statistics');
      console.log('   GET /api/summary   - Summary');
      console.log('   GET /api/packages  - All packages');
      console.log('   GET /api/repo/:name - Specific repository');
      console.log('\n💡 Press Ctrl+C to stop the server\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

// Made with Bob
