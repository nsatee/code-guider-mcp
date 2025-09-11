import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseConnection } from './db/connection.js';
import { HybridStorage } from './hybrid-storage.js';
import { MemoryRouter } from './memory-router.js';
import { MemoryRuleManager } from './memory-rule-manager.js';

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  type: 'react' | 'vue' | 'angular' | 'node' | 'python' | 'other';
  frameworks: string[];
  languages: string[];
  tools: string[];
  databases: string[];
  deployment: string[];
  createdAt: string;
  lastUsed: string;
}

export interface PackageJsonDependencies {
  [key: string]: string | undefined;
  // Common dependency keys for better type inference
  react?: string;
  vue?: string;
  '@angular/core'?: string;
  next?: string;
  nuxt?: string;
  svelte?: string;
  'solid-js'?: string;
  express?: string;
  fastify?: string;
  koa?: string;
  nest?: string;
  '@nestjs/core'?: string;
  vite?: string;
  webpack?: string;
  rollup?: string;
  esbuild?: string;
  parcel?: string;
  tailwindcss?: string;
  '@emotion/react'?: string;
  'styled-components'?: string;
  '@mui/material'?: string;
  '@chakra-ui/react'?: string;
  redux?: string;
  '@reduxjs/toolkit'?: string;
  zustand?: string;
  jotai?: string;
  recoil?: string;
  jest?: string;
  vitest?: string;
  '@testing-library/react'?: string;
  cypress?: string;
  playwright?: string;
  prisma?: string;
  mongoose?: string;
  '@prisma/client'?: string;
  typeorm?: string;
  sequelize?: string;
  'drizzle-orm'?: string;
  '@trpc/server'?: string;
  graphql?: string;
  'apollo-server'?: string;
  typescript?: string;
  '@babel/core'?: string;
  vercel?: string;
  netlify?: string;
  '@aws-sdk/client-s3'?: string;
}

export interface PackageJson {
  dependencies?: PackageJsonDependencies;
  devDependencies?: PackageJsonDependencies;
  peerDependencies?: PackageJsonDependencies;
  optionalDependencies?: PackageJsonDependencies;
}

export interface TemplateObject {
  [key: string]: unknown;
  tags?: string[];
  type?: string;
  name?: string;
  description?: string;
  content?: string;
  variables?: string[];
  frameworks?: string[];
  languages?: string[];
}

export interface WorkflowObject {
  [key: string]: unknown;
  tags?: string[];
  name?: string;
  description?: string;
  steps?: unknown[];
  qualityChecks?: string[];
  frameworks?: string[];
  languages?: string[];
}

export interface GlobalConfig {
  defaultProjectType: string;
  globalTemplates: string[];
  globalWorkflows: string[];
  autoDetectProject: boolean;
}

export class ProjectManager {
  private static instance: ProjectManager;
  private globalConfigPath: string;
  private projectsPath: string;
  private globalDbPath: string;

  private constructor() {
    this.globalConfigPath = join(homedir(), '.code-guider', 'config.json');
    this.projectsPath = join(homedir(), '.code-guider', 'projects');
    this.globalDbPath = join(homedir(), '.code-guider', 'global.db');
    this.ensureDirectories();
  }

