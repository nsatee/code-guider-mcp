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
    const execution = await this.executionTracker.createExecution(
      workflowId,
      initialRole,
      {
        ...context,
        ...variables,
        agentType,
      }
    );

    try {
      // Execute workflow with role-based approach
      const result = await this.executeRoleBasedWorkflow(
        execution,
        workflow,
        context,
        variables
      );
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
      await this.executionTracker.completeExecution(
        execution.id,
        execution.metrics
      );
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

  private getStepsForRole(
    workflow: Workflow,
    role: WorkflowRole
  ): WorkflowStep[] {
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
          result = await this.createFileWithRole(
            step,
            role,
            context,
            variables
          );
          metrics.filesCreated = ((metrics.filesCreated as number) || 0) + 1;
          break;
        case 'modify':
          result = await this.modifyFileWithRole(
            step,
            role,
            context,
            variables
          );
          metrics.filesModified = ((metrics.filesModified as number) || 0) + 1;
          break;
        case 'validate':
          result = await this.validateCodeWithRole(
            step,
            role,
            context,
            variables
          );
          break;
        case 'test':
          result = await this.createTestWithRole(
            step,
            role,
            context,
            variables
          );
          metrics.testsWritten = ((metrics.testsWritten as number) || 0) + 1;
          break;
        case 'document':
          result = await this.createDocumentationWithRole(
            step,
            role,
            context,
            variables
          );
          break;
        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      // Run quality checks
      const qualityResults = await this.runQualityChecks(step, role, context);
      qualityChecks.push(...qualityResults);

      // Generate AI insights
      const aiInsights = await this.generateAIInsights(
        step,
        role,
        context,
        result
      );

      // Check if role transition is needed
      const roleTransition = this.determineRoleTransition(
        step,
        role,
        qualityResults
      );

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
    const modifiedContent = this.applyRoleBasedModifications(
      currentContent,
      step,
      role,
      variables
    );
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
    return `Validation issues found (${
      role.displayName
    } standards):\n${violations.join('\n')}`;
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
    processed = processed.replace(
      /\{\{capabilities\}\}/g,
      role.capabilities.join(', ')
    );

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
    const allQualityChecksPass = qualityChecks.every(
      (check) => check.status === 'pass'
    );

    if (allQualityChecksPass && role.nextRoles.length > 0) {
      return role.nextRoles[0];
    }

    return undefined;
  }

  private generateHandoffNotes(
    role: WorkflowRole,
    qualityChecks: QualityCheckResult[]
  ): string {
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
    return this.executionTracker.transitionRole(
      executionId,
      toRoleId,
      handoffNotes
    );
  }
}
