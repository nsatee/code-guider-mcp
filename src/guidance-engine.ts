import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { StorageInterface } from './storage-interface';
import type { GuidanceContext, Workflow, WorkflowStep } from './types';

export class GuidanceEngine {
  private storage: StorageInterface;

  constructor(storage: StorageInterface) {
    this.storage = storage;
  }

  async executeWorkflow(
    workflowId: string,
    context: GuidanceContext,
    variables: Record<string, string> = {}
  ): Promise<{
    success: boolean;
    steps: Array<{ step: WorkflowStep; result: string; success: boolean }>;
    errors: string[];
  }> {
    const workflow = await this.storage.getWorkflow(workflowId);
    if (!workflow) {
      return {
        success: false,
        steps: [],
        errors: [`Workflow ${workflowId} not found`],
      };
    }

    const results: Array<{
      step: WorkflowStep;
      result: string;
      success: boolean;
    }> = [];
    const errors: string[] = [];

    // Sort steps by order
    const sortedSteps = [...workflow.steps].sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      try {
        const result = await this.executeStep(step, context, variables);
        results.push({ step, result, success: true });
      } catch (error) {
        const errorMsg = `Step ${step.name} failed: ${error}`;
        errors.push(errorMsg);
        results.push({ step, result: errorMsg, success: false });
      }
    }

    return {
      success: errors.length === 0,
      steps: results,
      errors,
    };
  }

  private async executeStep(
    step: WorkflowStep,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    switch (step.action) {
      case 'create':
        return await this.createFile(step, context, variables);
      case 'modify':
        return await this.modifyFile(step, context, variables);
      case 'validate':
        return await this.validateCode(step, context, variables);
      case 'test':
        return await this.createTest(step, context, variables);
      case 'document':
        return await this.createDocumentation(step, context, variables);
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  private async createFile(
    step: WorkflowStep,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    if (!step.template) {
      throw new Error('Template not specified for create action');
    }

    const template = await this.storage.getTemplate(step.template);
    if (!template) {
      throw new Error(`Template ${step.template} not found`);
    }

    const content = this.processTemplate(template.content, {
      ...variables,
      ...context,
      frameworks: context.frameworks?.join(', ') || '',
    });
    const filePath = join(context.projectPath, step.name);

    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, content);
    return `Created file: ${filePath}`;
  }

  private async modifyFile(
    step: WorkflowStep,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    const filePath = join(context.projectPath, step.name);
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const currentContent = readFileSync(filePath, 'utf8');
    const modifiedContent = this.applyModifications(
      currentContent,
      step,
      variables
    );
    writeFileSync(filePath, modifiedContent);

    return `Modified file: ${filePath}`;
  }

  private async validateCode(
    step: WorkflowStep,
    context: GuidanceContext,
    _variables: Record<string, string>
  ): Promise<string> {
    const filePath = join(context.projectPath, step.name);
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf8');
    const qualityRules = await this.storage.listQualityRules();
    const violations: string[] = [];

    for (const rule of qualityRules) {
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern, 'g');
        const matches = content.match(regex);
        if (matches) {
          violations.push(`${rule.name}: Found ${matches.length} violations`);
        }
      }
    }

    if (violations.length === 0) {
      return 'Code validation passed';
    }
    return `Validation issues found:\n${violations.join('\n')}`;
  }

  private async createTest(
    step: WorkflowStep,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    const testTemplate = await this.storage.getTemplate('test-template');
    if (!testTemplate) {
      throw new Error('Test template not found');
    }

    const content = this.processTemplate(testTemplate.content, {
      ...variables,
      ...context,
      frameworks: context.frameworks?.join(', ') || '',
    });
    const testPath = join(context.projectPath, step.name);

    writeFileSync(testPath, content);
    return `Created test file: ${testPath}`;
  }

  private async createDocumentation(
    step: WorkflowStep,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    const docTemplate = await this.storage.getTemplate('doc-template');
    if (!docTemplate) {
      throw new Error('Documentation template not found');
    }

    const content = this.processTemplate(docTemplate.content, {
      ...variables,
      ...context,
      frameworks: context.frameworks?.join(', ') || '',
    });
    const docPath = join(context.projectPath, step.name);

    writeFileSync(docPath, content);
    return `Created documentation: ${docPath}`;
  }

  private processTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    let processed = template;

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(pattern, value);
    }

    return processed;
  }

  private applyModifications(
    content: string,
    step: WorkflowStep,
    variables: Record<string, string>
  ): string {
    // Simple modification logic - can be extended
    let modifiedContent = content;
    if (step.rules) {
      for (const rule of step.rules) {
        // Apply specific modification rules
        modifiedContent = this.applyModificationRule(
          modifiedContent,
          rule,
          variables
        );
      }
    }

    return modifiedContent;
  }

  private applyModificationRule(
    content: string,
    rule: string,
    variables: Record<string, string>
  ): string {
    // Implement specific modification rules
    // This is a simplified example
    switch (rule) {
      case 'add-import':
        return this.addImport(content, variables['importStatement'] || '');
      case 'add-export':
        return this.addExport(content, variables['exportStatement'] || '');
      default:
        return content;
    }
  }

  private addImport(content: string, importStatement: string): string {
    if (!importStatement) {
      return content;
    }

    const lines = content.split('\n');
    const importIndex = lines.findIndex((line) => line.startsWith('import'));

    if (importIndex === -1) {
      lines.unshift(importStatement);
    } else {
      lines.splice(importIndex, 0, importStatement);
    }

    return lines.join('\n');
  }

  private addExport(content: string, exportStatement: string): string {
    if (!exportStatement) {
      return content;
    }

    const lines = content.split('\n');
    lines.push(exportStatement);

    return lines.join('\n');
  }

  async getGuidanceForFile(
    filePath: string,
    _context: GuidanceContext
  ): Promise<{
    suggestions: string[];
    qualityIssues: string[];
    relatedWorkflows: Workflow[];
  }> {
    const suggestions: string[] = [];
    const qualityIssues: string[] = [];

    // Analyze file extension to suggest workflows
    const extension = filePath.split('.').pop()?.toLowerCase();
    const workflows = await this.storage.listWorkflows();

    const relatedWorkflows = workflows.filter((workflow) =>
      workflow.tags.some(
        (tag) =>
          tag.toLowerCase().includes(extension || '') ||
          tag.toLowerCase().includes('general')
      )
    );

    // Check for quality issues
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8');
      const qualityRules = await this.storage.listQualityRules();

      for (const rule of qualityRules) {
        if (rule.pattern) {
          const regex = new RegExp(rule.pattern, 'g');
          const matches = content.match(regex);
          if (matches) {
            qualityIssues.push(`${rule.name}: ${rule.description}`);
          }
        }
      }
    }

    return {
      suggestions,
      qualityIssues,
      relatedWorkflows,
    };
  }
}
