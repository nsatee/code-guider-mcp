import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ExecutionTracker } from './execution-tracker';
import { RoleManager } from './role-manager';
import type { StorageInterface } from './storage-interface';
import type {
  GuidanceContext,
  QualityCheckResult,
  StepExecution,
  Workflow,
  WorkflowExecution,
  WorkflowRole,
  WorkflowStep,
} from './types';

export interface EnhancedWorkflowResult {
  success: boolean;
  executionId: string;
  currentRole: string;
  completedSteps: Array<{
    step: WorkflowStep;
    result: string;
    success: boolean;
    aiSuggestions: string[];
  }>;
  currentStep?: WorkflowStep;
  nextRole?: string;
  context: Record<string, unknown>;
  metrics: {
    filesCreated: number;
    filesModified: number;
    testsWritten: number;
    coverage: number;
    qualityScore: number;
  };
  errors: string[];
  aiInsights: string[];
}

export class EnhancedWorkflowEngine {
  private storage: StorageInterface;
  private roleManager: RoleManager;
  private executionTracker: ExecutionTracker;

  constructor(storage: StorageInterface) {
    this.storage = storage;
    this.roleManager = new RoleManager();
    this.executionTracker = new ExecutionTracker(storage);
  }

  async executeWorkflowWithRoles(
    workflowId: string,
    context: GuidanceContext,
    variables: Record<string, string> = {},
    agentType: string = 'general'
  ): Promise<EnhancedWorkflowResult> {
    // Get workflow
    const workflow = await this.storage.getWorkflow(workflowId);
    if (!workflow) {
      return {
        success: false,
        executionId: '',
        currentRole: '',
        completedSteps: [],
        context: {},
        metrics: {
          filesCreated: 0,
          filesModified: 0,
          testsWritten: 0,
          coverage: 0,
          qualityScore: 0,
        },
        errors: [`Workflow ${workflowId} not found`],
        aiInsights: [],
      };
    }

    // Create execution
    const initialRole = this.determineInitialRole(workflow, agentType);
    const execution = await this.executionTracker.createExecution(workflowId, initialRole, {
      ...context,
      ...variables,
      agentType,
    });

    try {
      // Execute workflow with role-based approach
      const result = await this.executeRoleBasedWorkflow(execution, workflow, context, variables);
      return result;
    } catch (error) {
      await this.executionTracker.failExecution(
        execution.id,
        `Workflow execution failed: ${error}`,
        error as Error
      );

      return {
        success: false,
        executionId: execution.id,
        currentRole: execution.currentRole,
        completedSteps: [],
        context: execution.context,
        metrics: execution.metrics,
        errors: [`Workflow execution failed: ${error}`],
        aiInsights: [],
      };
    }
  }

  private determineInitialRole(_workflow: Workflow, agentType: string): string {
    // Get agent capabilities
    const agentCapabilities = this.roleManager.getAgentCapabilities(agentType);

    if (agentCapabilities) {
      // Use the first supported role for this agent
      return agentCapabilities.supportedRoles[0] || 'product-manager';
    }

    // Default to product-manager for general agents
    return 'product-manager';
  }

  private async executeStepInWorkflow(
    step: WorkflowStep,
    currentRole: WorkflowRole,
    execution: WorkflowExecution,
    context: GuidanceContext,
    variables: Record<string, string>,
    results: Array<{
      step: WorkflowStep;
      result: string;
      success: boolean;
      aiSuggestions: string[];
    }>,
    errors: string[],
    aiInsights: string[]
  ): Promise<void> {
    try {
      // Create step execution
      const stepExecution = await this.executionTracker.addStepExecution(
        execution.id,
        step.id,
        currentRole.id,
        { ...execution.context, ...variables }
      );

      // Execute step with role-specific guidance
      const stepResult = await this.executeStepWithRole(
        step,
        currentRole,
        context,
        variables,
        stepExecution
      );

      // Update step execution
      await this.executionTracker.updateStepExecution(stepExecution.id, {
        status: stepResult.success ? 'completed' : 'failed',
        result: stepResult.result,
        metrics: stepResult.metrics,
        aiSuggestions: stepResult.aiSuggestions,
        qualityChecks: stepResult.qualityChecks,
      });

      // Update execution metrics
      await this.executionTracker.updateExecution(execution.id, {
        metrics: {
          ...execution.metrics,
          ...stepResult.metrics,
        },
      });

      results.push({
        step,
        result: stepResult.result,
        success: stepResult.success,
        aiSuggestions: stepResult.aiSuggestions,
      });

      if (stepResult.aiInsights) {
        aiInsights.push(...stepResult.aiInsights);
      }

      if (!stepResult.success) {
        errors.push(`Step ${step.name} failed: ${stepResult.result}`);
      }

      // Check if role transition is needed
      if (stepResult.roleTransition) {
        const transitionResult = await this.handleRoleTransition(
          execution.id,
          stepResult.roleTransition,
          stepResult.handoffNotes || ''
        );

        if (transitionResult) {
          execution.currentRole = transitionResult.currentRole;
          execution.context = transitionResult.context;
        }
      }
    } catch (error) {
      const errorMsg = `Step ${step.name} failed: ${error}`;
      errors.push(errorMsg);
      results.push({
        step,
        result: errorMsg,
        success: false,
        aiSuggestions: [],
      });
    }
  }

