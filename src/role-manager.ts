import {
  WorkflowRole,
  WorkflowExecution,
  RoleTransition,
  AgentCapabilities,
} from './types.js';

export class RoleManager {
  private roles: Map<string, WorkflowRole> = new Map();
  private agentCapabilities: Map<string, AgentCapabilities> = new Map();

  constructor() {
    this.initializeDefaultRoles();
    this.initializeAgentCapabilities();
  }

  private initializeDefaultRoles(): void {
    const defaultRoles: WorkflowRole[] = [
      {
        id: 'product-manager',
        name: 'product-manager',
        displayName: 'Product Manager',
        description: 'Strategic orchestration and project management',
        capabilities: [
          'project-setup',
          'task-creation',
          'workflow-management',
          'stakeholder-communication',
          'requirement-gathering',
        ],
        responsibilities: [
          'Define project scope and requirements',
          'Create and manage task workflows',
          'Coordinate between different roles',
          'Ensure business value delivery',
        ],
        context: {
          focus: 'business-value',
          priority: 'requirements',
        },
        qualityGates: [
          'requirements-complete',
          'stakeholder-approval',
          'scope-defined',
        ],
        nextRoles: ['architect'],
      },
      {
        id: 'architect',
        name: 'architect',
        displayName: 'System Architect',
        description: 'Technical architecture and system design',
        capabilities: [
          'system-design',
          'architecture-planning',
          'technology-selection',
          'scalability-planning',
          'integration-design',
        ],
        responsibilities: [
          'Design system architecture',
          'Select appropriate technologies',
          'Plan integration points',
          'Ensure scalability and maintainability',
        ],
        context: {
          focus: 'technical-architecture',
          priority: 'design-quality',
        },
        qualityGates: [
          'architecture-approved',
          'technology-stack-selected',
          'integration-points-defined',
        ],
        nextRoles: ['senior-developer'],
      },
      {
        id: 'senior-developer',
        name: 'senior-developer',
        displayName: 'Senior Developer',
        description: 'High-quality code implementation and testing',
        capabilities: [
          'code-implementation',
          'unit-testing',
          'integration-testing',
          'code-optimization',
          'documentation',
        ],
        responsibilities: [
          'Implement features according to architecture',
          'Write comprehensive tests',
          'Optimize code performance',
          'Create technical documentation',
        ],
        context: {
          focus: 'code-quality',
          priority: 'implementation',
        },
        qualityGates: [
          'code-complete',
          'tests-passing',
          'coverage-adequate',
          'performance-acceptable',
        ],
        nextRoles: ['code-review'],
      },
      {
        id: 'code-review',
        name: 'code-review',
        displayName: 'Code Reviewer',
        description: 'Quality assurance and security validation',
        capabilities: [
          'code-review',
          'security-validation',
          'performance-review',
          'quality-assessment',
          'approval-gating',
        ],
        responsibilities: [
          'Review code for quality and security',
          'Validate performance requirements',
          'Ensure coding standards compliance',
          'Approve or request changes',
        ],
        context: {
          focus: 'quality-assurance',
          priority: 'validation',
        },
        qualityGates: [
          'security-validated',
          'performance-acceptable',
          'standards-compliant',
          'approved-for-deployment',
        ],
        nextRoles: ['integration-engineer'],
      },
      {
        id: 'integration-engineer',
        name: 'integration-engineer',
        displayName: 'Integration Engineer',
        description: 'Deployment and integration management',
        capabilities: [
          'deployment',
          'integration-testing',
          'environment-management',
          'monitoring-setup',
          'delivery-preparation',
        ],
        responsibilities: [
          'Deploy code to target environments',
          'Perform integration testing',
          'Set up monitoring and logging',
          'Prepare for production delivery',
        ],
        context: {
          focus: 'delivery',
          priority: 'deployment',
        },
        qualityGates: [
          'deployment-successful',
          'integration-tests-passing',
          'monitoring-active',
          'production-ready',
        ],
        nextRoles: [],
      },
    ];

    for (const role of defaultRoles) {
      this.roles.set(role.id, role);
    }
  }

  private initializeAgentCapabilities(): void {
    const capabilities: AgentCapabilities[] = [
      {
        agentType: 'cursor',
        supportedRoles: [
          'product-manager',
          'architect',
          'senior-developer',
          'code-review',
        ],
        capabilities: [
          'code-generation',
          'refactoring',
          'debugging',
          'documentation',
          'testing',
        ],
        limitations: [
          'limited-deployment-capabilities',
          'no-direct-database-access',
        ],
        templates: ['react-component', 'api-endpoint', 'utility-function'],
      },
      {
        agentType: 'copilot',
        supportedRoles: ['senior-developer', 'code-review'],
        capabilities: [
          'code-completion',
          'suggestion-generation',
          'pattern-recognition',
          'best-practices',
        ],
        limitations: [
          'no-workflow-management',
          'limited-architecture-planning',
        ],
        templates: ['code-snippet', 'function-template', 'class-template'],
      },
      {
        agentType: 'roocode',
        supportedRoles: [
          'architect',
          'senior-developer',
          'integration-engineer',
        ],
        capabilities: [
          'workflow-automation',
          'deployment-management',
          'integration-planning',
          'monitoring-setup',
        ],
        limitations: ['limited-code-generation', 'no-quality-review'],
        templates: [
          'deployment-workflow',
          'integration-template',
          'monitoring-setup',
        ],
      },
      {
        agentType: 'kilocode',
        supportedRoles: ['product-manager', 'architect', 'senior-developer'],
        capabilities: [
          'advanced-automation',
          'complex-workflow-management',
          'ai-integration',
          'performance-optimization',
        ],
        limitations: ['requires-high-compute', 'complex-setup'],
        templates: [
          'ai-workflow',
          'performance-optimization',
          'complex-automation',
        ],
      },
    ];

    for (const capability of capabilities) {
      this.agentCapabilities.set(capability.agentType, capability);
    }
  }

