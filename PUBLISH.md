# Publishing to npm

## Pre-publication Checklist

1. ✅ Update package.json with proper metadata
2. ✅ Create CLI entry point (`src/cli.ts`)
3. ✅ Add .npmignore file
4. ✅ Update README with npm installation instructions
5. ✅ Add LICENSE file
6. ✅ Add postinstall script for automatic migration

## Publishing Steps

### 1. Build the Project

```bash
bun run build
```

### 2. Test the Package Locally

```bash
# Test the CLI
bun run dist/cli.js --help

# Test the server
bun run dist/index.js
```

### 3. Login to npm

```bash
npm login
```

### 4. Publish to npm

```bash
npm publish
```

### 5. Verify Installation

```bash
# Install globally
npm install -g code-guider-mcp

# Test the global command
code-guider-mcp --help
```

## Post-publication

### Update Documentation

- Update GitHub repository URL in package.json
- Update README with actual npm package name
- Add installation badges

### Version Management

```bash
# Patch version (bug fixes)
npm version patch

# Minor version (new features)
npm version minor

# Major version (breaking changes)
npm version major
```

## Benefits of npm Publication

### For Users (Much Easier)

```bash
# Before (Complex)
git clone <repo>
cd code-guider
bun install
bun run build
bun run migrate
bun run start

# After (Simple)
npm install -g code-guider-mcp
code-guider-mcp
```

### For MCP Client Configuration

```json
// Before (Complex)
{
  "mcpServers": {
    "code-guidance": {
      "command": "bun",
      "args": ["run", "dist/index.js"],
      "cwd": "/path/to/code-guider"
    }
  }
}

// After (Simple)
{
  "mcpServers": {
    "code-guidance": {
      "command": "code-guider-mcp"
    }
  }
}
```

## Package Features

- **Global CLI**: `code-guider-mcp` command available globally
- **Auto-migration**: Database setup runs automatically on install
- **Multiple commands**: `--migrate`, `--studio`, `--help`, etc.
- **Zero-config**: Works out of the box
- **Cross-platform**: Works on Windows, macOS, and Linux
