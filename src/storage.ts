import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { CodeTemplate, ProjectConfig, QualityRule, Workflow } from './types';

export class LocalStorage {
  private basePath: string;

  constructor(basePath: string = '.guidance') {
    this.basePath = basePath;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = ['workflows', 'templates', 'rules', 'config'];
    for (const dir of dirs) {
      const fullPath = join(this.basePath, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  // Workflow operations
  async saveWorkflow(workflow: Workflow): Promise<void> {
    const filePath = join(this.basePath, 'workflows', `${workflow.id}.json`);
    writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    const filePath = join(this.basePath, 'workflows', `${id}.json`);
    if (!existsSync(filePath)) {
      return null;
    }
    return JSON.parse(readFileSync(filePath, 'utf8'));
  }

  async listWorkflows(): Promise<Workflow[]> {
    const workflowsDir = join(this.basePath, 'workflows');
    if (!existsSync(workflowsDir)) {
      return [];
    }

    const files = readdirSync(workflowsDir).filter((f: string) => f.endsWith('.json'));
    const workflows: Workflow[] = [];

    for (const file of files) {
      try {
        const workflow = await this.getWorkflow(file.replace('.json', ''));
        if (workflow) {
          workflows.push(workflow);
        }
      } catch (error) {
        console.warn(`Failed to load workflow ${file}:`, error);
      }
    }

    return workflows;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const filePath = join(this.basePath, 'workflows', `${id}.json`);
    if (existsSync(filePath)) {
      writeFileSync(filePath, '');
    }
  }

  // Template operations
  async saveTemplate(template: CodeTemplate): Promise<void> {
    const filePath = join(this.basePath, 'templates', `${template.id}.yaml`);
    writeFileSync(filePath, stringifyYaml(template));
  }

  async getTemplate(id: string): Promise<CodeTemplate | null> {
    const filePath = join(this.basePath, 'templates', `${id}.yaml`);
    if (!existsSync(filePath)) {
      return null;
    }
    return parseYaml(readFileSync(filePath, 'utf8'));
  }

  async listTemplates(): Promise<CodeTemplate[]> {
    const templatesDir = join(this.basePath, 'templates');
    if (!existsSync(templatesDir)) {
      return [];
    }

    const files = readdirSync(templatesDir).filter((f: string) => f.endsWith('.yaml'));
    const templates: CodeTemplate[] = [];

    for (const file of files) {
      try {
        const template = await this.getTemplate(file.replace('.yaml', ''));
        if (template) {
          templates.push(template);
        }
      } catch (error) {
        console.warn(`Failed to load template ${file}:`, error);
      }
    }

    return templates;
  }

  // Quality rules operations
  async saveQualityRule(rule: QualityRule): Promise<void> {
    const filePath = join(this.basePath, 'rules', `${rule.id}.json`);
    writeFileSync(filePath, JSON.stringify(rule, null, 2));
  }

  async getQualityRule(id: string): Promise<QualityRule | null> {
    const filePath = join(this.basePath, 'rules', `${id}.json`);
    if (!existsSync(filePath)) {
      return null;
    }
    return JSON.parse(readFileSync(filePath, 'utf8'));
  }

  async listQualityRules(): Promise<QualityRule[]> {
    const rulesDir = join(this.basePath, 'rules');
    if (!existsSync(rulesDir)) {
      return [];
    }

    const files = readdirSync(rulesDir).filter((f: string) => f.endsWith('.json'));
    const rules: QualityRule[] = [];

    for (const file of files) {
      try {
        const rule = await this.getQualityRule(file.replace('.json', ''));
        if (rule) {
          rules.push(rule);
        }
      } catch (error) {
        console.warn(`Failed to load rule ${file}:`, error);
      }
    }

    return rules;
  }

  // Project configuration
  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    const filePath = join(this.basePath, 'config', 'project.json');
    writeFileSync(filePath, JSON.stringify(config, null, 2));
  }

  async getProjectConfig(): Promise<ProjectConfig | null> {
    const filePath = join(this.basePath, 'config', 'project.json');
    if (!existsSync(filePath)) {
      return null;
    }
    return JSON.parse(readFileSync(filePath, 'utf8'));
  }

  // Utility methods
  async searchWorkflows(query: string): Promise<Workflow[]> {
    const workflows = await this.listWorkflows();
    return workflows.filter(
      (workflow) =>
        workflow.name.toLowerCase().includes(query.toLowerCase()) ||
        workflow.description.toLowerCase().includes(query.toLowerCase()) ||
        workflow.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }

  async searchTemplates(query: string): Promise<CodeTemplate[]> {
    const templates = await this.listTemplates();
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.description.toLowerCase().includes(query.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );
  }
}
