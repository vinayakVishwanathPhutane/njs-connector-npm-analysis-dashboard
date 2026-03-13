import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  async performSecurityAnalysis(repoPath) {
    const packageRepo = path.join(repoPath, 'src/');
    
    try {
      // Check if package.json exists in the src directory
      const packageJsonPath = path.join(packageRepo, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        console.log(`. ⚠️  No package.json found for audit in ${path.basename(repoPath)}`);
        return {
          status: 'skipped',
          message: `. ⚠️  No package.json found for audit in ${path.basename(repoPath)}`,
          error: `No package.json found for audit`,
          vulnerabilities: null
        };
      }

      console.log(`. 🔍 Preparing for npm audit in ${path.basename(repoPath)}...`);
      
      // Step 1: Run npm install --package-lock-only to generate package-lock.json
      // This creates the lock file without installing node_modules
      try {
        console.log(` 📦 Generating package-lock.json...`);
        await execAsync('npm install --package-lock-only', {
          cwd: packageRepo,
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        console.log(`    ✓ Package lock file generated`);
      } catch (installError) {
        console.error(`    ✗ Error generating package-lock.json:`, installError.message);
        return {
          status: 'error',
          message: `✗ Error generating package-lock.json:`,
          error: `Failed to generate package-lock.json: ${installError.message}`,
          vulnerabilities: null
        };
      }

      // Step 2: Run npm audit with JSON output
      console.log(`    🔍 Running npm audit...`);
      
      try {
        const { stdout } = await execAsync('npm audit --json', {
          cwd: packageRepo,
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large audit reports
        });
        
        const auditData = JSON.parse(stdout);
        
        console.log(`✓ Audit completed - No vulnerabilities found`);
        
        return {
          status: 'completed_with_vulnerabilities',
          message: ` ✓ Audit completed - No vulnerabilities found`,
          error: null,
          vulnerabilities: auditData
        };
      } catch (auditError) {
        // npm audit returns exit code 1 when vulnerabilities are found
        // We still want to parse the JSON output
        if (auditError.stdout) {
          try {
            const auditData = JSON.parse(auditError.stdout);
            console.log("auditData", JSON.stringify(auditData.metadata));
            
            let vulnerabilityCount = auditData.metadata?.vulnerabilities.total || 0;
            let criticalCount = auditData.metadata?.vulnerabilities.critical || 0;
            let highCount = auditData.metadata?.vulnerabilities.high || 0;
            
            console.log(` ⚠️  Found ${vulnerabilityCount} vulnerabilities (Critical: ${criticalCount}, High: ${highCount})`);
            
            return {
              status: 'completed_with_vulnerabilities',
              message: `⚠️  Found ${vulnerabilityCount} vulnerabilities (Critical: ${criticalCount}, High: ${highCount})`,
              error: null,
              vulnerabilities: auditData
            };
          } catch (parseError) {
            console.error(` ✗ Error parsing audit output:`, parseError.message);
            return {
              status: 'error',
              message: "",
              error: 'Failed to parse audit output',
              vulnerabilities: null
            };
          }
        }
        
        // If we can't parse the output, return error
        console.error(`    ✗ Error running npm audit:`, auditError.message);
        return {
          status: 'error',
          message: "",
          error: auditError.message,
          vulnerabilities: null
        };
      }
    } catch (error) {
      console.error(`    ✗ Unexpected error in security analysis:`, error.message);
      return {
        status: 'error',
        message: "",
        error: error.message,
        vulnerabilities: null
      };
    }
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
        deprecated: repo.status === 'deprecated',
        timestamp: new Date().toISOString()
      };
    }

    const packageJson = await this.extractPackageJson(cloneResult.path);
    const dependencies = this.extractDependencies(packageJson);
    const auditReport = await this.performSecurityAnalysis(cloneResult.path);

    console.log(`  ✓ Found ${dependencies.length} packages`);

    return {
      repoName: repo.name,
      repoUrl: repo.url,
      branch: repo.branch,
      status: 'success',
      packages: dependencies,
      auditReport: auditReport,
      projectName: packageJson?.name || repo.name,
      deprecated: repo.status === 'deprecated',
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
