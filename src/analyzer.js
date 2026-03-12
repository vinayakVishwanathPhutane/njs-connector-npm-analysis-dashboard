import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPOS_DIR = path.join(__dirname, '../repos');
const DATA_DIR = path.join(__dirname, '../data');
const REPOS_CONFIG = path.join(__dirname, '../repos.json');

class RepositoryAnalyzer {
  constructor() {
    this.repos = [];
    this.analysisResults = [];
  }

  async initialize() {
    // Ensure directories exist
    await fs.ensureDir(REPOS_DIR);
    await fs.ensureDir(DATA_DIR);

    // Load repository configuration
    try {
      const reposData = await fs.readJson(REPOS_CONFIG);
      this.repos = reposData;
      console.log(`✓ Loaded ${this.repos.length} repositories from config`);
    } catch (error) {
      console.error('✗ Error loading repos.json:', error.message);
      throw error;
    }
  }

  async cloneOrUpdateRepo(repo) {
    const repoPath = path.join(REPOS_DIR, repo.name);
    const git = simpleGit();

    try {
      if (await fs.pathExists(repoPath)) {
        console.log(`  Updating existing repository: ${repo.name}`);
        const repoGit = simpleGit(repoPath);
        await repoGit.pull();
      } else {
        console.log(`  Cloning repository: ${repo.name}`);
        await git.clone(repo.url, repoPath, ['--branch', repo.branch || 'main']);
      }
      return { success: true, path: repoPath };
    } catch (error) {
      console.error(`  ✗ Error with repository ${repo.name}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async extractPackageJson(repoPath) {
    const packageJsonPath = path.join(repoPath, 'src/package.json');
    
    try {
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        return packageJson;
      } else {
        console.log(`    No package.json found in ${path.basename(repoPath)}`);
        return null;
      }
    } catch (error) {
      console.error(`    Error reading package.json:`, error.message);
      return null;
    }
  }

  extractDependencies(packageJson) {
    if (!packageJson) return [];

    const dependencies = [];
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

    depTypes.forEach(depType => {
      if (packageJson[depType]) {
        Object.entries(packageJson[depType]).forEach(([name, version]) => {
          dependencies.push({
            name,
            currentVersion: version,
            type: depType
          });
        });
      }
    });

    return dependencies;
  }

  async analyzeRepository(repo) {
    console.log(`\n📦 Analyzing: ${repo.name}`);
    
    const cloneResult = await this.cloneOrUpdateRepo(repo);
    
    if (!cloneResult.success) {
      return {
        repoName: repo.name,
        repoUrl: repo.url,
        branch: repo.branch,
        status: 'error',
        error: cloneResult.error,
        packages: [],
        timestamp: new Date().toISOString()
      };
    }

    const packageJson = await this.extractPackageJson(cloneResult.path);
    const dependencies = this.extractDependencies(packageJson);

    console.log(`  ✓ Found ${dependencies.length} packages`);

    return {
      repoName: repo.name,
      repoUrl: repo.url,
      branch: repo.branch,
      status: 'success',
      packages: dependencies,
      projectName: packageJson?.name || repo.name,
      projectVersion: packageJson?.version || 'unknown',
      timestamp: new Date().toISOString()
    };
  }

  async analyzeAll() {
    console.log('\n🚀 Starting repository analysis...\n');
    console.log('='.repeat(60));

    for (const repo of this.repos) {
      const result = await this.analyzeRepository(repo);
      this.analysisResults.push(result);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✓ Analysis complete!');
    
    return this.analysisResults;
  }

  async saveResults() {
    const outputPath = path.join(DATA_DIR, 'analysis-results.json');
    await fs.writeJson(outputPath, this.analysisResults, { spaces: 2 });
    console.log(`\n💾 Results saved to: ${outputPath}`);
    
    // Create a summary
    const summary = {
      totalRepos: this.analysisResults.length,
      successfulRepos: this.analysisResults.filter(r => r.status === 'success').length,
      failedRepos: this.analysisResults.filter(r => r.status === 'error').length,
      totalPackages: this.analysisResults.reduce((sum, r) => sum + r.packages.length, 0),
      timestamp: new Date().toISOString()
    };

    const summaryPath = path.join(DATA_DIR, 'summary.json');
    await fs.writeJson(summaryPath, summary, { spaces: 2 });
    
    console.log('\n📊 Summary:');
    console.log(`   Total repositories: ${summary.totalRepos}`);
    console.log(`   Successful: ${summary.successfulRepos}`);
    console.log(`   Failed: ${summary.failedRepos}`);
    console.log(`   Total packages found: ${summary.totalPackages}`);
  }
}

// Main execution
async function main() {
  const analyzer = new RepositoryAnalyzer();
  
  try {
    await analyzer.initialize();
    await analyzer.analyzeAll();
    await analyzer.saveResults();
    console.log('\n✅ Analysis completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

main();

// Made with Bob
