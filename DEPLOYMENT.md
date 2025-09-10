# Deployment Guide

This guide explains how to set up automatic deployment to NPM when pushing to GitHub.

## Setup Steps

### 1. Create GitHub Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit"

# Add remote repository
git remote add origin https://github.com/yourusername/code-guider.git

# Push to GitHub
git push -u origin main
```

### 2. Set up NPM Token

1. Go to [NPM](https://www.npmjs.com/settings/tokens)
2. Create a new "Automation" token
3. Copy the token
4. Go to your GitHub repository → Settings → Secrets and variables → Actions
5. Add a new secret named `NPM_TOKEN` with your token value

### 3. Configure GitHub Actions

The repository includes two GitHub Actions workflows:

#### `publish.yml` - Manual/Tag-based Publishing

- Triggers on pushes to `main` branch
- Triggers on version tags (`v*`)
- Can be triggered manually
- Publishes to NPM

#### `auto-release.yml` - Automatic Versioning

- Triggers on pushes to `main` branch
- Automatically bumps version if `package.json` changes
- Creates git tags
- Publishes to NPM

## Usage

### Option 1: Manual Release

```bash
# Create a patch release (1.0.0 → 1.0.1)
bun run release:patch

# Create a minor release (1.0.0 → 1.1.0)
bun run release:minor

# Create a major release (1.0.0 → 2.0.0)
bun run release:major

# Or just patch (default)
bun run release
```

### Option 2: Direct Push (Auto-release)

```bash
# Make changes to package.json
# Push to main branch
git add .
git commit -m "feat: add new feature"
git push origin main

# GitHub Actions will automatically:
# 1. Detect package.json changes
# 2. Bump version
# 3. Create tag
# 4. Publish to NPM
```

### Option 3: Tag-based Release

```bash
# Create and push a tag
git tag v1.0.1
git push origin v1.0.1

# GitHub Actions will publish to NPM
```

## Workflow Details

### What Happens on Push

1. **Tests run** - Ensures code quality
2. **Project builds** - Creates production files
3. **Version bumps** (if auto-release enabled)
4. **Publishes to NPM** - Makes package available
5. **Creates GitHub release** (on tags)

### What Gets Published

- Built JavaScript files (`dist/`)
- Database migrations (`drizzle/`)
- Documentation (`README.md`, `LICENSE`)
- Package metadata (`package.json`)

### Environment Variables

- `NPM_TOKEN` - NPM authentication token
- `GITHUB_TOKEN` - Automatically provided by GitHub

## Troubleshooting

### Common Issues

1. **NPM Token Invalid**
   - Check token permissions
   - Ensure token is "Automation" type
   - Verify token is correctly set in GitHub Secrets

2. **Build Fails**
   - Check Bun version compatibility
   - Ensure all dependencies are in `package.json`
   - Run `bun install` locally to test

3. **Version Already Exists**
   - Check if version already published
   - Use different version number
   - Delete tag if needed: `git tag -d v1.0.1 && git push origin :refs/tags/v1.0.1`

### Manual Override

If automatic deployment fails, you can always publish manually:

```bash
# Build and publish manually
bun run build
bun publish
```

## Security

- NPM token is stored securely in GitHub Secrets
- Token has minimal required permissions
- Workflows run in isolated environments
- No sensitive data is logged

## Monitoring

- Check GitHub Actions tab for workflow status
- Monitor NPM package page for new versions
- Set up notifications for failed deployments
