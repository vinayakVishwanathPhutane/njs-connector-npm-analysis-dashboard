// Global state
let allData = [];
let allPackages = [];
let stats = {};
let charts = {};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadData();
});

// Event Listeners
function initializeEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadData);

    // Search and filters
    document.getElementById('repoSearch')?.addEventListener('input', filterRepositories);
    document.getElementById('packageSearch')?.addEventListener('input', filterPackages);
    document.getElementById('statusFilter')?.addEventListener('change', filterPackages);
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });

    // Load tab-specific data
    if (tabName === 'packages' && allPackages.length === 0) {
        loadPackages();
    }
}

// Load data from API
async function loadData() {
    showLoading();
    
    try {
        const [dataResponse, statsResponse] = await Promise.all([
            fetch('/api/data'),
            fetch('/api/stats')
        ]);

        if (!dataResponse.ok || !statsResponse.ok) {
            throw new Error('Failed to fetch data. Please run analysis first.');
        }

        allData = await dataResponse.json();
        stats = await statsResponse.json();

        hideLoading();
        renderOverview();
        renderRepositories();
        renderAnalytics();
        updateLastUpdated(stats.timestamp);

    } catch (error) {
        showError(error.message);
    }
}

// Load packages
async function loadPackages() {
    try {
        const response = await fetch('/api/packages');
        if (response.ok) {
            allPackages = await response.json();
            renderPackages();
        }
    } catch (error) {
        console.error('Error loading packages:', error);
    }
}

// Render Overview Tab
function renderOverview() {
    // Update stats cards
    document.getElementById('totalRepos').textContent = stats.totalRepos || 0;
    document.getElementById('totalPackages').textContent = stats.totalPackages || 0;
    document.getElementById('upToDate').textContent = stats.totalUpToDate || 0;
    document.getElementById('outdated').textContent = stats.totalOutdated || 0;

    // Create charts
    createStatusChart();
    createRepoChart();
    createUpdateTypeChart();
}