  public static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  private ensureDirectories(): void {
    const dirs = [dirname(this.globalConfigPath), this.projectsPath, dirname(this.globalDbPath)];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Detect project type and create project info (Enhanced like Anubis)
   */
  public async detectProject(projectPath: string): Promise<ProjectInfo | null> {
    const resolvedPath = resolve(projectPath);

    if (!existsSync(resolvedPath)) {
      return null;
    }

    const projectInfo = this.initializeProjectInfo(resolvedPath);
    const configFiles = this.getConfigFilePaths(resolvedPath);

    // Detect Node.js/JavaScript projects
    if (existsSync(configFiles.packageJson)) {
      this.detectNodeProject(configFiles, projectInfo);
    }

    // Detect Python projects
    if (existsSync(configFiles.pyProject) || existsSync(configFiles.requirements)) {
      this.detectPythonProject(configFiles, projectInfo);
    }

    // Detect additional tools by config files
    this.detectConfigFileTools(configFiles, projectInfo);

    return projectInfo;
  }

  private initializeProjectInfo(resolvedPath: string): ProjectInfo {
    return {
      id: this.generateProjectId(resolvedPath),
      name: this.extractProjectName(resolvedPath),
      path: resolvedPath,
      type: 'other',
      frameworks: [],
      languages: [],
      tools: [],
      databases: [],
      deployment: [],
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
  }

  private getConfigFilePaths(resolvedPath: string) {
    return {
      packageJson: join(resolvedPath, 'package.json'),
      pyProject: join(resolvedPath, 'pyproject.toml'),
      requirements: join(resolvedPath, 'requirements.txt'),
      tsConfig: join(resolvedPath, 'tsconfig.json'),
      tailwindConfig: join(resolvedPath, 'tailwind.config.js'),
      prismaSchema: join(resolvedPath, 'prisma', 'schema.prisma'),
      dockerfile: join(resolvedPath, 'Dockerfile'),
      dockerCompose: join(resolvedPath, 'docker-compose.yml'),
    };
  }

  private detectNodeProject(
    configFiles: ReturnType<typeof this.getConfigFilePaths>,
    projectInfo: ProjectInfo
  ) {
    try {
      const packageJson = JSON.parse(readFileSync(configFiles.packageJson, 'utf8')) as PackageJson;

      const dependencies: PackageJsonDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
        ...packageJson.optionalDependencies,
      };

      this.detectFrontendFrameworks(dependencies, projectInfo);
      this.detectBackendFrameworks(dependencies, projectInfo);
      this.detectBuildTools(dependencies, projectInfo);
      this.detectCssFrameworks(dependencies, projectInfo);
      this.detectStateManagement(dependencies, projectInfo);
      this.detectTestingFrameworks(dependencies, projectInfo);
      this.detectDatabases(dependencies, projectInfo);
      this.detectApiTools(dependencies, projectInfo);
      this.detectLanguages(dependencies, configFiles, projectInfo);
      this.detectDeployment(dependencies, projectInfo);
    } catch (error) {
      console.warn('Failed to parse package.json:', error);
    }
  }

  private detectFrontendFrameworks(
    dependencies: PackageJsonDependencies,
    projectInfo: ProjectInfo
  ) {
    const frontendFrameworks = {
      react: 'react',
      vue: 'vue',
      '@angular/core': 'angular',
      next: 'next',
      nuxt: 'nuxt',
      svelte: 'svelte',
      'solid-js': 'solid-js',
    };

    for (const [dep, framework] of Object.entries(frontendFrameworks)) {
      if (dependencies[dep]) {
        if (['react', 'vue', 'angular'].includes(framework)) {
          projectInfo.type = framework as ProjectInfo['type'];
        }
        projectInfo.frameworks.push(framework);
      }
    }
  }

  private detectBackendFrameworks(dependencies: PackageJsonDependencies, projectInfo: ProjectInfo) {
    const backendFrameworks = {
      express: 'express',
      fastify: 'fastify',
      koa: 'koa',
      nest: 'nestjs',
      '@nestjs/core': 'nestjs',
    };

    for (const [dep, framework] of Object.entries(backendFrameworks)) {
      if (dependencies[dep]) {
        projectInfo.frameworks.push(framework);
      }
    }
  }

  private detectBuildTools(dependencies: PackageJsonDependencies, projectInfo: ProjectInfo) {
    const buildTools = {
      vite: 'vite',
      webpack: 'webpack',
      rollup: 'rollup',
      esbuild: 'esbuild',
      parcel: 'parcel',
    };

    for (const [dep, tool] of Object.entries(buildTools)) {
      if (dependencies[dep]) {
        projectInfo.tools.push(tool);
      }
    }
  }

  private detectCssFrameworks(dependencies: PackageJsonDependencies, projectInfo: ProjectInfo) {
    const cssFrameworks = {
      tailwindcss: 'tailwindcss',
      '@emotion/react': 'emotion',
      'styled-components': 'styled-components',
      '@mui/material': 'mui',
      '@chakra-ui/react': 'chakra-ui',
    };

    for (const [dep, tool] of Object.entries(cssFrameworks)) {
      if (dependencies[dep]) {
        projectInfo.tools.push(tool);
      }
    }
  }

  private detectStateManagement(dependencies: PackageJsonDependencies, projectInfo: ProjectInfo) {
    const stateManagement = {
      redux: 'redux',
      '@reduxjs/toolkit': 'redux-toolkit',
      zustand: 'zustand',
      jotai: 'jotai',
      recoil: 'recoil',
    };

    for (const [dep, tool] of Object.entries(stateManagement)) {
      if (dependencies[dep]) {
        projectInfo.tools.push(tool);
      }
    }
  }

  private detectTestingFrameworks(dependencies: PackageJsonDependencies, projectInfo: ProjectInfo) {
    const testingFrameworks = {
      jest: 'jest',
      vitest: 'vitest',
      '@testing-library/react': 'testing-library',
      cypress: 'cypress',
      playwright: 'playwright',
    };

    for (const [dep, tool] of Object.entries(testingFrameworks)) {
      if (dependencies[dep]) {
        projectInfo.tools.push(tool);
      }
    }
  }

  private detectDatabases(dependencies: PackageJsonDependencies, projectInfo: ProjectInfo) {
    const databases = {
      prisma: 'prisma',
      mongoose: 'mongodb',
      '@prisma/client': 'prisma',
      typeorm: 'typeorm',
      sequelize: 'sequelize',
      'drizzle-orm': 'drizzle',
    };

    for (const [dep, db] of Object.entries(databases)) {
      if (dependencies[dep]) {
        projectInfo.databases.push(db);
      }
    }
  }

  private detectApiTools(dependencies: PackageJsonDependencies, projectInfo: ProjectInfo) {
    const apiTools = {
      '@trpc/server': 'trpc',
      graphql: 'graphql',
      'apollo-server': 'apollo',
    };

    for (const [dep, tool] of Object.entries(apiTools)) {
      if (dependencies[dep]) {
        projectInfo.tools.push(tool);
      }
    }
  }

  private detectLanguages(
    dependencies: PackageJsonDependencies,
    configFiles: ReturnType<typeof this.getConfigFilePaths>,
    projectInfo: ProjectInfo
  ) {
    if (dependencies.typescript || existsSync(configFiles.tsConfig)) {
      projectInfo.languages.push('typescript');
    }
    if (dependencies['@babel/core']) {
      projectInfo.languages.push('javascript');
    }
  }

  private detectDeployment(dependencies: PackageJsonDependencies, projectInfo: ProjectInfo) {
    const deployment = {
      vercel: 'vercel',
      netlify: 'netlify',
      '@aws-sdk/client-s3': 'aws',
    };

    for (const [dep, platform] of Object.entries(deployment)) {
      if (dependencies[dep]) {
        projectInfo.deployment.push(platform);
      }
    }
  }

  private detectPythonProject(
    configFiles: ReturnType<typeof this.getConfigFilePaths>,
    projectInfo: ProjectInfo
  ) {
    projectInfo.type = 'python';
    projectInfo.languages.push('python');

    if (existsSync(configFiles.requirements)) {
      try {
        const requirements = readFileSync(configFiles.requirements, 'utf8');
        const pythonFrameworks = {
          django: 'django',
          flask: 'flask',
          fastapi: 'fastapi',
        };

        for (const [framework, name] of Object.entries(pythonFrameworks)) {
          if (requirements.includes(framework)) {
            projectInfo.frameworks.push(name);
          }
        }

        if (requirements.includes('pytest')) {
          projectInfo.tools.push('pytest');
        }
      } catch (error) {
        console.warn('Failed to parse requirements.txt:', error);
      }
    }
  }

  private detectConfigFileTools(
    configFiles: ReturnType<typeof this.getConfigFilePaths>,
    projectInfo: ProjectInfo
  ) {
    if (existsSync(configFiles.tailwindConfig)) {
      projectInfo.tools.push('tailwindcss');
    }
    if (existsSync(configFiles.prismaSchema)) {
      projectInfo.databases.push('prisma');
    }
    if (existsSync(configFiles.dockerfile)) {
      projectInfo.deployment.push('docker');
    }
    if (existsSync(configFiles.dockerCompose)) {
      projectInfo.deployment.push('docker-compose');
    }
  }

  /**
   * Initialize project with local database
   */
  public async initializeProject(projectPath: string): Promise<ProjectInfo> {
    const projectInfo = await this.detectProject(projectPath);
    if (!projectInfo) {
      throw new Error('Could not detect project type');
    }

    // Create local database
    const localDbPath = join(projectPath, '.guidance', 'guidance.db');
    const _dbConnection = await DatabaseConnection.getInstance(localDbPath);

    // Initialize local storage
    const _localStorage = await HybridStorage.create(localDbPath);

    // Save project info
    await this.saveProjectInfo(projectInfo);

    // Copy global templates and workflows to local if needed
    await this.syncGlobalToLocal(projectInfo);

    // Initialize memory rules for the project
    await this.initializeProjectMemoryRules(projectInfo);

    return projectInfo;
  }

  /**
   * Get project storage (local or global)
   */
  public async getProjectStorage(projectPath?: string): Promise<HybridStorage> {
    if (projectPath) {
      const localDbPath = join(projectPath, '.guidance', 'guidance.db');
      // Ensure database connection is initialized
      await DatabaseConnection.getInstance(localDbPath);
      return await HybridStorage.create(localDbPath);
    }
    // Ensure database connection is initialized
    await DatabaseConnection.getInstance(this.globalDbPath);
    return await HybridStorage.create(this.globalDbPath);
  }

  /**
   * Get global storage
   */
  public async getGlobalStorage(): Promise<HybridStorage> {
    // Ensure database connection is initialized
    await DatabaseConnection.getInstance(this.globalDbPath);
    return await HybridStorage.create(this.globalDbPath);
  }

  /**
   * List all projects
   */
  public async listProjects(): Promise<ProjectInfo[]> {
    const projectsFile = join(this.projectsPath, 'projects.json');
    if (!existsSync(projectsFile)) {
      return [];
    }

    try {
      const data = readFileSync(projectsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to read projects file:', error);
      return [];
    }
  }

  /**
   * Get project info by path
   */
  public async getProjectInfo(projectPath: string): Promise<ProjectInfo | null> {
    const projects = await this.listProjects();
    const resolvedPath = resolve(projectPath);
    return projects.find((p) => resolve(p.path) === resolvedPath) || null;
  }

  /**
   * Save project info
   */
  private async saveProjectInfo(projectInfo: ProjectInfo): Promise<void> {
    const projects = await this.listProjects();
    const existingIndex = projects.findIndex((p) => p.id === projectInfo.id);

    if (existingIndex >= 0) {
      projects[existingIndex] = {
        ...projectInfo,
        lastUsed: new Date().toISOString(),
      };
    } else {
      projects.push(projectInfo);
    }

    const projectsFile = join(this.projectsPath, 'projects.json');
    writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
  }

  /**
   * Sync global templates and workflows to local project
   */
  private async syncGlobalToLocal(projectInfo: ProjectInfo): Promise<void> {
    const globalStorage = await this.getGlobalStorage();
    const localStorage = await this.getProjectStorage(projectInfo.path);

    // Copy global templates
    const globalTemplates = await globalStorage.listTemplates();
    for (const template of globalTemplates) {
      // Check if template is applicable to this project type
      if (this.isTemplateApplicable(template as unknown as TemplateObject, projectInfo)) {
        await localStorage.saveTemplate(template);
      }
    }

    // Copy global workflows
    const globalWorkflows = await globalStorage.listWorkflows();
    for (const workflow of globalWorkflows) {
      if (this.isWorkflowApplicable(workflow as unknown as WorkflowObject, projectInfo)) {
        await localStorage.saveWorkflow(workflow);
      }
    }
  }

  /**
   * Check if template is applicable to project
   */
  private isTemplateApplicable(template: TemplateObject, project: ProjectInfo): boolean {
    const templateTags = template.tags || [];
    return templateTags.some(
      (tag: string) =>
        project.frameworks.includes(tag) || project.languages.includes(tag) || project.type === tag
    );
  }

  /**
   * Check if workflow is applicable to project
   */
  private isWorkflowApplicable(workflow: WorkflowObject, project: ProjectInfo): boolean {
    const workflowTags = workflow.tags || [];
    return workflowTags.some(
      (tag: string) =>
        project.frameworks.includes(tag) || project.languages.includes(tag) || project.type === tag
    );
  }

  /**
   * Generate project ID from path
   */
  private generateProjectId(projectPath: string): string {
    const pathHash = Buffer.from(projectPath)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 16);
    return `proj_${pathHash}`;
  }

  /**
   * Extract project name from path
   */
  private extractProjectName(projectPath: string): string {
    const parts = projectPath.split('/');
    return parts[parts.length - 1] || 'unknown';
  }

  /**
   * Get global configuration
   */
  public getGlobalConfig(): GlobalConfig {
    if (!existsSync(this.globalConfigPath)) {
      const defaultConfig: GlobalConfig = {
        defaultProjectType: 'react',
        globalTemplates: [],
        globalWorkflows: [],
        autoDetectProject: true,
      };
      this.saveGlobalConfig(defaultConfig);
      return defaultConfig;
    }

    try {
      const data = readFileSync(this.globalConfigPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to read global config:', error);
      return this.getGlobalConfig(); // Return default
    }
  }

  /**
   * Save global configuration
   */
  public saveGlobalConfig(config: GlobalConfig): void {
    writeFileSync(this.globalConfigPath, JSON.stringify(config, null, 2));
  }

  /**
   * Check if project is initialized
   */
  public isProjectInitialized(projectPath: string): boolean {
    const localDbPath = join(projectPath, '.guidance', 'guidance.db');
    return existsSync(localDbPath);
  }

  /**
   * Get current working directory project
   */
  public async getCurrentProject(): Promise<ProjectInfo | null> {
    const cwd = process.cwd();
    return await this.getProjectInfo(cwd);
  }

  /**
   * Initialize memory rules for a project
   */
  private async initializeProjectMemoryRules(projectInfo: ProjectInfo): Promise<void> {
    try {
      const globalStorage = await this.getGlobalStorage();
      const localStorage = await this.getProjectStorage(projectInfo.path);

      // Create memory router and rule manager
      const memoryRouter = new MemoryRouter(this, globalStorage);
      await memoryRouter.setProjectContext(projectInfo.path);

      const memoryRuleManager = new MemoryRuleManager(memoryRouter, this);

      // Initialize project-specific memory rules
      await memoryRuleManager.initializeProjectRules(projectInfo.path, projectInfo.type);

      // Save the rules to both global and project storage
      const rules = memoryRuleManager.getRules();
      for (const rule of rules) {
        if (rule.scope === 'global') {
          await globalStorage.saveMemoryRule(rule);
        } else {
          await localStorage.saveMemoryRule(rule);
        }
      }
    } catch (error) {
      console.warn('Failed to initialize memory rules for project:', error);
      // Don't throw error as this is not critical for project initialization
    }
  }
}
