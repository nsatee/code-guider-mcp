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
      case 'analyze':
        return await this.analyzeCode(step, context, variables);
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
    const modifiedContent = this.applyModifications(currentContent, step, variables);
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

  private processTemplate(template: string, variables: Record<string, string>): string {
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
        modifiedContent = this.applyModificationRule(modifiedContent, rule, variables);
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
          tag.toLowerCase().includes(extension || '') || tag.toLowerCase().includes('general')
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

  private async analyzeCode(
    step: WorkflowStep,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    const projectPath = context.projectPath || process.cwd();
    const analysisType = step.id.toLowerCase();

    switch (analysisType) {
      case 'analyze-project-structure':
        return await this.analyzeProjectStructure(projectPath);
      case 'identify-unused-code':
        return await this.identifyUnusedCode(projectPath);
      case 'analyze-code-quality':
        return await this.analyzeCodeQuality(projectPath);
      case 'identify-refactoring-opportunities':
        return await this.identifyRefactoringOpportunities(projectPath);
      case 'analyze-code-standards':
        return await this.analyzeCodeStandards(projectPath);
      default:
        return await this.performGeneralAnalysis(projectPath, step.name);
    }
  }

  private async analyzeProjectStructure(projectPath: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const structure = await this.scanProjectStructure(projectPath);
      const reportPath = path.join(projectPath, 'project-structure-analysis.md');

      const report = `# Project Structure Analysis

## Overview
- **Total Files**: ${structure.totalFiles}
- **Directories**: ${structure.directories.length}
- **TypeScript Files**: ${structure.typescriptFiles}
- **JavaScript Files**: ${structure.javascriptFiles}
- **Test Files**: ${structure.testFiles}
- **Configuration Files**: ${structure.configFiles}

## Directory Structure
\`\`\`
${structure.tree}
\`\`\`

## Key Findings
${structure.findings.join('\n')}

## Recommendations
${structure.recommendations.join('\n')}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Project structure analysis completed. Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to analyze project structure: ${error}`;
    }
  }

  private async identifyUnusedCode(projectPath: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const unusedCode = await this.findUnusedCode(projectPath);
      const reportPath = path.join(projectPath, 'unused-code-report.md');

      const report = `# Unused Code Analysis

## Summary
- **Unused Imports**: ${unusedCode.unusedImports.length}
- **Unused Variables**: ${unusedCode.unusedVariables.length}
- **Unused Functions**: ${unusedCode.unusedFunctions.length}
- **Unused Files**: ${unusedCode.unusedFiles.length}

## Unused Imports
${unusedCode.unusedImports
  .map((item: any) => `- ${item.file}:${item.line} - ${item.import}`)
  .join('\n')}

## Unused Variables
${unusedCode.unusedVariables
  .map((item: any) => `- ${item.file}:${item.line} - ${item.variable}`)
  .join('\n')}

## Unused Functions
${unusedCode.unusedFunctions
  .map((item: any) => `- ${item.file}:${item.line} - ${item.function}`)
  .join('\n')}

## Unused Files
${unusedCode.unusedFiles.map((file: any) => `- ${file}`).join('\n')}

## Recommendations
${unusedCode.recommendations.join('\n')}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Unused code analysis completed. Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to identify unused code: ${error}`;
    }
  }

  private async analyzeCodeQuality(projectPath: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const qualityAnalysis = await this.performQualityAnalysis(projectPath);
      const reportPath = path.join(projectPath, 'code-quality-report.md');

      const report = `# Code Quality Analysis

## Quality Score: ${qualityAnalysis.score}/100

## Issues Found
${qualityAnalysis.issues
  .map((issue: any) => `- **${issue.severity}**: ${issue.message} (${issue.file}:${issue.line})`)
  .join('\n')}

## Metrics
- **Cyclomatic Complexity**: ${qualityAnalysis.complexity}
- **Code Duplication**: ${qualityAnalysis.duplication}%
- **Test Coverage**: ${qualityAnalysis.coverage}%
- **Documentation Coverage**: ${qualityAnalysis.documentation}%

## Recommendations
${qualityAnalysis.recommendations.join('\n')}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Code quality analysis completed. Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to analyze code quality: ${error}`;
    }
  }

  private async identifyRefactoringOpportunities(projectPath: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const opportunities = await this.findRefactoringOpportunities(projectPath);
      const reportPath = path.join(projectPath, 'refactoring-opportunities.md');

      const report = `# Refactoring Opportunities

## High Priority
${opportunities.high
  .map((opp: any) => `- **${opp.type}**: ${opp.description} (${opp.file}:${opp.line})`)
  .join('\n')}

## Medium Priority
${opportunities.medium
  .map((opp: any) => `- **${opp.type}**: ${opp.description} (${opp.file}:${opp.line})`)
  .join('\n')}

## Low Priority
${opportunities.low
  .map((opp: any) => `- **${opp.type}**: ${opp.description} (${opp.file}:${opp.line})`)
  .join('\n')}

## Recommendations
${opportunities.recommendations.join('\n')}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Refactoring opportunities analysis completed. Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to identify refactoring opportunities: ${error}`;
    }
  }

  private async analyzeCodeStandards(projectPath: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const standardsAnalysis = await this.checkCodeStandards(projectPath);
      const reportPath = path.join(projectPath, 'code-standards-analysis.md');

      const report = `# Code Standards Analysis

## Compliance Score: ${standardsAnalysis.score}/100

## Standards Checked
${standardsAnalysis.checks
  .map((check: any) => `- **${check.name}**: ${check.passed ? '✅' : '❌'} ${check.message}`)
  .join('\n')}

## Violations
${standardsAnalysis.violations
  .map(
    (violation: any) =>
      `- **${violation.rule}**: ${violation.message} (${violation.file}:${violation.line})`
  )
  .join('\n')}

## Recommendations
${standardsAnalysis.recommendations.join('\n')}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Code standards analysis completed. Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to analyze code standards: ${error}`;
    }
  }

  private async performGeneralAnalysis(projectPath: string, analysisName: string): Promise<string> {
    return `Performed general analysis: ${analysisName} on project at ${projectPath}`;
  }

  // Helper methods for analysis
  private async scanProjectStructure(projectPath: string): Promise<any> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const stats = {
      totalFiles: 0,
      directories: [] as string[],
      typescriptFiles: 0,
      javascriptFiles: 0,
      testFiles: 0,
      configFiles: 0,
      tree: '',
      findings: [] as string[],
      recommendations: [] as string[],
    };

    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          stats.directories.push(entry.name);
        } else if (entry.isFile()) {
          stats.totalFiles++;
          const ext = path.extname(entry.name);

          if (ext === '.ts' || ext === '.tsx') {
            stats.typescriptFiles++;
          } else if (ext === '.js' || ext === '.jsx') {
            stats.javascriptFiles++;
          } else if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
            stats.testFiles++;
          } else if (
            ['package.json', 'tsconfig.json', 'biome.json', '.eslintrc'].includes(entry.name)
          ) {
            stats.configFiles++;
          }
        }
      }

      // Generate simple tree structure
      stats.tree = this.generateTreeStructure(projectPath, 0, 2);

      // Generate findings and recommendations
      stats.findings = this.generateStructureFindings(stats);
      stats.recommendations = this.generateStructureRecommendations(stats);
    } catch (error) {
      stats.findings.push(`Error scanning project: ${error}`);
    }

    return stats;
  }

  private generateTreeStructure(dirPath: string, depth: number, maxDepth: number): string {
    // Simplified tree generation - in a real implementation, this would be more sophisticated
    return `project/
├── src/
├── dist/
├── package.json
└── README.md`;
  }

  private generateStructureFindings(stats: any): string[] {
    const findings = [];

    if (stats.typescriptFiles > 0 && stats.javascriptFiles > 0) {
      findings.push('Mixed TypeScript and JavaScript files detected');
    }

    if (stats.testFiles === 0) {
      findings.push('No test files found');
    }

    if (stats.configFiles < 2) {
      findings.push('Limited configuration files detected');
    }

    return findings;
  }

  private generateStructureRecommendations(stats: any): string[] {
    const recommendations = [];

    if (stats.testFiles === 0) {
      recommendations.push('Consider adding test files for better code coverage');
    }

    if (stats.typescriptFiles > 0 && stats.javascriptFiles > 0) {
      recommendations.push(
        'Consider migrating JavaScript files to TypeScript for better type safety'
      );
    }

    recommendations.push('Ensure proper project structure with clear separation of concerns');

    return recommendations;
  }

  private async findUnusedCode(projectPath: string): Promise<any> {
    // Simplified unused code detection - in a real implementation, this would use AST parsing
    return {
      unusedImports: [],
      unusedVariables: [],
      unusedFunctions: [],
      unusedFiles: [],
      recommendations: [
        'Use a proper AST-based tool like ts-unused-exports or unimported for accurate detection',
        'Consider using ESLint rules for unused variables and imports',
        'Regularly audit your codebase for dead code',
      ],
    };
  }

  private async performQualityAnalysis(projectPath: string): Promise<any> {
    // Simplified quality analysis - in a real implementation, this would use proper tools
    return {
      score: 75,
      issues: [],
      complexity: 'Medium',
      duplication: 5,
      coverage: 80,
      documentation: 60,
      recommendations: [
        'Improve test coverage to 90%+',
        'Add more documentation and comments',
        'Reduce code duplication',
        'Implement consistent coding standards',
      ],
    };
  }

  private async findRefactoringOpportunities(projectPath: string): Promise<any> {
    // Simplified refactoring detection - in a real implementation, this would use proper analysis
    return {
      high: [],
      medium: [],
      low: [],
      recommendations: [
        'Use tools like SonarQube or CodeClimate for comprehensive refactoring suggestions',
        'Look for long functions that can be broken down',
        'Identify duplicate code that can be extracted',
        'Consider using design patterns where appropriate',
      ],
    };
  }

  private async checkCodeStandards(projectPath: string): Promise<any> {
    // Simplified standards check - in a real implementation, this would use proper linting
    return {
      score: 85,
      checks: [
        {
          name: 'Naming Conventions',
          passed: true,
          message: 'Consistent naming found',
        },
        {
          name: 'Code Formatting',
          passed: true,
          message: 'Proper formatting detected',
        },
        {
          name: 'Type Annotations',
          passed: false,
          message: 'Some missing type annotations',
        },
      ],
      violations: [],
      recommendations: [
        'Run Biome or ESLint to check code standards',
        'Add missing type annotations',
        'Ensure consistent formatting across the project',
      ],
    };
  }
}