// Create Status Distribution Chart
function createStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    if (charts.statusChart) {
        charts.statusChart.destroy();
    }

    const upToDate = stats.totalUpToDate || 0;
    const outdated = stats.totalOutdated || 0;
    const total = stats.totalPackages || 1;
    const unknown = total - upToDate - outdated;

    charts.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Up to Date', 'UPDATE AVAILABLE', 'Unknown'],
            datasets: [{
                data: [upToDate, outdated, unknown],
                backgroundColor: ['#10b981', '#f59e0b', '#94a3b8'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Create Repository Chart
function createRepoChart() {
    const ctx = document.getElementById('repoChart');
    if (!ctx) return;

    if (charts.repoChart) {
        charts.repoChart.destroy();
    }

    const repoData = stats.repoStats || [];
    const labels = repoData.map(r => r.name);
    const data = repoData.map(r => r.total);

    charts.repoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Packages',
                data: data,
                backgroundColor: '#2563eb',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Create Update Type Chart
function createUpdateTypeChart() {
    const ctx = document.getElementById('updateTypeChart');
    if (!ctx) return;

    if (charts.updateTypeChart) {
        charts.updateTypeChart.destroy();
    }

    // Count update types
    const updateTypes = { major: 0, minor: 0, patch: 0 };
    
    allData.forEach(repo => {
        if (repo.packages) {
            repo.packages.forEach(pkg => {
                if (pkg.updateType) {
                    updateTypes[pkg.updateType] = (updateTypes[pkg.updateType] || 0) + 1;
                }
            });
        }
    });

    charts.updateTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Major Updates', 'Minor Updates', 'Patch Updates'],
            datasets: [{
                label: 'Count',
                data: [updateTypes.major, updateTypes.minor, updateTypes.patch],
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Render Repositories Tab
function renderRepositories() {
    const container = document.getElementById('repoList');
    if (!container) return;

    container.innerHTML = allData.map(repo => {
        const auditReport = repo.auditReport;
        const hasVulnerabilities = auditReport?.vulnerabilities?.metadata?.vulnerabilities?.total > 0;
        const vulnData = auditReport?.vulnerabilities?.metadata?.vulnerabilities || {};
        const isDeprecated = repo.deprecated === true;
        
        return `
        <div class="repo-card ${isDeprecated ? 'deprecated' : ''}" data-repo="${repo.repoName}">
            <div class="repo-header">
                <div>
                    <div class="repo-title">
                        📁 ${repo.repoName}
                        ${isDeprecated ? '<span class="deprecated-badge">DEPRECATED</span>' : ''}
                    </div>
                    <div class="repo-url">${repo.repoUrl}</div>
                </div>
                <span class="status-badge ${repo.status}">${repo.status}</span>
            </div>
            
            <div class="repo-stats">
                <div class="repo-stat">
                    <span>📦</span>
                    <span>Total: ${repo.packageStats?.total || 0}</span>
                </div>
                <div class="repo-stat">
                    <span>✅</span>
                    <span>Up to date: ${repo.packageStats?.upToDate || 0}</span>
                </div>
                <div class="repo-stat">
                    <span>⚠️</span>
                    <span>UPDATE AVAILABLE: ${repo.packageStats?.outdated || 0}</span>
                </div>
            </div>

            ${hasVulnerabilities ? `
                <div class="vulnerability-summary">
                    <div class="vuln-header">
                        <span class="vuln-icon">🔒</span>
                        <strong>Security Vulnerabilities: ${vulnData.total || 0}</strong>
                    </div>
                    <div class="vuln-badges">
                        ${vulnData.critical > 0 ? `<span class="vuln-badge critical">Critical: ${vulnData.critical}</span>` : ''}
                        ${vulnData.high > 0 ? `<span class="vuln-badge high">High: ${vulnData.high}</span>` : ''}
                        ${vulnData.moderate > 0 ? `<span class="vuln-badge moderate">Moderate: ${vulnData.moderate}</span>` : ''}
                        ${vulnData.low > 0 ? `<span class="vuln-badge low">Low: ${vulnData.low}</span>` : ''}
                        ${vulnData.info > 0 ? `<span class="vuln-badge info">Info: ${vulnData.info}</span>` : ''}
                    </div>
                </div>

                <div class="repo-vulnerabilities">
                    <div class="repo-packages-header" onclick="toggleVulnerabilities('${repo.repoName}')">
                        <h4>Vulnerability Details</h4>
                        <span id="toggle-vuln-${repo.repoName}">▼</span>
                    </div>
                    <div id="vulnerabilities-${repo.repoName}" style="display: none;">
                        ${renderVulnerabilityDetails(auditReport)}
                    </div>
                </div>
            ` : `
                <div class="vulnerability-summary success">
                    <div class="vuln-header">
                        <span class="vuln-icon">✅</span>
                        <strong>No Known Vulnerabilities</strong>
                    </div>
                </div>
            `}

            ${repo.packages && repo.packages.length > 0 ? `
                <div class="repo-packages">
                    <div class="repo-packages-header" onclick="togglePackages('${repo.repoName}')">
                        <h4>Packages (${repo.packages.length})</h4>
                        <span id="toggle-${repo.repoName}">▼</span>
                    </div>
                    <div id="packages-${repo.repoName}" style="display: none;">
                        <table class="package-table">
                            <thead>
                                <tr>
                                    <th>Package</th>
                                    <th>Current</th>
                                    <th>Latest</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${repo.packages.map(pkg => `
                                    <tr>
                                        <td><strong>${pkg.name}</strong></td>
                                        <td>${pkg.currentVersion}</td>
                                        <td>${pkg.latestVersion || 'N/A'}</td>
                                        <td><span class="status-badge ${pkg.status}">${pkg.status === 'outdated' ? 'UPDATE AVAILABLE' : pkg.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    }).join('');
}

// Render vulnerability details
function renderVulnerabilityDetails(auditReport) {
    if (!auditReport?.vulnerabilities?.vulnerabilities) {
        return '<p class="no-data">No vulnerability data available</p>';
    }

    const vulnerabilities = auditReport.vulnerabilities.vulnerabilities;
    const vulnArray = Object.values(vulnerabilities);

    return `
        <div class="vulnerability-list">
            ${vulnArray.map(vuln => {
                const cveList = Array.isArray(vuln.via)
                    ? vuln.via.filter(v => typeof v === 'object' && v.source)
                    : [];
                
                return `
                    <div class="vulnerability-item">
                        <div class="vuln-item-header">
                            <div>
                                <strong class="vuln-package-name">${vuln.name}</strong>
                                <span class="vuln-badge ${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                                ${vuln.isDirect ? '<span class="vuln-type-badge direct">Direct Dependency</span>' : '<span class="vuln-type-badge transitive">Transitive</span>'}
                            </div>
                            ${vuln.fixAvailable ? '<span class="fix-badge available">Fix Available</span>' : '<span class="fix-badge unavailable">No Fix Available</span>'}
                        </div>

                        ${vuln.via && vuln.via.length > 0 ? `
                            <div class="vuln-via">
                                <strong>Via:</strong> ${Array.isArray(vuln.via) ? vuln.via.map(v => typeof v === 'string' ? v : v.name).join(', ') : vuln.via}
                            </div>
                        ` : ''}

                        ${cveList.length > 0 ? `
                            <div class="cve-table-container">
                                <table class="cve-table">
                                    <thead>
                                        <tr>
                                            <th>CVE ID</th>
                                            <th>Title</th>
                                            <th>Severity</th>
                                            <th>CVSS Score</th>
                                            <th>CWE</th>
                                            <th>Link</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${cveList.map(cve => `
                                            <tr>
                                                <td><code>GHSA-${cve.source}</code></td>
                                                <td class="cve-title">${cve.title || 'N/A'}</td>
                                                <td><span class="vuln-badge ${cve.severity}">${cve.severity}</span></td>
                                                <td>${cve.cvss?.score || 'N/A'}</td>
                                                <td>${cve.cwe ? cve.cwe.join(', ') : 'N/A'}</td>
                                                <td>${cve.url ? `<a href="${cve.url}" target="_blank" class="cve-link">View</a>` : 'N/A'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : ''}

                        ${vuln.effects && vuln.effects.length > 0 ? `
                            <div class="vuln-effects">
                                <strong>Affects:</strong> ${vuln.effects.join(', ')}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Toggle vulnerabilities
function toggleVulnerabilities(repoName) {
    const vulnDiv = document.getElementById(`vulnerabilities-${repoName}`);
    const toggleIcon = document.getElementById(`toggle-vuln-${repoName}`);
    
    if (vulnDiv.style.display === 'none') {
        vulnDiv.style.display = 'block';
        toggleIcon.textContent = '▲';
    } else {
        vulnDiv.style.display = 'none';
        toggleIcon.textContent = '▼';
    }
}

// Toggle package list
function togglePackages(repoName) {
    const packagesDiv = document.getElementById(`packages-${repoName}`);
    const toggleIcon = document.getElementById(`toggle-${repoName}`);
    
    if (packagesDiv.style.display === 'none') {
        packagesDiv.style.display = 'block';
        toggleIcon.textContent = '▲';
    } else {
        packagesDiv.style.display = 'none';
        toggleIcon.textContent = '▼';
    }
}

// Render Packages Tab
function renderPackages() {
    const container = document.getElementById('packageList');
    if (!container) return;

    const filteredPackages = getFilteredPackages();

    container.innerHTML = filteredPackages.map(pkg => `
        <div class="package-card">
            <div class="package-header">
                <div>
                    <div class="package-name">📦 ${pkg.name}</div>
                    ${pkg.description ? `<div class="package-description">${pkg.description}</div>` : ''}
                </div>
            </div>
            
            <div class="package-versions">
                <span class="version-badge" style="background: #e0e7ff; color: #3730a3;">
                    Latest: ${pkg.latestVersion || 'N/A'}
                </span>
                ${pkg.homepage ? `
                    <a href="${pkg.homepage}" target="_blank" style="font-size: 0.875rem; color: #2563eb;">
                        🔗 Homepage
                    </a>
                ` : ''}
            </div>

            <div class="package-repos">
                <div class="package-repos-title">Used in ${pkg.usedInRepos.length} repository(ies):</div>
                <div class="repo-tags">
                    ${pkg.usedInRepos.map(repo => `
                        <div class="repo-tag">
                            ${repo.repoName}
                            <span class="status-badge ${repo.status}" style="margin-left: 0.5rem;">
                                ${repo.currentVersion}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// Filter packages
function getFilteredPackages() {
    let filtered = [...allPackages];

    // Search filter
    const searchTerm = document.getElementById('packageSearch')?.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(pkg => 
            pkg.name.toLowerCase().includes(searchTerm)
        );
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter')?.value;
    if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(pkg => 
            pkg.usedInRepos.some(repo => repo.status === statusFilter)
        );
    }

    return filtered;
}

// Filter repositories
function filterRepositories() {
    const searchTerm = document.getElementById('repoSearch')?.value.toLowerCase();
    const repoCards = document.querySelectorAll('.repo-card');

    repoCards.forEach(card => {
        const repoName = card.dataset.repo.toLowerCase();
        card.style.display = repoName.includes(searchTerm) ? 'block' : 'none';
    });
}

// Filter packages (trigger re-render)
function filterPackages() {
    renderPackages();
}

// Render Analytics Tab
function renderAnalytics() {
    createTopPackagesChart();
    createDepTypesChart();
    createHealthScoreChart();
    renderInsights();
}

// Create Top Packages Chart
function createTopPackagesChart() {
    const ctx = document.getElementById('topPackagesChart');
    if (!ctx) return;

    if (charts.topPackagesChart) {
        charts.topPackagesChart.destroy();
    }

    // Count package usage
    const packageCount = new Map();
    
    allData.forEach(repo => {
        if (repo.packages) {
            repo.packages.forEach(pkg => {
                packageCount.set(pkg.name, (packageCount.get(pkg.name) || 0) + 1);
            });
        }
    });

    // Get top 10
    const sorted = Array.from(packageCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    charts.topPackagesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([name]) => name),
            datasets: [{
                label: 'Usage Count',
                data: sorted.map(([, count]) => count),
                backgroundColor: '#8b5cf6',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Create Dependency Types Chart
function createDepTypesChart() {
    const ctx = document.getElementById('depTypesChart');
    if (!ctx) return;

    if (charts.depTypesChart) {
        charts.depTypesChart.destroy();
    }

    const depTypes = {
        dependencies: 0,
        devDependencies: 0,
        peerDependencies: 0,
        optionalDependencies: 0
    };

    allData.forEach(repo => {
        if (repo.packages) {
            repo.packages.forEach(pkg => {
                if (pkg.type && depTypes.hasOwnProperty(pkg.type)) {
                    depTypes[pkg.type]++;
                }
            });
        }
    });

    charts.depTypesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(depTypes).map(key => 
                key.replace(/([A-Z])/g, ' $1').trim()
            ),
            datasets: [{
                data: Object.values(depTypes),
                backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Create Health Score Chart
function createHealthScoreChart() {
    const ctx = document.getElementById('healthScoreChart');
    if (!ctx) return;

    if (charts.healthScoreChart) {
        charts.healthScoreChart.destroy();
    }

    const repoScores = allData.map(repo => {
        const total = repo.packageStats?.total || 0;
        const upToDate = repo.packageStats?.upToDate || 0;
        const score = total > 0 ? Math.round((upToDate / total) * 100) : 0;
        
        return {
            name: repo.repoName,
            score: score
        };
    });

    charts.healthScoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: repoScores.map(r => r.name),
            datasets: [{
                label: 'Health Score (%)',
                data: repoScores.map(r => r.score),
                backgroundColor: repoScores.map(r => 
                    r.score >= 80 ? '#10b981' : 
                    r.score >= 50 ? '#f59e0b' : '#ef4444'
                ),
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
}

// Render Insights
function renderInsights() {
    const container = document.getElementById('insights');
    if (!container) return;

    const insights = generateInsights();
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-card ${insight.type}">
            <div class="insight-title">${insight.icon} ${insight.title}</div>
            <div class="insight-description">${insight.description}</div>
        </div>
    `).join('');
}

// Generate insights
function generateInsights() {
    const insights = [];
    
    // Overall health
    const updateRate = stats.totalPackages > 0 
        ? ((stats.totalUpToDate / stats.totalPackages) * 100).toFixed(1)
        : 0;
    
    if (updateRate >= 80) {
        insights.push({
            type: 'success',
            icon: '✅',
            title: 'Excellent Package Health',
            description: `${updateRate}% of packages are up to date. Great job maintaining dependencies!`
        });
    } else if (updateRate >= 50) {
        insights.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Moderate Package Health',
            description: `${updateRate}% of packages are up to date. Consider updating outdated packages.`
        });
    } else {
        insights.push({
            type: 'warning',
            icon: '🔴',
            title: 'Low Package Health',
            description: `Only ${updateRate}% of packages are up to date. Many packages need updates.`
        });
    }

    // Critical updates
    let criticalUpdates = 0;
    allData.forEach(repo => {
        if (repo.packages) {
            criticalUpdates += repo.packages.filter(pkg => pkg.updateType === 'major').length;
        }
    });

    if (criticalUpdates > 0) {
        insights.push({
            type: 'warning',
            icon: '🚨',
            title: 'Major Updates Available',
            description: `${criticalUpdates} package(s) have major version updates available. Review breaking changes before updating.`
        });
    }

    // Security vulnerabilities analysis
    let totalVulnerabilities = 0;
    let criticalVulns = 0;
    let highVulns = 0;
    let moderateVulns = 0;
    let reposWithVulns = 0;

    allData.forEach(repo => {
        const vulnData = repo.auditReport?.vulnerabilities?.metadata?.vulnerabilities;
        if (vulnData && vulnData.total > 0) {
            reposWithVulns++;
            totalVulnerabilities += vulnData.total || 0;
            criticalVulns += vulnData.critical || 0;
            highVulns += vulnData.high || 0;
            moderateVulns += vulnData.moderate || 0;
        }
    });

    // Add vulnerability insights
    if (totalVulnerabilities === 0) {
        insights.push({
            type: 'success',
            icon: '🔒',
            title: 'No Security Vulnerabilities',
            description: 'All repositories are free from known security vulnerabilities. Excellent security posture!'
        });
    } else if (criticalVulns > 0 || highVulns > 0) {
        const criticalHighCount = criticalVulns + highVulns;
        insights.push({
            type: 'error',
            icon: '🚨',
            title: 'Critical Security Issues Detected',
            description: `Found ${criticalHighCount} critical/high severity vulnerabilities across ${reposWithVulns} repository(ies). Immediate action required!`
        });
    } else if (moderateVulns > 0) {
        insights.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Security Vulnerabilities Found',
            description: `Found ${totalVulnerabilities} vulnerabilities (${moderateVulns} moderate) across ${reposWithVulns} repository(ies). Review and patch recommended.`
        });
    }

    // Detailed vulnerability breakdown if any exist
    if (totalVulnerabilities > 0) {
        const vulnBreakdown = [];
        if (criticalVulns > 0) vulnBreakdown.push(`${criticalVulns} critical`);
        if (highVulns > 0) vulnBreakdown.push(`${highVulns} high`);
        if (moderateVulns > 0) vulnBreakdown.push(`${moderateVulns} moderate`);
        
        insights.push({
            type: 'info',
            icon: '📊',
            title: 'Vulnerability Breakdown',
            description: `Total: ${totalVulnerabilities} vulnerabilities - ${vulnBreakdown.join(', ')}. Check the Repositories tab for detailed CVE information.`
        });
    }

    // Repository comparison
    const bestRepo = stats.repoStats?.reduce((best, repo) => {
        const score = repo.total > 0 ? (repo.upToDate / repo.total) : 0;
        const bestScore = best.total > 0 ? (best.upToDate / best.total) : 0;
        return score > bestScore ? repo : best;
    }, stats.repoStats[0]);

    if (bestRepo) {
        const score = bestRepo.total > 0
            ? ((bestRepo.upToDate / bestRepo.total) * 100).toFixed(0)
            : 0;
        
        insights.push({
            type: 'success',
            icon: '🏆',
            title: 'Best Maintained Repository',
            description: `${bestRepo.name} has the highest update rate at ${score}%.`
        });
    }

    return insights;
}

// UI Helper Functions
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('error').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('error').style.display = 'flex';
    document.getElementById('errorMessage').textContent = message;
}

function updateLastUpdated(timestamp) {
    const date = new Date(timestamp);
    const formatted = date.toLocaleString();
    document.getElementById('updateTime').textContent = formatted;
}

// Make functions available globally
window.togglePackages = togglePackages;
window.toggleVulnerabilities = toggleVulnerabilities;

// Made with Bob