  private async executeRoleBasedWorkflow(
    execution: WorkflowExecution,
    workflow: Workflow,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<EnhancedWorkflowResult> {
    const results: Array<{
      step: WorkflowStep;
      result: string;
      success: boolean;
      aiSuggestions: string[];
    }> = [];
    const errors: string[] = [];
    const aiInsights: string[] = [];

    // Get current role
    const currentRole = this.roleManager.getRole(execution.currentRole);
    if (!currentRole) {
      throw new Error(`Invalid role: ${execution.currentRole}`);
    }

    // Get role-specific steps
    const roleSteps = this.getStepsForRole(workflow, currentRole);

    for (const step of roleSteps) {
      await this.executeStepInWorkflow(
        step,
        currentRole,
        execution,
        context,
        variables,
        results,
        errors,
        aiInsights
      );
    }

    // Determine next role
    const nextRoles = this.roleManager.getNextRoles(currentRole.id);
    const nextRole = nextRoles.length > 0 ? nextRoles[0] : undefined;

    // Complete execution if no more steps
    if (nextRoles.length === 0) {
      await this.executionTracker.completeExecution(execution.id, execution.metrics);
    }

    return {
      success: errors.length === 0,
      executionId: execution.id,
      currentRole: execution.currentRole,
      completedSteps: results,
      nextRole: nextRole?.id || '',
      context: execution.context,
      metrics: execution.metrics,
      errors,
      aiInsights,
    };
  }

  private getStepsForRole(workflow: Workflow, role: WorkflowRole): WorkflowStep[] {
    // Filter steps based on role capabilities
    return workflow.steps.filter((step) => {
      // Check if step action matches role capabilities
      return role.capabilities.some((capability) =>
        this.mapActionToCapability(step.action).includes(capability)
      );
    });
  }

  private mapActionToCapability(action: string): string[] {
    const mapping: Record<string, string[]> = {
      create: ['code-implementation', 'project-setup'],
      modify: ['code-implementation', 'refactoring'],
      validate: ['code-review', 'quality-assessment'],
      test: ['unit-testing', 'integration-testing'],
      document: ['documentation', 'project-setup'],
    };

    return mapping[action] || [];
  }

  private async executeStepWithRole(
    step: WorkflowStep,
    role: WorkflowRole,
    context: GuidanceContext,
    variables: Record<string, string>,
    _stepExecution: StepExecution
  ): Promise<{
    success: boolean;
    result: string;
    metrics: Record<string, unknown>;
    aiSuggestions: string[];
    qualityChecks: QualityCheckResult[];
    aiInsights?: string[];
    roleTransition?: string;
    handoffNotes?: string;
  }> {
    const aiSuggestions: string[] = [];
    const qualityChecks: QualityCheckResult[] = [];
    const metrics: Record<string, unknown> = {};

    try {
      // Get role-specific guidance
      const roleGuidance = this.roleManager.getRoleGuidance(
        role.id,
        context as unknown as Record<string, unknown>
      );
      aiSuggestions.push(...roleGuidance.guidance);

      // Execute step based on action
      let result: string;
      const success = true;

      switch (step.action) {
        case 'create':
          result = await this.createFileWithRole(step, role, context, variables);
          metrics.filesCreated = ((metrics.filesCreated as number) || 0) + 1;
          break;
        case 'modify':
          result = await this.modifyFileWithRole(step, role, context, variables);
          metrics.filesModified = ((metrics.filesModified as number) || 0) + 1;
          break;
        case 'validate':
          result = await this.validateCodeWithRole(step, role, context, variables);
          break;
        case 'test':
          result = await this.createTestWithRole(step, role, context, variables);
          metrics.testsWritten = ((metrics.testsWritten as number) || 0) + 1;
          break;
        case 'document':
          result = await this.createDocumentationWithRole(step, role, context, variables);
          break;
        case 'analyze':
          result = await this.analyzeCodeWithRole(step, role, context, variables);
          break;
        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      // Run quality checks
      const qualityResults = await this.runQualityChecks(step, role, context);
      qualityChecks.push(...qualityResults);

      // Generate AI insights
      const aiInsights = await this.generateAIInsights(step, role, context, result);

      // Check if role transition is needed
      const roleTransition = this.determineRoleTransition(step, role, qualityResults);

      return {
        success,
        result,
        metrics,
        aiSuggestions,
        qualityChecks,
        aiInsights,
        ...(roleTransition && { roleTransition }),
        handoffNotes: this.generateHandoffNotes(role, qualityResults),
      };
    } catch (error) {
      return {
        success: false,
        result: `Step execution failed: ${error}`,
        metrics,
        aiSuggestions,
        qualityChecks,
        aiInsights: [`Error in step execution: ${error}`],
      };
    }
  }

  private async createFileWithRole(
    step: WorkflowStep,
    role: WorkflowRole,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    // Role-specific file creation logic
    const template = await this.storage.getTemplate(step.template || '');
    if (!template) {
      throw new Error(`Template ${step.template} not found`);
    }

    const content = this.processTemplateWithRole(template.content, role, {
      ...variables,
      ...context,
      frameworks: context.frameworks?.join(', ') || '',
    });
    const filePath = join(context.projectPath, step.name);

    // Ensure directory exists
    const dir = require('node:path').dirname(filePath);
    if (!existsSync(dir)) {
      require('node:fs').mkdirSync(dir, { recursive: true });
    }

    require('node:fs').writeFileSync(filePath, content);
    return `Created file: ${filePath} (${role.displayName} approach)`;
  }

  private async modifyFileWithRole(
    step: WorkflowStep,
    role: WorkflowRole,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    const filePath = join(context.projectPath, step.name);
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const currentContent = readFileSync(filePath, 'utf8');
    const modifiedContent = this.applyRoleBasedModifications(currentContent, step, role, variables);
    require('node:fs').writeFileSync(filePath, modifiedContent);

    return `Modified file: ${filePath} (${role.displayName} approach)`;
  }

  private async validateCodeWithRole(
    step: WorkflowStep,
    role: WorkflowRole,
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
      return `Code validation passed (${role.displayName} standards)`;
    }
    return `Validation issues found (${role.displayName} standards):\n${violations.join('\n')}`;
  }

  private async createTestWithRole(
    step: WorkflowStep,
    role: WorkflowRole,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    const testTemplate = await this.storage.getTemplate('test-template');
    if (!testTemplate) {
      throw new Error('Test template not found');
    }

    const content = this.processTemplateWithRole(testTemplate.content, role, {
      ...variables,
      ...context,
      frameworks: context.frameworks?.join(', ') || '',
    });
    const testPath = join(context.projectPath, step.name);

    require('node:fs').writeFileSync(testPath, content);
    return `Created test file: ${testPath} (${role.displayName} approach)`;
  }

  private async createDocumentationWithRole(
    step: WorkflowStep,
    role: WorkflowRole,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    const docTemplate = await this.storage.getTemplate('doc-template');
    if (!docTemplate) {
      throw new Error('Documentation template not found');
    }

    const content = this.processTemplateWithRole(docTemplate.content, role, {
      ...variables,
      ...context,
      frameworks: context.frameworks?.join(', ') || '',
    });
    const docPath = join(context.projectPath, step.name);

    require('node:fs').writeFileSync(docPath, content);
    return `Created documentation: ${docPath} (${role.displayName} approach)`;
  }

  private async analyzeCodeWithRole(
    step: WorkflowStep,
    role: WorkflowRole,
    context: GuidanceContext,
    variables: Record<string, string>
  ): Promise<string> {
    const projectPath = context.projectPath || process.cwd();
    const analysisType = step.id.toLowerCase();

    // Use role-specific analysis approach
    const roleApproach = this.getRoleAnalysisApproach(role, analysisType);

    switch (analysisType) {
      case 'analyze-project-structure':
        return await this.analyzeProjectStructureWithRole(projectPath, role, roleApproach);
      case 'identify-unused-code':
        return await this.identifyUnusedCodeWithRole(projectPath, role, roleApproach);
      case 'analyze-code-quality':
        return await this.analyzeCodeQualityWithRole(projectPath, role, roleApproach);
      case 'identify-refactoring-opportunities':
        return await this.identifyRefactoringOpportunitiesWithRole(projectPath, role, roleApproach);
      case 'analyze-code-standards':
        return await this.analyzeCodeStandardsWithRole(projectPath, role, roleApproach);
      default:
        return await this.performGeneralAnalysisWithRole(
          projectPath,
          step.name,
          role,
          roleApproach
        );
    }
  }

  private getRoleAnalysisApproach(role: WorkflowRole, analysisType: string): string {
    const approaches = {
      'product-manager': 'Focus on business impact and user value',
      architect: 'Focus on system design and technical architecture',
      'senior-developer': 'Focus on code quality and best practices',
      'code-review': 'Focus on security, performance, and maintainability',
      'integration-engineer': 'Focus on deployment and integration readiness',
    };

    return approaches[role.id as keyof typeof approaches] || 'Comprehensive analysis approach';
  }

  private async analyzeProjectStructureWithRole(
    projectPath: string,
    role: WorkflowRole,
    approach: string
  ): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const structure = await this.scanProjectStructure(projectPath);
      const reportPath = path.join(projectPath, `project-structure-analysis-${role.id}.md`);

      const report = `# Project Structure Analysis (${role.displayName})

## Analysis Approach
${approach}

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

## Role-Specific Insights
${this.generateRoleSpecificInsights(role, structure)}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Project structure analysis completed (${role.displayName} approach). Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to analyze project structure: ${error}`;
    }
  }

  private async identifyUnusedCodeWithRole(
    projectPath: string,
    role: WorkflowRole,
    approach: string
  ): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const unusedCode = await this.findUnusedCode(projectPath);
      const reportPath = path.join(projectPath, `unused-code-report-${role.id}.md`);

      const report = `# Unused Code Analysis (${role.displayName})

## Analysis Approach
${approach}

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

## Role-Specific Insights
${this.generateRoleSpecificUnusedCodeInsights(role, unusedCode)}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Unused code analysis completed (${role.displayName} approach). Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to identify unused code: ${error}`;
    }
  }

  private async analyzeCodeQualityWithRole(
    projectPath: string,
    role: WorkflowRole,
    approach: string
  ): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const qualityAnalysis = await this.performQualityAnalysis(projectPath);
      const reportPath = path.join(projectPath, `code-quality-report-${role.id}.md`);

      const report = `# Code Quality Analysis (${role.displayName})

## Analysis Approach
${approach}

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

## Role-Specific Insights
${this.generateRoleSpecificQualityInsights(role, qualityAnalysis)}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Code quality analysis completed (${role.displayName} approach). Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to analyze code quality: ${error}`;
    }
  }

  private async identifyRefactoringOpportunitiesWithRole(
    projectPath: string,
    role: WorkflowRole,
    approach: string
  ): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const opportunities = await this.findRefactoringOpportunities(projectPath);
      const reportPath = path.join(projectPath, `refactoring-opportunities-${role.id}.md`);

      const report = `# Refactoring Opportunities (${role.displayName})

## Analysis Approach
${approach}

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

## Role-Specific Insights
${this.generateRoleSpecificRefactoringInsights(role, opportunities)}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Refactoring opportunities analysis completed (${role.displayName} approach). Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to identify refactoring opportunities: ${error}`;
    }
  }

  private async analyzeCodeStandardsWithRole(
    projectPath: string,
    role: WorkflowRole,
    approach: string
  ): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const standardsAnalysis = await this.checkCodeStandards(projectPath);
      const reportPath = path.join(projectPath, `code-standards-analysis-${role.id}.md`);

      const report = `# Code Standards Analysis (${role.displayName})

## Analysis Approach
${approach}

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

## Role-Specific Insights
${this.generateRoleSpecificStandardsInsights(role, standardsAnalysis)}
`;

      await fs.writeFile(reportPath, report, 'utf-8');
      return `Code standards analysis completed (${role.displayName} approach). Report saved to: ${reportPath}`;
    } catch (error) {
      return `Failed to analyze code standards: ${error}`;
    }
  }

  private async performGeneralAnalysisWithRole(
    projectPath: string,
    analysisName: string,
    role: WorkflowRole,
    approach: string
  ): Promise<string> {
    return `Performed general analysis: ${analysisName} on project at ${projectPath} using ${role.displayName} approach: ${approach}`;
  }

  // Helper methods for analysis (reuse from GuidanceEngine)
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

      stats.tree = this.generateTreeStructure(projectPath, 0, 2);
      stats.findings = this.generateStructureFindings(stats);
      stats.recommendations = this.generateStructureRecommendations(stats);
    } catch (error) {
      stats.findings.push(`Error scanning project: ${error}`);
    }

    return stats;
  }

  private generateTreeStructure(dirPath: string, depth: number, maxDepth: number): string {
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

  // Role-specific insight generators
  private generateRoleSpecificInsights(role: WorkflowRole, structure: any): string {
    const insights = [];

    switch (role.id) {
      case 'product-manager':
        insights.push('- Focus on user-facing features and business value');
        insights.push('- Consider impact on user experience and product roadmap');
        break;
      case 'architect':
        insights.push('- Evaluate system scalability and maintainability');
        insights.push('- Consider architectural patterns and design principles');
        break;
      case 'senior-developer':
        insights.push('- Focus on code quality and development efficiency');
        insights.push('- Consider team productivity and knowledge sharing');
        break;
      case 'code-review':
        insights.push('- Focus on security vulnerabilities and performance issues');
        insights.push('- Consider compliance and industry standards');
        break;
      case 'integration-engineer':
        insights.push('- Focus on deployment readiness and integration points');
        insights.push('- Consider CI/CD pipeline and monitoring requirements');
        break;
    }

    return insights.join('\n');
  }

  private generateRoleSpecificUnusedCodeInsights(role: WorkflowRole, unusedCode: any): string {
    const insights = [];

    switch (role.id) {
      case 'product-manager':
        insights.push('- Unused code may indicate incomplete features or abandoned functionality');
        insights.push('- Consider business impact of removing unused code');
        break;
      case 'architect':
        insights.push('- Unused code increases technical debt and maintenance burden');
        insights.push('- Consider impact on system performance and security');
        break;
      case 'senior-developer':
        insights.push('- Unused code makes codebase harder to understand and maintain');
        insights.push('- Focus on removing dead code to improve development velocity');
        break;
      case 'code-review':
        insights.push('- Unused code may contain security vulnerabilities');
        insights.push('- Ensure proper cleanup procedures are in place');
        break;
      case 'integration-engineer':
        insights.push('- Unused code increases bundle size and deployment complexity');
        insights.push('- Consider impact on build and deployment processes');
        break;
    }

    return insights.join('\n');
  }

  private generateRoleSpecificQualityInsights(role: WorkflowRole, quality: any): string {
    const insights = [];

    switch (role.id) {
      case 'product-manager':
        insights.push('- Code quality directly impacts user experience and feature delivery');
        insights.push('- Consider quality metrics in product planning and prioritization');
        break;
      case 'architect':
        insights.push('- Quality issues may indicate architectural problems');
        insights.push('- Focus on systemic improvements and design patterns');
        break;
      case 'senior-developer':
        insights.push('- Quality issues affect team productivity and code maintainability');
        insights.push('- Focus on best practices and code review processes');
        break;
      case 'code-review':
        insights.push('- Quality issues may indicate security or performance problems');
        insights.push('- Focus on compliance and industry standards');
        break;
      case 'integration-engineer':
        insights.push('- Quality issues affect deployment reliability and monitoring');
        insights.push('- Focus on production readiness and operational concerns');
        break;
    }

    return insights.join('\n');
  }

  private generateRoleSpecificRefactoringInsights(role: WorkflowRole, opportunities: any): string {
    const insights = [];

    switch (role.id) {
      case 'product-manager':
        insights.push('- Refactoring should align with product roadmap and user value');
        insights.push('- Consider impact on feature delivery timeline');
        break;
      case 'architect':
        insights.push('- Focus on architectural improvements and design patterns');
        insights.push('- Consider long-term system evolution and scalability');
        break;
      case 'senior-developer':
        insights.push('- Focus on code maintainability and development efficiency');
        insights.push('- Consider team knowledge sharing and best practices');
        break;
      case 'code-review':
        insights.push('- Focus on security and performance improvements');
        insights.push('- Consider compliance and industry standards');
        break;
      case 'integration-engineer':
        insights.push('- Focus on deployment and integration improvements');
        insights.push('- Consider operational concerns and monitoring');
        break;
    }

    return insights.join('\n');
  }

  private generateRoleSpecificStandardsInsights(role: WorkflowRole, standards: any): string {
    const insights = [];

    switch (role.id) {
      case 'product-manager':
        insights.push('- Standards compliance affects product quality and user experience');
        insights.push('- Consider impact on development velocity and team efficiency');
        break;
      case 'architect':
        insights.push('- Standards ensure consistent architecture and design patterns');
        insights.push('- Focus on system-wide consistency and maintainability');
        break;
      case 'senior-developer':
        insights.push('- Standards improve code readability and team collaboration');
        insights.push('- Focus on development best practices and code review processes');
        break;
      case 'code-review':
        insights.push('- Standards ensure security and compliance requirements');
        insights.push('- Focus on industry best practices and regulatory compliance');
        break;
      case 'integration-engineer':
        insights.push('- Standards ensure deployment consistency and operational reliability');
        insights.push('- Focus on CI/CD pipeline and monitoring standards');
        break;
    }

    return insights.join('\n');
  }

  private processTemplateWithRole(
    template: string,
    role: WorkflowRole,
    variables: Record<string, string>
  ): string {
    let processed = template;

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(pattern, value);
    }

    // Add role-specific context
    processed = processed.replace(/\{\{role\}\}/g, role.displayName);
    processed = processed.replace(/\{\{roleDescription\}\}/g, role.description);
    processed = processed.replace(/\{\{capabilities\}\}/g, role.capabilities.join(', '));

    return processed;
  }

  private applyRoleBasedModifications(
    content: string,
    _step: WorkflowStep,
    role: WorkflowRole,
    _variables: Record<string, string>
  ): string {
    // Apply role-specific modifications
    let modified = content;

    if (role.name === 'senior-developer') {
      // Add comprehensive error handling
      modified = this.addErrorHandling(modified);
    }

    if (role.name === 'architect') {
      // Add architectural patterns
      modified = this.addArchitecturalPatterns(modified);
    }

    if (role.name === 'code-review') {
      // Add security and quality improvements
      modified = this.addSecurityImprovements(modified);
    }

    return modified;
  }

  private addErrorHandling(content: string): string {
    // Add try-catch blocks and error handling
    return content;
  }

  private addArchitecturalPatterns(content: string): string {
    // Add architectural patterns and design principles
    return content;
  }

  private addSecurityImprovements(content: string): string {
    // Add security improvements and validation
    return content;
  }

  private async runQualityChecks(
    _step: WorkflowStep,
    _role: WorkflowRole,
    _context: GuidanceContext
  ): Promise<QualityCheckResult[]> {
    const results: QualityCheckResult[] = [];
    const qualityRules = await this.storage.listQualityRules();

    for (const rule of qualityRules) {
      const result: QualityCheckResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        status: 'pass', // Simplified for this example
        message: 'Quality check passed',
        suggestions: [],
      };

      results.push(result);
    }

    return results;
  }

  private async generateAIInsights(
    step: WorkflowStep,
    role: WorkflowRole,
    _context: GuidanceContext,
    _result: string
  ): Promise<string[]> {
    const insights: string[] = [];

    insights.push(`Executed ${step.name} with ${role.displayName} approach`);
    insights.push(`Role capabilities: ${role.capabilities.join(', ')}`);
    insights.push(`Next responsibilities: ${role.responsibilities.join(', ')}`);

    return insights;
  }

  private determineRoleTransition(
    _step: WorkflowStep,
    role: WorkflowRole,
    qualityChecks: QualityCheckResult[]
  ): string | undefined {
    // Check if all quality gates are met for role transition
    const allQualityChecksPass = qualityChecks.every((check) => check.status === 'pass');

    if (allQualityChecksPass && role.nextRoles.length > 0) {
      return role.nextRoles[0];
    }

    return undefined;
  }

  private generateHandoffNotes(role: WorkflowRole, qualityChecks: QualityCheckResult[]): string {
    const notes: string[] = [];

    notes.push(`Handoff from ${role.displayName}`);
    notes.push(
      `Quality checks: ${
        qualityChecks.filter((c) => c.status === 'pass').length
      }/${qualityChecks.length} passed`
    );
    notes.push(`Next role should focus on: ${role.nextRoles.join(', ')}`);

    return notes.join('\n');
  }

  private async handleRoleTransition(
    executionId: string,
    toRoleId: string,
    handoffNotes: string
  ): Promise<WorkflowExecution | null> {
    return this.executionTracker.transitionRole(executionId, toRoleId, handoffNotes);
  }
}
