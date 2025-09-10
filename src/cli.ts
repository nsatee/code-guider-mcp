#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { ProjectManager } from './project-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function showHelp() {
  console.log(
    chalk.cyan(`
Code Guider MCP Server - AI-Powered Code Guidance

Usage:
  code-guider-mcp [options] [project-path]

Options:
  --help, -h          Show this help message
  --version, -v       Show version number
  --port, -p <port>   Specify port number (default: 3000)
  --host <host>       Specify host address (default: localhost)
  --migrate           Run database migration only
  --studio            Open database studio
  --init              Initialize project (auto-detect type)
  --global            Use global storage (no project context)
  --list-projects     List all projects
  --verbose           Enable verbose logging

Project Modes:
  Local Project       # Use project-specific database
  Global Mode         # Use global database (--global)
  Auto-detect         # Automatically detect project type

Examples:
  code-guider-mcp                           # Auto-detect current project
  code-guider-mcp /path/to/project          # Use specific project
  code-guider-mcp --global                  # Use global storage
  code-guider-mcp --init                    # Initialize current project
  code-guider-mcp --list-projects           # List all projects
  code-guider-mcp --port 8080               # Start on port 8080
  code-guider-mcp --studio                  # Open database studio

For more information, visit: https://github.com/yourusername/code-guider
`),
  );
}

function showVersion() {
  const packageJson = require('../package.json');
  console.log(packageJson.version);
}

async function runMigration() {
  console.log(chalk.yellow('🔄 Running database migration...'));

  const migratePath = join(__dirname, 'migrate.js');
  const migrateProcess = spawn('node', [migratePath], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  migrateProcess.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('✅ Migration completed successfully'));
    } else {
      console.error(chalk.red('❌ Migration failed'));
      process.exit(1);
    }
  });
}

async function openStudio() {
  console.log(chalk.yellow('🔄 Opening database studio...'));

  const studioProcess = spawn('bunx', ['drizzle-kit', 'studio'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  studioProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(chalk.red('❌ Failed to open database studio'));
      process.exit(1);
    }
  });
}

async function startServer(options: {
  port?: string;
  host?: string;
  verbose?: boolean;
  global?: boolean;
  projectPath?: string;
}) {
  console.log(chalk.cyan('🚀 Starting Code Guider MCP Server...'));

  const projectManager = ProjectManager.getInstance();
  let projectInfo = null;

  // Determine project context
  if (options.global) {
    console.log(chalk.yellow('🌍 Using global storage mode'));
  } else {
    const targetPath = options.projectPath || process.cwd();
    projectInfo = await projectManager.getProjectInfo(targetPath);

    if (!projectInfo) {
      console.log(chalk.yellow(`⚠️  Project not initialized at: ${targetPath}`));
      console.log(chalk.cyan('💡 Run with --init to initialize this project'));
      console.log(chalk.cyan('   Or use --global to use global storage'));
      process.exit(1);
    }

    console.log(
      chalk.green(
        `📁 Using project: ${projectInfo.name} (${projectInfo.type})`,
      ),
    );
  }

  if (options.verbose) {
    console.log(chalk.gray(`Port: ${options.port || '3000'}`));
    console.log(chalk.gray(`Host: ${options.host || 'localhost'}`));
    console.log(chalk.gray(`Mode: ${options.global ? 'Global' : 'Project'}`));
    if (projectInfo) {
      console.log(chalk.gray(`Project Path: ${projectInfo.path}`));
    }
  }

  const serverPath = join(__dirname, 'index.js');
  const serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: options.port || '3000',
      HOST: options.host || 'localhost',
      VERBOSE: options.verbose ? 'true' : 'false',
      PROJECT_PATH: projectInfo?.path || '',
      GLOBAL_MODE: options.global ? 'true' : 'false',
    },
  });

  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(chalk.red('❌ Server stopped with error'));
      process.exit(1);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Shutting down server...'));
    serverProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n🛑 Shutting down server...'));
    serverProcess.kill('SIGTERM');
  });
}

async function listProjects() {
  console.log(chalk.cyan('📋 Listing all projects...'));

  const projectManager = ProjectManager.getInstance();
  const projects = await projectManager.listProjects();

  if (projects.length === 0) {
    console.log(
      chalk.yellow('No projects found. Use --init to initialize a project.'),
    );
    return;
  }

  console.log(chalk.green(`Found ${projects.length} project(s):\n`));

  for (const project of projects) {
    console.log(chalk.cyan(`📁 ${project.name}`));
    console.log(`   Path: ${project.path}`);
    console.log(`   Type: ${project.type}`);
    console.log(`   Frameworks: ${project.frameworks.join(', ') || 'None'}`);
    console.log(`   Languages: ${project.languages.join(', ') || 'None'}`);
    console.log(
      `   Last Used: ${new Date(project.lastUsed).toLocaleDateString()}`,
    );
    console.log('');
  }
}

async function initializeProject(projectPath?: string) {
  const targetPath = projectPath || process.cwd();
  console.log(chalk.cyan(`🚀 Initializing project at: ${targetPath}`));

  const projectManager = ProjectManager.getInstance();

  try {
    const projectInfo = await projectManager.initializeProject(targetPath);

    console.log(chalk.green('✅ Project initialized successfully!'));
    console.log(chalk.cyan(`📁 Project: ${projectInfo.name}`));
    console.log(chalk.cyan(`🔧 Type: ${projectInfo.type}`));
    console.log(
      chalk.cyan(
        `⚡ Frameworks: ${projectInfo.frameworks.join(', ') || 'None'}`,
      ),
    );
    console.log(
      chalk.cyan(`💻 Languages: ${projectInfo.languages.join(', ') || 'None'}`),
    );
    console.log(
      chalk.gray(
        `\n💡 Project database created at: ${targetPath}/.guidance/guidance.db`,
      ),
    );
    console.log(
      chalk.gray(
        `   Global templates and workflows have been synced to this project.`,
      ),
    );
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize project:'), error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options: {
    port?: string;
    host?: string;
    verbose?: boolean;
    global?: boolean;
    projectPath?: string;
  } = {};
  let command = 'start';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        return;

      case '--version':
      case '-v':
        showVersion();
        return;

      case '--port':
      case '-p':
        options.port = args[++i];
        break;

      case '--host':
        options.host = args[++i];
        break;

      case '--migrate':
        command = 'migrate';
        break;

      case '--studio':
        command = 'studio';
        break;

      case '--init':
        command = 'init';
        break;

      case '--global':
        options.global = true;
        break;

      case '--list-projects':
        command = 'list-projects';
        break;

      case '--verbose':
        options.verbose = true;
        break;

      default:
        if (arg.startsWith('-')) {
          console.error(chalk.red(`Unknown option: ${arg}`));
          console.log('Use --help for usage information');
          process.exit(1);
        } else {
          // Treat as project path
          options.projectPath = arg;
        }
        break;
    }
  }

  try {
    switch (command) {
      case 'migrate':
        await runMigration();
        break;

      case 'studio':
        await openStudio();
        break;

      case 'init':
        await initializeProject(options.projectPath);
        break;

      case 'list-projects':
        await listProjects();
        break;
      default:
        await startServer(options);
        break;
    }
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
