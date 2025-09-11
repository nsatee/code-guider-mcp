/**
 * Anubis MCP Integration
 * Inspired by https://github.com/Hive-Academy/Anubis-MCP
 *
 * Provides MCP-compliant tools for Anubis workflow management
 */

import { ANUBIS_ROLES } from './anubis-role-system.js';
import { anubisWorkflowManager } from './anubis-workflow-manager.js';

export interface AnubisMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * MCP Tools for Anubis Workflow Management
 */
export const ANUBIS_MCP_TOOLS: AnubisMCPTool[] = [
  {
    name: 'start_workflow',
    description: 'Start a new Anubis workflow execution with intelligent role-based guidance',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to start',
        },
        context: {
          type: 'object',
          description: 'Additional context for the workflow execution',
          additionalProperties: true,
        },
        agentType: {
          type: 'string',
          enum: ['cursor', 'copilot', 'roocode', 'kilocode'],
          description: 'Type of AI agent executing the workflow',
          default: 'cursor',
        },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'get_guidance',
    description: 'Get intelligent guidance for the current workflow step',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'ID of the workflow execution',
        },
        stepId: {
          type: 'string',
          description: 'Specific step ID (optional, uses current step if not provided)',
        },
      },
      required: ['executionId'],
    },
  },
  {
    name: 'report_completion',
    description: 'Report completion of a workflow step with metrics and results',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'ID of the workflow execution',
        },
        status: {
          type: 'string',
          enum: ['success', 'failed', 'partial'],
          description: 'Status of the step completion',
        },
        metrics: {
          type: 'object',
          description: 'Metrics for the completed step',
          properties: {
            filesCreated: { type: 'number' },
            filesModified: { type: 'number' },
            testsWritten: { type: 'number' },
            coverage: { type: 'number' },
            qualityScore: { type: 'number' },
          },
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the step completion',
        },
        filesCreated: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files created during this step',
        },
        filesModified: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files modified during this step',
        },
      },
      required: ['executionId', 'status'],
    },
  },
  {
    name: 'transition_role_workflow',
    description: 'Transition to a different role in the workflow execution',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'ID of the workflow execution',
        },
        toRole: {
          type: 'string',
          description: 'Role to transition to',
        },
        handoffNotes: {
          type: 'string',
          description: 'Notes for the role transition',
        },
        decisions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key decisions made in the current role',
        },
        rationale: {
          type: 'string',
          description: 'Rationale for the role transition',
        },
      },
      required: ['executionId', 'toRole', 'handoffNotes'],
    },
  },
  {
    name: 'get_metrics',
    description: 'Get execution metrics and progress information',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'ID of the workflow execution',
        },
      },
      required: ['executionId'],
    },
  },
  {
    name: 'list_workflows',
    description: 'List all available Anubis workflows',
    inputSchema: {
      type: 'object',
      properties: {
        agentType: {
          type: 'string',
          enum: ['cursor', 'copilot', 'roocode', 'kilocode'],
          description: 'Filter workflows by agent type',
        },
      },
    },
  },
  {
    name: 'get_workflow',
    description: 'Get details of a specific workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow',
        },
      },
      required: ['workflowId'],
    },
  },
  {
    name: 'pause_execution',
    description: 'Pause a workflow execution',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'ID of the workflow execution',
        },
        reason: {
          type: 'string',
          description: 'Reason for pausing the execution',
        },
      },
      required: ['executionId'],
    },
  },
  {
    name: 'resume_execution',
    description: 'Resume a paused workflow execution',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'ID of the workflow execution',
        },
      },
      required: ['executionId'],
    },
  },
  {
    name: 'list_roles',
    description: 'List all available Anubis roles and their capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        agentType: {
          type: 'string',
          enum: ['cursor', 'copilot', 'roocode', 'kilocode'],
          description: 'Filter roles by agent type',
        },
      },
    },
  },
];

/**
 * Execute Anubis MCP tool
 */
