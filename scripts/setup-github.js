#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: bun scripts/setup-github.js <username> <email> <name>');
  console.log('Example: bun scripts/setup-github.js johndoe john@example.com "John Doe"');
  process.exit(1);
}

const [username, email, name] = args;

console.log('🔧 Setting up GitHub URLs...');
console.log(`Username: ${username}`);
console.log(`Email: ${email}`);
console.log(`Name: ${name}`);

try {
  // Read package.json
  const packagePath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

  // Update URLs
  packageJson.author = {
    name: name,
    email: email,
    url: `https://github.com/${username}`
  };

  packageJson.repository = {
    type: 'git',
    url: `git+https://github.com/${username}/code-guider.git`
  };

  packageJson.homepage = `https://github.com/${username}/code-guider#readme`;

  packageJson.bugs = {
    url: `https://github.com/${username}/code-guider/issues`
  };

  packageJson.funding = {
    type: 'github',
    url: `https://github.com/sponsors/${username}`
  };

  // Write back to package.json
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log('✅ GitHub URLs updated successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. git add package.json');
  console.log('2. git commit -m "chore: update GitHub URLs"');
  console.log('3. git push origin main');
  console.log('4. bun run release:patch');

} catch (error) {
  console.error('❌ Error updating package.json:', error.message);
  process.exit(1);
}
