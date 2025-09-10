#!/usr/bin/env bun

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const releaseType = args[0] || 'patch'; // patch, minor, major

if (!['patch', 'minor', 'major'].includes(releaseType)) {
  console.error('❌ Invalid release type. Use: patch, minor, or major');
  process.exit(1);
}

console.log(`🚀 Starting ${releaseType} release...`);

try {
  // 1. Run tests
  console.log('🧪 Running tests...');
  execSync('bun test', { stdio: 'inherit' });
  
  // 2. Build project
  console.log('🔨 Building project...');
  execSync('bun run build', { stdio: 'inherit' });
  
  // 3. Update version
  console.log(`📦 Updating version (${releaseType})...`);
  execSync(`bun version ${releaseType}`, { stdio: 'inherit' });
  
  // 4. Get new version
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const newVersion = packageJson.version;
  
  console.log(`✅ Version updated to ${newVersion}`);
  
  // 5. Commit and push
  console.log('📝 Committing changes...');
  execSync('git add package.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  
  // 6. Create and push tag
  console.log('🏷️ Creating tag...');
  execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
  execSync(`git push origin v${newVersion}`, { stdio: 'inherit' });
  
  console.log(`🎉 Release ${newVersion} created and pushed!`);
  console.log(`📦 GitHub Actions will now publish to NPM automatically.`);
  
} catch (error) {
  console.error('❌ Release failed:', error.message);
  process.exit(1);
}
