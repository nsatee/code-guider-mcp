import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
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
    const dirs = [
      dirname(this.globalConfigPath),
      this.projectsPath,
      dirname(this.globalDbPath),
    ];

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

    // Check for project indicators
    const packageJsonPath = join(resolvedPath, 'package.json');
    const pyProjectPath = join(resolvedPath, 'pyproject.toml');
    const requirementsPath = join(resolvedPath, 'requirements.txt');
    const tsConfigPath = join(resolvedPath, 'tsconfig.json');
    const nextConfigPath = join(resolvedPath, 'next.config.js');
    const vueConfigPath = join(resolvedPath, 'vue.config.js');
    const angularJsonPath = join(resolvedPath, 'angular.json');
    const viteConfigPath = join(resolvedPath, 'vite.config.js');
    const webpackConfigPath = join(resolvedPath, 'webpack.config.js');
    const tailwindConfigPath = join(resolvedPath, 'tailwind.config.js');
    const prismaSchemaPath = join(resolvedPath, 'prisma', 'schema.prisma');
    const dockerfilePath = join(resolvedPath, 'Dockerfile');
    const dockerComposePath = join(resolvedPath, 'docker-compose.yml');

    let projectType: ProjectInfo['type'] = 'other';
    let frameworks: string[] = [];
    let languages: string[] = [];
    let tools: string[] = [];
    let databases: string[] = [];
    let deployment: string[] = [];

    // Detect based on files
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        // Detect frontend frameworks
        if (dependencies['react']) {
          projectType = 'react';
          frameworks.push('react');
        }
        if (dependencies['vue']) {
          projectType = 'vue';
          frameworks.push('vue');
        }
        if (dependencies['@angular/core']) {
          projectType = 'angular';
          frameworks.push('angular');
        }
        if (dependencies['next']) {
          frameworks.push('next');
        }
        if (dependencies['nuxt']) {
          frameworks.push('nuxt');
        }
        if (dependencies['svelte']) {
          frameworks.push('svelte');
        }
        if (dependencies['solid-js']) {
          frameworks.push('solid-js');
        }

        // Detect backend frameworks
        if (dependencies['express']) {
          frameworks.push('express');
        }
        if (dependencies['fastify']) {
          frameworks.push('fastify');
        }
        if (dependencies['koa']) {
          frameworks.push('koa');
        }
        if (dependencies['nest']) {
          frameworks.push('nestjs');
        }
        if (dependencies['@nestjs/core']) {
          frameworks.push('nestjs');
        }

        // Detect build tools
        if (dependencies['vite']) {
          tools.push('vite');
        }
        if (dependencies['webpack']) {
          tools.push('webpack');
        }
        if (dependencies['rollup']) {
          tools.push('rollup');
        }
        if (dependencies['esbuild']) {
          tools.push('esbuild');
        }
        if (dependencies['parcel']) {
          tools.push('parcel');
        }

        // Detect CSS frameworks
        if (dependencies['tailwindcss']) {
          tools.push('tailwindcss');
        }
        if (dependencies['@emotion/react']) {
          tools.push('emotion');
        }
        if (dependencies['styled-components']) {
          tools.push('styled-components');
        }
        if (dependencies['@mui/material']) {
          tools.push('mui');
        }
        if (dependencies['@chakra-ui/react']) {
          tools.push('chakra-ui');
        }

        // Detect state management
        if (dependencies['redux']) {
          tools.push('redux');
        }
        if (dependencies['@reduxjs/toolkit']) {
          tools.push('redux-toolkit');
        }
        if (dependencies['zustand']) {
          tools.push('zustand');
        }
        if (dependencies['jotai']) {
          tools.push('jotai');
        }
        if (dependencies['recoil']) {
          tools.push('recoil');
        }

        // Detect testing frameworks
        if (dependencies['jest']) {
          tools.push('jest');
        }
        if (dependencies['vitest']) {
          tools.push('vitest');
        }
        if (dependencies['@testing-library/react']) {
          tools.push('testing-library');
        }
        if (dependencies['cypress']) {
          tools.push('cypress');
        }
        if (dependencies['playwright']) {
          tools.push('playwright');
        }

        // Detect databases
        if (dependencies['prisma']) {
          databases.push('prisma');
        }
        if (dependencies['mongoose']) {
          databases.push('mongodb');
        }
        if (dependencies['@prisma/client']) {
          databases.push('prisma');
        }
        if (dependencies['typeorm']) {
          databases.push('typeorm');
        }
        if (dependencies['sequelize']) {
          databases.push('sequelize');
        }
        if (dependencies['drizzle-orm']) {
          databases.push('drizzle');
        }

        // Detect API tools
        if (dependencies['@trpc/server']) {
          tools.push('trpc');
        }
        if (dependencies['graphql']) {
          tools.push('graphql');
        }
        if (dependencies['apollo-server']) {
          tools.push('apollo');
        }

        // Detect languages
        if (dependencies['typescript'] || existsSync(tsConfigPath)) {
          languages.push('typescript');
        }
        if (dependencies['@babel/core']) {
          languages.push('javascript');
        }

        // Detect deployment
        if (dependencies['vercel']) {
          deployment.push('vercel');
        }
        if (dependencies['netlify']) {
          deployment.push('netlify');
        }
        if (dependencies['@aws-sdk/client-s3']) {
          deployment.push('aws');
        }
      } catch (error) {
        console.warn('Failed to parse package.json:', error);
      }
    }

    // Detect Python projects
    if (existsSync(pyProjectPath) || existsSync(requirementsPath)) {
      projectType = 'python';
      languages.push('python');

      if (existsSync(requirementsPath)) {
        try {
          const requirements = readFileSync(requirementsPath, 'utf8');
          if (requirements.includes('django')) {
            frameworks.push('django');
          }
          if (requirements.includes('flask')) {
            frameworks.push('flask');
          }
          if (requirements.includes('fastapi')) {
            frameworks.push('fastapi');
          }
          if (requirements.includes('pytest')) {
            tools.push('pytest');
          }
        } catch (error) {
          console.warn('Failed to parse requirements.txt:', error);
        }
      }
    }

    // Detect additional tools by config files
    if (existsSync(tailwindConfigPath)) {
      tools.push('tailwindcss');
    }
    if (existsSync(prismaSchemaPath)) {
      databases.push('prisma');
    }
    if (existsSync(dockerfilePath)) {
      deployment.push('docker');
    }
    if (existsSync(dockerComposePath)) {
      deployment.push('docker-compose');
    }

    // Generate project ID based on path
    const projectId = this.generateProjectId(resolvedPath);

    return {
      id: projectId,
      name: this.extractProjectName(resolvedPath),
      path: resolvedPath,
      type: projectType,
      frameworks,
      languages,
      tools,
      databases,
      deployment,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
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
    const dbConnection = new DatabaseConnection(localDbPath);

    // Initialize local storage
    const localStorage = new HybridStorage(localDbPath);

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
  public getProjectStorage(projectPath?: string): HybridStorage {
    if (projectPath) {
      const localDbPath = join(projectPath, '.guidance', 'guidance.db');
      return new HybridStorage(localDbPath);
    } else {
      return new HybridStorage(this.globalDbPath);
    }
  }

  /**
   * Get global storage
   */
  public getGlobalStorage(): HybridStorage {
    return new HybridStorage(this.globalDbPath);
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
  public async getProjectInfo(
    projectPath: string
  ): Promise<ProjectInfo | null> {
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
    const globalStorage = this.getGlobalStorage();
    const localStorage = this.getProjectStorage(projectInfo.path);

    // Copy global templates
    const globalTemplates = await globalStorage.listTemplates();
    for (const template of globalTemplates) {
      // Check if template is applicable to this project type
      if (this.isTemplateApplicable(template, projectInfo)) {
        await localStorage.saveTemplate(template);
      }
    }

    // Copy global workflows
    const globalWorkflows = await globalStorage.listWorkflows();
    for (const workflow of globalWorkflows) {
      if (this.isWorkflowApplicable(workflow, projectInfo)) {
        await localStorage.saveWorkflow(workflow);
      }
    }
  }

  /**
   * Check if template is applicable to project
   */
  private isTemplateApplicable(template: any, project: ProjectInfo): boolean {
    const templateTags = template.tags || [];
    return templateTags.some(
      (tag: string) =>
        project.frameworks.includes(tag) ||
        project.languages.includes(tag) ||
        project.type === tag
    );
  }

  /**
   * Check if workflow is applicable to project
   */
  private isWorkflowApplicable(workflow: any, project: ProjectInfo): boolean {
    const workflowTags = workflow.tags || [];
    return workflowTags.some(
      (tag: string) =>
        project.frameworks.includes(tag) ||
        project.languages.includes(tag) ||
        project.type === tag
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
  private async initializeProjectMemoryRules(
    projectInfo: ProjectInfo
  ): Promise<void> {
    try {
      const globalStorage = this.getGlobalStorage();
      const localStorage = this.getProjectStorage(projectInfo.path);

      // Create memory router and rule manager
      const memoryRouter = new MemoryRouter(this, globalStorage);
      memoryRouter.setProjectContext(projectInfo.path);

      const memoryRuleManager = new MemoryRuleManager(memoryRouter, this);

      // Initialize project-specific memory rules
      await memoryRuleManager.initializeProjectRules(
        projectInfo.path,
        projectInfo.type
      );

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