  getRole(roleId: string): WorkflowRole | null {
    return this.roles.get(roleId) || null;
  }

  getAllRoles(): WorkflowRole[] {
    return Array.from(this.roles.values());
  }

  getRolesForAgent(agentType: string): WorkflowRole[] {
    const capabilities = this.agentCapabilities.get(agentType);
    if (!capabilities) return [];

    return capabilities.supportedRoles
      .map((roleId) => this.roles.get(roleId))
      .filter((role): role is WorkflowRole => role !== undefined);
  }

  getNextRoles(currentRoleId: string): WorkflowRole[] {
    const currentRole = this.roles.get(currentRoleId);
    if (!currentRole) return [];

    return currentRole.nextRoles
      .map((roleId) => this.roles.get(roleId))
      .filter((role): role is WorkflowRole => role !== undefined);
  }

  canTransition(fromRoleId: string, toRoleId: string): boolean {
    const fromRole = this.roles.get(fromRoleId);
    return fromRole ? fromRole.nextRoles.includes(toRoleId) : false;
  }

  getRoleGuidance(
    roleId: string,
    context: Record<string, any>
  ): {
    role: WorkflowRole;
    guidance: string[];
    qualityGates: string[];
    nextSteps: string[];
  } {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    const guidance = this.generateRoleGuidance(role, context);
    const qualityGates = role.qualityGates;
    const nextSteps = this.generateNextSteps(role, context);

    return {
      role,
      guidance,
      qualityGates,
      nextSteps,
    };
  }

  private generateRoleGuidance(
    role: WorkflowRole,
    context: Record<string, any>
  ): string[] {
    const guidance: string[] = [];

    switch (role.name) {
      case 'product-manager':
        guidance.push(
          'Focus on business value and user requirements',
          'Ensure clear communication with stakeholders',
          'Define measurable success criteria',
          'Prioritize features based on impact'
        );
        break;
      case 'architect':
        guidance.push(
          'Design for scalability and maintainability',
          'Consider security implications early',
          'Plan for future extensibility',
          'Document architectural decisions'
        );
        break;
      case 'senior-developer':
        guidance.push(
          'Write clean, self-documenting code',
          'Follow SOLID principles',
          'Write comprehensive tests',
          'Optimize for performance'
        );
        break;
      case 'code-review':
        guidance.push(
          'Check for security vulnerabilities',
          'Validate code quality and standards',
          'Ensure proper error handling',
          'Verify test coverage'
        );
        break;
      case 'integration-engineer':
        guidance.push(
          'Ensure smooth deployment process',
          'Set up proper monitoring',
          'Validate integration points',
          'Prepare rollback procedures'
        );
        break;
    }

    return guidance;
  }

  private generateNextSteps(
    role: WorkflowRole,
    context: Record<string, any>
  ): string[] {
    const nextSteps: string[] = [];

    switch (role.name) {
      case 'product-manager':
        nextSteps.push(
          'Gather detailed requirements',
          'Create user stories',
          'Define acceptance criteria'
        );
        break;
      case 'architect':
        nextSteps.push(
          'Create system diagram',
          'Select technology stack',
          'Define API contracts'
        );
        break;
      case 'senior-developer':
        nextSteps.push(
          'Implement core features',
          'Write unit tests',
          'Create integration tests'
        );
        break;
      case 'code-review':
        nextSteps.push(
          'Review code quality',
          'Check security issues',
          'Validate performance'
        );
        break;
      case 'integration-engineer':
        nextSteps.push(
          'Deploy to staging',
          'Run integration tests',
          'Monitor system health'
        );
        break;
    }

    return nextSteps;
  }

  createRoleTransition(
    fromRoleId: string,
    toRoleId: string,
    context: Record<string, any>,
    handoffNotes: string
  ): RoleTransition {
    return {
      fromRole: fromRoleId,
      toRole: toRoleId,
      timestamp: new Date().toISOString(),
      context,
      handoffNotes,
    };
  }

  validateRoleTransition(
    execution: WorkflowExecution,
    toRoleId: string
  ): {
    valid: boolean;
    reason?: string;
    requirements?: string[];
  } {
    const currentRole = this.roles.get(execution.currentRole);
    const targetRole = this.roles.get(toRoleId);

    if (!currentRole || !targetRole) {
      return { valid: false, reason: 'Invalid role specified' };
    }

    if (!this.canTransition(execution.currentRole, toRoleId)) {
      return {
        valid: false,
        reason: `Cannot transition from ${currentRole.displayName} to ${targetRole.displayName}`,
        requirements: currentRole.nextRoles,
      };
    }

    // Check if quality gates are met
    const unmetGates = currentRole.qualityGates.filter(
      (gate) => !execution.context['qualityGates']?.includes(gate)
    );

    if (unmetGates.length > 0) {
      return {
        valid: false,
        reason: 'Quality gates not met',
        requirements: unmetGates,
      };
    }

    return { valid: true };
  }

  getAgentCapabilities(agentType: string): AgentCapabilities | null {
    return this.agentCapabilities.get(agentType) || null;
  }

  getAllAgentCapabilities(): AgentCapabilities[] {
    return Array.from(this.agentCapabilities.values());
  }
}
