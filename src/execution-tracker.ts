import { StorageInterface } from './storage-interface.js';
import {
  WorkflowExecution,
  StepExecution,
  RoleTransition,
  QualityCheckResult,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class ExecutionTracker {
  private storage: StorageInterface;
  private executions: Map<string, WorkflowExecution> = new Map();
  private stepExecutions: Map<string, StepExecution> = new Map();

  constructor(storage: StorageInterface) {
    this.storage = storage;
  }

  async createExecution(
    workflowId: string,
    initialRole: string,
    context: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId,
      currentRole: initialRole,
      completedSteps: [],
      currentStep: '',
      context: {
        ...context,
        qualityGates: [],
        decisions: [],
        rationale: [],
      },
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      metrics: {
        filesCreated: 0,
        filesModified: 0,
        testsWritten: 0,
        coverage: 0,
        qualityScore: 0,
      },
      roleHistory: [],
    };

    this.executions.set(execution.id, execution);
    await this.saveExecution(execution);

    return execution;
  }

  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    if (this.executions.has(executionId)) {
      return this.executions.get(executionId)!;
    }

    // Try to load from storage
    const execution = await this.loadExecution(executionId);
    if (execution) {
      this.executions.set(executionId, execution);
    }

    return execution;
  }

  async updateExecution(
    executionId: string,
    updates: Partial<WorkflowExecution>
  ): Promise<WorkflowExecution | null> {
    const execution = await this.getExecution(executionId);
    if (!execution) return null;

    const updatedExecution: WorkflowExecution = {
      ...execution,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.executions.set(executionId, updatedExecution);
    await this.saveExecution(updatedExecution);

    return updatedExecution;
  }

  async addStepExecution(
    executionId: string,
    stepId: string,
    roleId: string,
    context: Record<string, any> = {}
  ): Promise<StepExecution> {
    const stepExecution: StepExecution = {
      id: uuidv4(),
      executionId,
      stepId,
      roleId,
      status: 'pending',
      context,
      aiSuggestions: [],
      qualityChecks: [],
    };

    this.stepExecutions.set(stepExecution.id, stepExecution);
    await this.saveStepExecution(stepExecution);

    return stepExecution;
  }

  async updateStepExecution(
    stepExecutionId: string,
    updates: Partial<StepExecution>
  ): Promise<StepExecution | null> {
    const stepExecution = this.stepExecutions.get(stepExecutionId);
    if (!stepExecution) return null;

    const updatedStepExecution: StepExecution = {
      ...stepExecution,
      ...updates,
      ...(updates.status === 'running' &&
        !stepExecution.startedAt && { startedAt: new Date().toISOString() }),
      ...(updates.status === 'completed' &&
        !stepExecution.completedAt && {
          completedAt: new Date().toISOString(),
        }),
    };

    this.stepExecutions.set(stepExecutionId, updatedStepExecution);
    await this.saveStepExecution(updatedStepExecution);

    return updatedStepExecution;
  }

  async transitionRole(
    executionId: string,
    toRoleId: string,
    handoffNotes: string,
    context: Record<string, any> = {}
  ): Promise<WorkflowExecution | null> {
    const execution = await this.getExecution(executionId);
    if (!execution) return null;

    const transition: RoleTransition = {
      fromRole: execution.currentRole,
      toRole: toRoleId,
      timestamp: new Date().toISOString(),
      context,
      handoffNotes,
    };

    const updatedExecution = await this.updateExecution(executionId, {
      currentRole: toRoleId,
      roleHistory: [...execution.roleHistory, transition],
      context: {
        ...execution.context,
        ...context,
        lastTransition: transition,
      },
    });

    return updatedExecution;
  }

  async completeStep(
    executionId: string,
    stepId: string,
    result: string,
    metrics: Record<string, any> = {}
  ): Promise<WorkflowExecution | null> {
    const execution = await this.getExecution(executionId);
    if (!execution) return null;

    const updatedExecution = await this.updateExecution(executionId, {
      completedSteps: [...execution.completedSteps, stepId],
      currentStep: '',
      metrics: {
        ...execution.metrics,
        ...metrics,
      },
    });

    return updatedExecution;
  }

  async addQualityCheck(
    stepExecutionId: string,
    qualityCheck: QualityCheckResult
  ): Promise<StepExecution | null> {
    const stepExecution = this.stepExecutions.get(stepExecutionId);
    if (!stepExecution) return null;

    const updatedStepExecution = await this.updateStepExecution(
      stepExecutionId,
      {
        qualityChecks: [...stepExecution.qualityChecks, qualityCheck],
      }
    );

    return updatedStepExecution;
  }

  async getExecutionHistory(executionId: string): Promise<{
    execution: WorkflowExecution;
    stepExecutions: StepExecution[];
    roleTransitions: RoleTransition[];
  } | null> {
    const execution = await this.getExecution(executionId);
    if (!execution) return null;

    const stepExecutions = Array.from(this.stepExecutions.values()).filter(
      (step) => step.executionId === executionId
    );

    return {
      execution,
      stepExecutions,
      roleTransitions: execution.roleHistory,
    };
  }

  async getExecutionsByStatus(status: string): Promise<WorkflowExecution[]> {
    return Array.from(this.executions.values()).filter(
      (execution) => execution.status === status
    );
  }

  async getExecutionsByRole(roleId: string): Promise<WorkflowExecution[]> {
    return Array.from(this.executions.values()).filter(
      (execution) => execution.currentRole === roleId
    );
  }

  async pauseExecution(
    executionId: string,
    reason: string
  ): Promise<WorkflowExecution | null> {
    return this.updateExecution(executionId, {
      status: 'paused',
      context: {
        pauseReason: reason,
        pausedAt: new Date().toISOString(),
      },
    });
  }

  async resumeExecution(
    executionId: string
  ): Promise<WorkflowExecution | null> {
    const execution = await this.getExecution(executionId);
    if (!execution) return null;

    return this.updateExecution(executionId, {
      status: 'running',
      context: {
        ...execution.context,
        resumedAt: new Date().toISOString(),
      },
    });
  }

  async completeExecution(
    executionId: string,
    finalMetrics: Record<string, any> = {}
  ): Promise<WorkflowExecution | null> {
    return this.updateExecution(executionId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      metrics: {
        filesCreated: finalMetrics['filesCreated'] || 0,
        filesModified: finalMetrics['filesModified'] || 0,
        testsWritten: finalMetrics['testsWritten'] || 0,
        coverage: finalMetrics['coverage'] || 0,
        qualityScore: finalMetrics['qualityScore'] || 0,
        ...finalMetrics,
      },
    });
  }

  async failExecution(
    executionId: string,
    reason: string,
    error?: Error
  ): Promise<WorkflowExecution | null> {
    return this.updateExecution(executionId, {
      status: 'failed',
      context: {
        failureReason: reason,
        error: error?.message,
        failedAt: new Date().toISOString(),
      },
    });
  }

  async getExecutionMetrics(executionId: string): Promise<{
    totalSteps: number;
    completedSteps: number;
    successRate: number;
    averageStepTime: number;
    qualityScore: number;
    roleTransitions: number;
  } | null> {
    const history = await this.getExecutionHistory(executionId);
    if (!history) return null;

    const { execution, stepExecutions } = history;
    const completedSteps = stepExecutions.filter(
      (step) => step.status === 'completed'
    );
    const totalTime = execution.completedAt
      ? new Date(execution.completedAt).getTime() -
        new Date(execution.startedAt!).getTime()
      : Date.now() - new Date(execution.startedAt!).getTime();

    return {
      totalSteps: stepExecutions.length,
      completedSteps: completedSteps.length,
      successRate:
        stepExecutions.length > 0
          ? completedSteps.length / stepExecutions.length
          : 0,
      averageStepTime:
        completedSteps.length > 0 ? totalTime / completedSteps.length : 0,
      qualityScore: execution.metrics.qualityScore,
      roleTransitions: execution.roleHistory.length,
    };
  }

  // Storage methods
  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    // Store in vector storage for semantic search
    const content = `Execution ${execution.id} for workflow ${execution.workflowId} in role ${execution.currentRole}`;
    await this.storage.saveCodeAnalysis({
      id: `execution-${execution.id}`,
      filePath: `executions/${execution.id}`,
      content,
      embedding: [],
      analysis: {
        complexity: execution.completedSteps.length,
        patterns: [execution.status, execution.currentRole],
        suggestions: [],
        qualityScore: execution.metrics.qualityScore,
      },
      createdAt: execution.createdAt,
    });
  }

  private async loadExecution(
    executionId: string
  ): Promise<WorkflowExecution | null> {
    // Load from vector storage
    const analysis = await this.storage.getCodeAnalysis(
      `execution-${executionId}`
    );
    if (!analysis) return null;

    // This is a simplified implementation
    // In a real implementation, you'd store the full execution data
    return null;
  }

  private async saveStepExecution(stepExecution: StepExecution): Promise<void> {
    // Store step execution data
    const content = `Step ${stepExecution.stepId} for execution ${stepExecution.executionId} in role ${stepExecution.roleId}`;
    await this.storage.saveCodeAnalysis({
      id: `step-${stepExecution.id}`,
      filePath: `steps/${stepExecution.id}`,
      content,
      embedding: [],
      analysis: {
        complexity: stepExecution.qualityChecks.length,
        patterns: [stepExecution.status, stepExecution.roleId],
        suggestions: stepExecution.aiSuggestions,
        qualityScore:
          (stepExecution.qualityChecks.filter((q) => q.status === 'pass')
            .length /
            stepExecution.qualityChecks.length) *
          100,
      },
      createdAt: stepExecution.startedAt || new Date().toISOString(),
    });
  }

  private async getCodeAnalysis(id: string): Promise<any> {
    // This would be implemented in the vector storage
    return null;
  }
}