export async function executeAnubisTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'start_workflow':
      return await anubisWorkflowManager.startWorkflow(
        args.workflowId as string,
        (args.context as Record<string, unknown>) || {},
        (args.agentType as 'cursor' | 'copilot' | 'roocode' | 'kilocode') || 'cursor'
      );

    case 'get_guidance':
      return await anubisWorkflowManager.getStepGuidance(
        args.executionId as string,
        args.stepId as string
      );

    case 'report_completion':
      return await anubisWorkflowManager.reportStepCompletion(args.executionId as string, {
        status: args.status as 'success' | 'failed' | 'partial',
        metrics: args.metrics as Record<string, unknown>,
        notes: args.notes as string,
        filesCreated: args.filesCreated as string[],
        filesModified: args.filesModified as string[],
      });

    case 'transition_role_workflow':
      return await anubisWorkflowManager.transitionRole(
        args.executionId as string,
        args.toRole as string,
        args.handoffNotes as string,
        (args.decisions as string[]) || [],
        (args.rationale as string) || ''
      );

    case 'get_metrics':
      return await anubisWorkflowManager.getExecutionMetrics(args.executionId as string);

    case 'list_workflows': {
      const workflows = await anubisWorkflowManager.getWorkflows();
      const agentType = args.agentType as string;
      if (agentType) {
        return workflows.filter((w: any) => w.agentType === agentType);
      }
      return workflows;
    }

    case 'get_workflow':
      return await anubisWorkflowManager.getWorkflow(args.workflowId as string);

    case 'pause_execution':
      return await anubisWorkflowManager.pauseExecution(
        args.executionId as string,
        args.reason as string
      );

    case 'resume_execution':
      return await anubisWorkflowManager.resumeExecution(args.executionId as string);

    case 'list_roles': {
      const agentTypeFilter = args.agentType as string;
      if (agentTypeFilter) {
        return Object.values(ANUBIS_ROLES).filter(
          (role) => role.agentType === agentTypeFilter || role.agentType === 'general'
        );
      }
      return Object.values(ANUBIS_ROLES);
    }

    default:
      throw new Error(`Unknown Anubis tool: ${toolName}`);
  }
}

/**
 * Get formatted guidance for display
 */
export function formatAnubisGuidance(guidance: any): string {
  return `
## 🎯 Anubis Guidance

**Step:** ${guidance.step}

### 📋 Approach
${guidance.approach.map((item: string, index: number) => `${index + 1}. ${item}`).join('\n')}

### ✅ Quality Checklist
${guidance.qualityChecklist.map((item: string) => `- [ ] ${item}`).join('\n')}

### 🎨 Templates Available
${guidance.templates.map((template: string) => `- ${template}`).join('\n')}

### 💡 Best Practices
${guidance.bestPractices.map((practice: string) => `- ${practice}`).join('\n')}

### 📊 Context
- **Previous Decisions:** ${guidance.context.previousDecisions.join(', ') || 'None'}
- **Next Role:** ${guidance.context.nextRole || 'N/A'}
- **Rationale:** ${guidance.context.rationale}

### 🔧 Examples
${guidance.examples.map((example: string) => `- ${example}`).join('\n')}
  `.trim();
}

/**
 * Get formatted metrics for display
 */
export function formatAnubisMetrics(metrics: any): string {
  const progress = ((metrics.completedSteps / metrics.totalSteps) * 100).toFixed(1);

  return `
## 📊 Anubis Execution Metrics

**Execution ID:** ${metrics.executionId}
**Status:** ${metrics.status}
**Progress:** ${progress}% (${metrics.completedSteps}/${metrics.totalSteps} steps)

### 🎭 Current Role
**Role:** ${metrics.currentRole}
**Role Transitions:** ${metrics.roleTransitions}

### 📁 Files
- **Created:** ${metrics.filesCreated}
- **Modified:** ${metrics.filesModified}

### 🧪 Testing
- **Tests Written:** ${metrics.testsWritten}
- **Coverage:** ${metrics.coverage}%

### ⭐ Quality
- **Quality Score:** ${metrics.qualityScore}/100

### ⏱️ Time
- **Estimated Remaining:** ${metrics.estimatedTimeRemaining}
  `.trim();
}
