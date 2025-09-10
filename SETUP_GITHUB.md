# GitHub Setup Instructions

Before deploying, you need to update the GitHub URLs in `package.json` with your actual GitHub repository information.

## Required Changes

### 1. Update Repository URLs

Replace `yourusername` with your actual GitHub username in these fields:

```json
{
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com",
    "url": "https://github.com/YOUR_GITHUB_USERNAME"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YOUR_GITHUB_USERNAME/code-guider.git"
  },
  "homepage": "https://github.com/YOUR_GITHUB_USERNAME/code-guider#readme",
  "bugs": {
    "url": "https://github.com/YOUR_GITHUB_USERNAME/code-guider/issues"
  },
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/YOUR_GITHUB_USERNAME"
  }
}
```

### 2. Update Author Information

Replace with your actual information:

```json
{
  "author": {
    "name": "Your Real Name",
    "email": "your.real.email@example.com",
    "url": "https://github.com/YOUR_GITHUB_USERNAME"
  }
}
```

## Quick Setup Script

You can use this script to quickly update all URLs:

```bash
# Replace YOUR_GITHUB_USERNAME with your actual username
sed -i 's/yourusername/YOUR_GITHUB_USERNAME/g' package.json

# Replace YOUR_EMAIL with your actual email
sed -i 's/your.email@example.com/YOUR_EMAIL/g' package.json

# Replace Your Name with your actual name
sed -i 's/Your Name/YOUR_REAL_NAME/g' package.json
```

## What This Enables

Once you update these URLs, NPM will display:

✅ **Repository Link** - Direct link to your GitHub repo
✅ **Homepage Link** - Link to your README
✅ **Bug Reports** - Link to GitHub issues
✅ **Author Info** - Your name and GitHub profile
✅ **Funding** - Link to GitHub Sponsors (if you have one)

## Example

If your GitHub username is `johndoe`, your URLs should look like:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/johndoe/code-guider.git"
  },
  "homepage": "https://github.com/johndoe/code-guider#readme",
  "bugs": {
    "url": "https://github.com/johndoe/code-guider/issues"
  }
}
```

## After Updating

1. Commit your changes:

   ```bash
   git add package.json
   git commit -m "chore: update GitHub URLs"
   ```

2. Test the release:

   ```bash
   bun run release:patch
   ```

3. Check NPM page to verify links work correctly
