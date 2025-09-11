/**
 * Anubis Workflow Manager
 * Inspired by https://github.com/Hive-Academy/Anubis-MCP
 *
 * Manages intelligent workflow execution with role-based guidance
 */

import type { AnubisGuidance, AnubisWorkflowExecution } from './anubis-role-system.js';
import {
  createAnubisExecution,
  generateAnubisGuidance,
  isValidRoleTransition,
  transitionToRole,
} from './anubis-role-system.js';

export interface AnubisWorkflow {
  id: string;
  name: string;
  description: string;
  steps: AnubisWorkflowStep[];
  roles: string[];
  agentType: 'cursor' | 'copilot' | 'roocode' | 'kilocode' | 'general';
  context: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnubisWorkflowStep {
  id: string;
  name: string;
  description: string;
  roleId: string;
  order: number;
  approach: string[];
  qualityChecklist: string[];
  context: Record<string, unknown>;
  nextSteps: string[];
  estimatedTime: string;
  dependencies: string[];
}

export interface AnubisExecutionMetrics {
  executionId: string;
  totalSteps: number;
  completedSteps: number;
  currentRole: string;
  roleTransitions: number;
  filesCreated: number;
  filesModified: number;
  testsWritten: number;
  coverage: number;
  qualityScore: number;
  estimatedTimeRemaining: string;
  status: string;
}

export class AnubisWorkflowManager {
  private executions: Map<string, AnubisWorkflowExecution> = new Map();
  private workflows: Map<string, AnubisWorkflow> = new Map();

  constructor() {
    this.initializeDefaultWorkflows();
  }

