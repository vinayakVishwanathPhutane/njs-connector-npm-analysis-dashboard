import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runScript(scriptPath, scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Running ${scriptName}...`);
    console.log('='.repeat(60));

    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${scriptName} exited with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log('\n🎯 NPM Package Analytics Dashboard');
  console.log('Starting complete analysis pipeline...\n');

  try {
    // Step 1: Analyze repositories
    await runScript(
      path.join(__dirname, 'analyzer.js'),
      'Repository Analyzer'
    );

    // Step 2: Check package versions
    await runScript(
      path.join(__dirname, 'version-checker.js'),
      'Version Checker'
    );

    console.log('\n' + '='.repeat(60));
    console.log('✅ Complete analysis pipeline finished successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 You can now start the dashboard server with:');
    console.log('   npm run serve');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    process.exit(1);
  }
}

main();

// Made with Bob
