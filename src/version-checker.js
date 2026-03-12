import axios from 'axios';
import semver from 'semver';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const NPM_REGISTRY = 'https://registry.npmjs.org';

class VersionChecker {
  constructor() {
    this.analysisResults = [];
    this.packageVersions = new Map();
    this.cache = new Map();
  }

  async loadAnalysisResults() {
    const resultsPath = path.join(DATA_DIR, 'analysis-results.json');
    
    try {
      this.analysisResults = await fs.readJson(resultsPath);
      console.log(`✓ Loaded analysis results for ${this.analysisResults.length} repositories`);
    } catch (error) {
      console.error('✗ Error loading analysis results:', error.message);
      throw error;
    }
  }

  cleanVersion(version) {
    // Remove common prefixes and ranges
    if (!version) return null;
    
    // Remove ^, ~, >=, <=, >, <, =
    let cleaned = version.replace(/^[\^~>=<]+/, '');
    
    // Handle version ranges (take the first version)
    if (cleaned.includes(' - ')) {
      cleaned = cleaned.split(' - ')[0];
    }
    if (cleaned.includes(' || ')) {
      cleaned = cleaned.split(' || ')[0];
    }
    
    // Remove any remaining spaces
    cleaned = cleaned.trim();
    
    // Validate it's a proper semver
    if (semver.valid(cleaned)) {
      return cleaned;
    }
    
    // Try to coerce it
    const coerced = semver.coerce(cleaned);
    return coerced ? coerced.version : null;
  }

  async fetchLatestVersion(packageName) {
    // Check cache first
    if (this.cache.has(packageName)) {
      return this.cache.get(packageName);
    }

    try {
      const response = await axios.get(`${NPM_REGISTRY}/${packageName}`, {
        timeout: 10000
      });

      const latestVersion = response.data['dist-tags']?.latest;
      const allVersions = Object.keys(response.data.versions || {});
      
      const versionInfo = {
        latest: latestVersion,
        allVersions: allVersions.sort((a, b) => semver.rcompare(a, b)),
        publishedDate: response.data.time?.[latestVersion],
        description: response.data.description,
        homepage: response.data.homepage,
        repository: response.data.repository?.url
      };

      // Cache the result
      this.cache.set(packageName, versionInfo);
      
      return versionInfo;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`    ⚠ Package not found: ${packageName}`);
        return { error: 'Package not found', latest: null };
      }
      console.error(`    ✗ Error fetching ${packageName}:`, error.message);
      return { error: error.message, latest: null };
    }
  }

  compareVersions(current, latest) {
    const cleanCurrent = this.cleanVersion(current);
    
    if (!cleanCurrent || !latest) {
      return {
        status: 'unknown',
        needsUpdate: false,
        message: 'Unable to determine version'
      };
    }

    try {
      if (semver.eq(cleanCurrent, latest)) {
        return {
          status: 'up-to-date',
          needsUpdate: false,
          message: 'Up to date'
        };
      } else if (semver.lt(cleanCurrent, latest)) {
        const diff = semver.diff(cleanCurrent, latest);
        return {
          status: 'outdated',
          needsUpdate: true,
          updateType: diff, // major, minor, patch
          message: `Update available (${diff})`
        };
      } else {
        return {
          status: 'ahead',
          needsUpdate: false,
          message: 'Ahead of latest'
        };
      }
    } catch (error) {
      return {
        status: 'error',
        needsUpdate: false,
        message: 'Version comparison failed'
      };
    }
  }

  async checkPackageVersions(packages) {
    const results = [];
    
    for (const pkg of packages) {
      const versionInfo = await this.fetchLatestVersion(pkg.name);
      const comparison = this.compareVersions(pkg.currentVersion, versionInfo.latest);
      
      results.push({
        name: pkg.name,
        currentVersion: pkg.currentVersion,
        cleanCurrentVersion: this.cleanVersion(pkg.currentVersion),
        latestVersion: versionInfo.latest,
        type: pkg.type,
        status: comparison.status,
        needsUpdate: comparison.needsUpdate,
        updateType: comparison.updateType,
        message: comparison.message,
        description: versionInfo.description,
        homepage: versionInfo.homepage,
        repository: versionInfo.repository,
        publishedDate: versionInfo.publishedDate,
        error: versionInfo.error
      });
    }
    
    return results;
  }

  async checkAllRepositories() {
    console.log('\n🔍 Checking package versions...\n');
    console.log('='.repeat(60));

    const enrichedResults = [];

    for (const repo of this.analysisResults) {
      if (repo.status !== 'success' || repo.packages.length === 0) {
        enrichedResults.push(repo);
        continue;
      }

      console.log(`\n📦 Checking packages for: ${repo.repoName}`);
      console.log(`   Total packages: ${repo.packages.length}`);

      const packageResults = await this.checkPackageVersions(repo.packages);
      
      const outdated = packageResults.filter(p => p.needsUpdate).length;
      const upToDate = packageResults.filter(p => p.status === 'up-to-date').length;
      
      console.log(`   ✓ Up to date: ${upToDate}`);
      console.log(`   ⚠ Outdated: ${outdated}`);

      enrichedResults.push({
        ...repo,
        packages: packageResults,
        packageStats: {
          total: packageResults.length,
          upToDate,
          outdated,
          unknown: packageResults.filter(p => p.status === 'unknown').length,
          errors: packageResults.filter(p => p.error).length
        }
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✓ Version check complete!');

    return enrichedResults;
  }

  async saveEnrichedResults(results) {
    const outputPath = path.join(DATA_DIR, 'enriched-results.json');
    await fs.writeJson(outputPath, results, { spaces: 2 });
    console.log(`\n💾 Enriched results saved to: ${outputPath}`);

    // Create detailed statistics
    const stats = {
      totalRepos: results.length,
      totalPackages: results.reduce((sum, r) => sum + (r.packages?.length || 0), 0),
      totalOutdated: results.reduce((sum, r) => sum + (r.packageStats?.outdated || 0), 0),
      totalUpToDate: results.reduce((sum, r) => sum + (r.packageStats?.upToDate || 0), 0),
      repoStats: results.map(r => ({
        name: r.repoName,
        total: r.packageStats?.total || 0,
        outdated: r.packageStats?.outdated || 0,
        upToDate: r.packageStats?.upToDate || 0
      })),
      timestamp: new Date().toISOString()
    };

    const statsPath = path.join(DATA_DIR, 'version-stats.json');
    await fs.writeJson(statsPath, stats, { spaces: 2 });

    console.log('\n📊 Statistics:');
    console.log(`   Total packages: ${stats.totalPackages}`);
    console.log(`   Up to date: ${stats.totalUpToDate}`);
    console.log(`   Outdated: ${stats.totalOutdated}`);
    console.log(`   Update rate: ${((stats.totalUpToDate / stats.totalPackages) * 100).toFixed(1)}%`);
  }
}

// Main execution
async function main() {
  const checker = new VersionChecker();
  
  try {
    await checker.loadAnalysisResults();
    const enrichedResults = await checker.checkAllRepositories();
    await checker.saveEnrichedResults(enrichedResults);
    console.log('\n✅ Version checking completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Version checking failed:', error.message);
    process.exit(1);
  }
}

main();

// Made with Bob