  /**
   * Initialize default Anubis workflows
   */
  private initializeDefaultWorkflows(): void {
    // Cursor React Component Workflow
    const cursorReactWorkflow: AnubisWorkflow = {
      id: 'cursor-react-component-workflow',
      name: 'Cursor React Component Workflow',
      description:
        'Complete React component development with TypeScript, testing, and documentation',
      steps: [
        {
          id: 'requirements-analysis',
          name: 'Requirements Analysis',
          description: 'Analyze component requirements and define specifications',
          roleId: 'product-manager',
          order: 1,
          approach: [
            'Gather component requirements',
            'Define user stories and acceptance criteria',
            'Identify technical constraints',
            'Plan component architecture',
          ],
          qualityChecklist: [
            'Requirements are clear and complete',
            'User stories are well-defined',
            'Technical constraints are documented',
            'Architecture plan is sound',
          ],
          context: { type: 'analysis', phase: 'planning' },
          nextSteps: ['system-design'],
          estimatedTime: '30 minutes',
          dependencies: [],
        },
        {
          id: 'system-design',
          name: 'System Design',
          description: 'Design component architecture and technical specifications',
          roleId: 'architect',
          order: 2,
          approach: [
            'Design component interface and props',
            'Plan state management strategy',
            'Define component composition',
            'Specify styling approach',
          ],
          qualityChecklist: [
            'Component interface is well-designed',
            'State management is appropriate',
            'Composition is logical',
            'Styling approach is consistent',
          ],
          context: { type: 'design', phase: 'architecture' },
          nextSteps: ['implementation'],
          estimatedTime: '45 minutes',
          dependencies: ['requirements-analysis'],
        },
        {
          id: 'implementation',
          name: 'Implementation',
          description: 'Implement the React component with TypeScript',
          roleId: 'senior-developer',
          order: 3,
          approach: [
            'Create TypeScript interfaces',
            'Implement component logic',
            'Add styling with Tailwind CSS',
            'Implement accessibility features',
            'Add error handling and loading states',
          ],
          qualityChecklist: [
            'TypeScript types are comprehensive',
            'Component follows React best practices',
            'Styling is responsive and accessible',
            'Error handling is robust',
            'Code is clean and maintainable',
          ],
          context: { type: 'implementation', phase: 'development' },
          nextSteps: ['testing'],
          estimatedTime: '2 hours',
          dependencies: ['system-design'],
        },
        {
          id: 'testing',
          name: 'Testing',
          description: 'Write comprehensive tests for the component',
          roleId: 'senior-developer',
          order: 4,
          approach: [
            'Write unit tests with Jest',
            'Add integration tests with React Testing Library',
            'Test accessibility with jest-axe',
            'Add visual regression tests',
            'Achieve >80% test coverage',
          ],
          qualityChecklist: [
            'Unit tests cover all functionality',
            'Integration tests verify user interactions',
            'Accessibility tests pass',
            'Test coverage is >80%',
            'Tests are maintainable and readable',
          ],
          context: { type: 'testing', phase: 'quality' },
          nextSteps: ['code-review'],
          estimatedTime: '1.5 hours',
          dependencies: ['implementation'],
        },
        {
          id: 'code-review',
          name: 'Code Review',
          description: 'Review code quality, security, and performance',
          roleId: 'code-review',
          order: 5,
          approach: [
            'Review code for quality and security',
            'Validate performance requirements',
            'Check accessibility compliance',
            'Verify test coverage and quality',
            'Approve or request changes',
          ],
          qualityChecklist: [
            'Code quality standards are met',
            'Security vulnerabilities are addressed',
            'Performance is optimized',
            'Accessibility standards are met',
            'All tests are passing',
          ],
          context: { type: 'review', phase: 'validation' },
          nextSteps: ['integration'],
          estimatedTime: '45 minutes',
          dependencies: ['testing'],
        },
        {
          id: 'integration',
          name: 'Integration',
          description: 'Integrate component and prepare for delivery',
          roleId: 'integration-engineer',
          order: 6,
          approach: [
            'Integrate component into application',
            'Update documentation and examples',
            'Create Storybook stories',
            'Prepare deployment package',
            'Validate production readiness',
          ],
          qualityChecklist: [
            'Component integrates successfully',
            'Documentation is complete',
            'Storybook stories are comprehensive',
            'Production readiness is validated',
            'Deployment package is ready',
          ],
          context: { type: 'integration', phase: 'delivery' },
          nextSteps: [],
          estimatedTime: '30 minutes',
          dependencies: ['code-review'],
        },
      ],
      roles: [
        'product-manager',
        'architect',
        'senior-developer',
        'code-review',
        'integration-engineer',
      ],
      agentType: 'cursor',
      context: { framework: 'react', language: 'typescript', testing: 'jest' },
      tags: ['cursor', 'react', 'typescript', 'component', 'testing'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workflows.set(cursorReactWorkflow.id, cursorReactWorkflow);
  }

  /**
   * Start a new workflow execution
   */
  async startWorkflow(
    workflowId: string,
    context: Record<string, unknown> = {},
    agentType: 'cursor' | 'copilot' | 'roocode' | 'kilocode' = 'cursor'
  ): Promise<AnubisWorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const execution = createAnubisExecution(workflowId, 'product-manager', {
      ...workflow.context,
      ...context,
      agentType,
    });

    this.executions.set(execution.id, execution);
    return execution;
  }

  /**
   * Get guidance for the current step
   */
  async getStepGuidance(executionId: string, stepId?: string): Promise<AnubisGuidance> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${execution.workflowId}`);
    }

    const currentStepId = stepId || execution.currentStep;
    const step = workflow.steps.find((s) => s.id === currentStepId);
    if (!step) {
      throw new Error(`Step not found: ${currentStepId}`);
    }

    return generateAnubisGuidance(
      step.roleId,
      currentStepId,
      execution.context,
      workflow.agentType === 'general' ? 'cursor' : workflow.agentType
    );
  }

  /**
   * Report step completion
   */
  async reportStepCompletion(
    executionId: string,
    result: {
      status: 'success' | 'failed' | 'partial';
      metrics?: Partial<AnubisWorkflowExecution['metrics']>;
      notes?: string;
      filesCreated?: string[];
      filesModified?: string[];
    }
  ): Promise<AnubisWorkflowExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${execution.workflowId}`);
    }

    // Update execution
    const updatedExecution: AnubisWorkflowExecution = {
      ...execution,
      completedSteps: [...execution.completedSteps, execution.currentStep],
      updatedAt: new Date().toISOString(),
      metrics: {
        ...execution.metrics,
        ...result.metrics,
        filesCreated: execution.metrics.filesCreated + (result.filesCreated?.length || 0),
        filesModified: execution.metrics.filesModified + (result.filesModified?.length || 0),
      },
    };

    // Determine next step
    const currentStep = workflow.steps.find((s) => s.id === execution.currentStep);
    if (currentStep && result.status === 'success') {
      const nextStep = workflow.steps.find((s) => s.order === currentStep.order + 1);
      if (nextStep) {
        updatedExecution.currentStep = nextStep.id;
        updatedExecution.currentRole = nextStep.roleId;
      } else {
        updatedExecution.status = 'completed';
        updatedExecution.completedAt = new Date().toISOString();
      }
    } else if (result.status === 'failed') {
      updatedExecution.status = 'failed';
    }

    this.executions.set(executionId, updatedExecution);
    return updatedExecution;
  }

  /**
   * Transition to a different role
   */
  async transitionRole(
    executionId: string,
    toRole: string,
    handoffNotes: string,
    decisions: string[] = [],
    rationale: string = ''
  ): Promise<AnubisWorkflowExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (!isValidRoleTransition(execution.currentRole, toRole)) {
      throw new Error(`Invalid role transition from ${execution.currentRole} to ${toRole}`);
    }

    const updatedExecution = transitionToRole(
      execution,
      toRole,
      handoffNotes,
      decisions,
      rationale
    );

    this.executions.set(executionId, updatedExecution);
    return updatedExecution;
  }

  /**
   * Get execution status and metrics
   */
  async getExecutionMetrics(executionId: string): Promise<AnubisExecutionMetrics> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${execution.workflowId}`);
    }

    const totalSteps = workflow.steps.length;
    const completedSteps = execution.completedSteps.length;

    return {
      executionId,
      totalSteps,
      completedSteps,
      currentRole: execution.currentRole,
      roleTransitions: execution.roleHistory.length,
      filesCreated: execution.metrics.filesCreated,
      filesModified: execution.metrics.filesModified,
      testsWritten: execution.metrics.testsWritten,
      coverage: execution.metrics.coverage,
      qualityScore: execution.metrics.qualityScore,
      estimatedTimeRemaining: this.calculateTimeRemaining(workflow, execution),
      status: execution.status,
    };
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateTimeRemaining(
    workflow: AnubisWorkflow,
    execution: AnubisWorkflowExecution
  ): string {
    const remainingSteps = workflow.steps.filter(
      (step) => !execution.completedSteps.includes(step.id)
    );

    const totalMinutes = remainingSteps.reduce((total, step) => {
      const timeStr = step.estimatedTime;
      const minutes = Number.parseInt(timeStr.replace(/\D/g, ''), 10) || 0;
      return total + minutes;
    }, 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  /**
   * Get all available workflows
   */
  async getWorkflows(): Promise<AnubisWorkflow[]> {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<AnubisWorkflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<AnubisWorkflowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  /**
   * Pause execution
   */
  async pauseExecution(executionId: string, reason?: string): Promise<AnubisWorkflowExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const updatedExecution: AnubisWorkflowExecution = {
      ...execution,
      status: 'paused',
      updatedAt: new Date().toISOString(),
      context: {
        ...execution.context,
        pauseReason: reason,
      },
    };

    this.executions.set(executionId, updatedExecution);
    return updatedExecution;
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string): Promise<AnubisWorkflowExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const updatedExecution: AnubisWorkflowExecution = {
      ...execution,
      status: 'running',
      updatedAt: new Date().toISOString(),
      context: {
        ...execution.context,
        pauseReason: undefined,
      },
    };

    this.executions.set(executionId, updatedExecution);
    return updatedExecution;
  }
}

// Export singleton instance
export const anubisWorkflowManager = new AnubisWorkflowManager();
