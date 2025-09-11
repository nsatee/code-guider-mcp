/**
 * Anubis-MCP Style Role System
 * Inspired by https://github.com/Hive-Academy/Anubis-MCP
 *
 * Provides intelligent role-based workflow guidance for AI agents
 */

export interface AnubisRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  capabilities: string[];
  responsibilities: string[];
  context: Record<string, unknown>;
  qualityGates: string[];
  nextRoles: string[];
  agentType: 'cursor' | 'copilot' | 'roocode' | 'kilocode' | 'general';
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

export interface AnubisWorkflowExecution {
  id: string;
  workflowId: string;
  currentRole: string;
  completedSteps: string[];
  currentStep: string;
  context: Record<string, unknown>;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'waiting';
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  metrics: {
    filesCreated: number;
    filesModified: number;
    testsWritten: number;
    coverage: number;
    qualityScore: number;
  };
  roleHistory: AnubisRoleTransition[];
}

export interface AnubisRoleTransition {
  fromRole: string;
  toRole: string;
  timestamp: string;
  context: Record<string, unknown>;
  handoffNotes: string;
  decisions: string[];
  rationale: string;
}

export interface AnubisGuidance {
  step: string;
  approach: string[];
  qualityChecklist: string[];
  context: {
    previousDecisions: string[];
    nextRole: string;
    rationale: string;
  };
  templates: string[];
  examples: string[];
  bestPractices: string[];
}

/**
 * Anubis Role Definitions
 * Based on the proven Anubis-MCP architecture
 */
export const ANUBIS_ROLES: Record<string, AnubisRole> = {
  'product-manager': {
    id: 'product-manager',
    name: 'product-manager',
    displayName: 'Product Manager',
    description: 'Strategic orchestration and project management',
    capabilities: [
      'Project setup and initialization',
      'Task creation and prioritization',
      'Workflow management and coordination',
      'Stakeholder communication',
      'Requirements gathering and analysis',
    ],
    responsibilities: [
      'Define project scope and objectives',
      'Create and manage development tasks',
      'Coordinate between different roles',
      'Ensure business requirements are met',
      'Monitor project progress and quality',
    ],
    context: {
      focus: 'strategic',
      level: 'high-level',
      perspective: 'business',
    },
    qualityGates: [
      'Clear project objectives defined',
      'Requirements documented and validated',
      'Success criteria established',
      'Timeline and milestones planned',
    ],
    nextRoles: ['architect'],
    agentType: 'general',
  },
  architect: {
    id: 'architect',
    name: 'architect',
    displayName: 'System Architect',
    description: 'Technical architecture and system design',
    capabilities: [
      'System architecture design',
      'Technology stack selection',
      'Database design and modeling',
      'API design and specification',
      'Security architecture planning',
    ],
    responsibilities: [
      'Design overall system architecture',
      'Select appropriate technologies',
      'Define data models and relationships',
      'Plan security and performance requirements',
      'Create technical specifications',
    ],
    context: {
      focus: 'technical',
      level: 'system',
      perspective: 'architecture',
    },
    qualityGates: [
      'Architecture documented and validated',
      'Technology stack justified',
      'Data models designed',
      'Security considerations addressed',
      'Performance requirements defined',
    ],
    nextRoles: ['senior-developer'],
    agentType: 'general',
  },
  'senior-developer': {
    id: 'senior-developer',
    name: 'senior-developer',
    displayName: 'Senior Developer',
    description: 'High-quality implementation and code manifestation',
    capabilities: [
      'Advanced code implementation',
      'Design pattern application',
      'Code optimization and refactoring',
      'Testing strategy and implementation',
      'Code review and mentoring',
    ],
    responsibilities: [
      'Implement complex features and functionality',
      'Apply best practices and design patterns',
      'Write comprehensive tests',
      'Optimize code for performance',
      'Mentor junior developers',
    ],
    context: {
      focus: 'implementation',
      level: 'detailed',
      perspective: 'development',
    },
    qualityGates: [
      'Code follows SOLID principles',
      'Unit tests coverage > 80%',
      'Integration tests implemented',
      'Code is well-documented',
      'Performance requirements met',
    ],
    nextRoles: ['code-review'],
    agentType: 'cursor',
  },
  'code-review': {
    id: 'code-review',
    name: 'code-review',
    displayName: 'Code Review Specialist',
    description: 'Quality guardian and security validation',
    capabilities: [
      'Code quality assessment',
      'Security vulnerability detection',
      'Performance analysis',
      'Best practices validation',
      'Documentation review',
    ],
    responsibilities: [
      'Review code for quality and security',
      'Validate adherence to standards',
      'Identify potential issues and improvements',
      'Ensure compliance with requirements',
      'Approve or request changes',
    ],
    context: {
      focus: 'quality',
      level: 'validation',
      perspective: 'review',
    },
    qualityGates: [
      'Security vulnerabilities addressed',
      'Code quality standards met',
      'Performance benchmarks achieved',
      'Documentation is complete',
      'All tests passing',
    ],
    nextRoles: ['integration-engineer'],
    agentType: 'general',
  },
  'integration-engineer': {
    id: 'integration-engineer',
    name: 'integration-engineer',
    displayName: 'Integration Engineer',
    description: 'System integration and delivery preparation',
    capabilities: [
      'System integration testing',
      'Deployment preparation',
      'Environment configuration',
      'Monitoring and logging setup',
      'Documentation finalization',
    ],
    responsibilities: [
      'Integrate all system components',
      'Prepare deployment packages',
      'Configure production environments',
      'Set up monitoring and alerting',
      'Create deployment documentation',
    ],
    context: {
      focus: 'integration',
      level: 'system',
      perspective: 'delivery',
    },
    qualityGates: [
      'All components integrated successfully',
      'Deployment process validated',
      'Monitoring and logging configured',
      'Documentation is complete',
      'Production readiness confirmed',
    ],
    nextRoles: [],
    agentType: 'general',
  },
};

/**
 * Cursor-specific role enhancements
 */
export const CURSOR_ROLE_ENHANCEMENTS: Record<string, Partial<AnubisRole>> = {
  'senior-developer': {
    capabilities: [
      'Advanced TypeScript implementation',
      'React component architecture',
      'State management patterns',
      'API integration and data fetching',
      'Performance optimization',
      'Accessibility implementation',
      'Testing with Jest and React Testing Library',
    ],
    context: {
      focus: 'implementation',
      level: 'detailed',
      perspective: 'development',
      framework: 'react',
      language: 'typescript',
      testing: 'jest',
    },
    qualityGates: [
      'TypeScript types are comprehensive',
      'React components are properly structured',
      'State management is efficient',
      'API integration is robust',
      'Performance is optimized',
      'Accessibility standards are met',
      'Test coverage is > 80%',
    ],
  },
};

/**
 * Generate intelligent guidance for a specific role and step
 */
export function generateAnubisGuidance(
  roleId: string,
  stepId: string,
  context: Record<string, unknown>,
  agentType: 'cursor' | 'copilot' | 'roocode' | 'kilocode' = 'cursor'
): AnubisGuidance {
  const role = ANUBIS_ROLES[roleId];
  if (!role) {
    throw new Error(`Unknown role: ${roleId}`);
  }

  // Apply Cursor-specific enhancements
  const enhancedRole =
    agentType === 'cursor' && CURSOR_ROLE_ENHANCEMENTS[roleId]
      ? { ...role, ...CURSOR_ROLE_ENHANCEMENTS[roleId] }
      : role;

  return {
    step: stepId,
    approach: enhancedRole.capabilities,
    qualityChecklist: enhancedRole.qualityGates,
    context: {
      previousDecisions: (context.previousDecisions as string[]) || [],
      nextRole: enhancedRole.nextRoles[0] || '',
      rationale: `Executing ${enhancedRole.displayName} responsibilities for ${stepId}`,
    },
    templates: getTemplatesForRole(roleId, agentType),
    examples: getExamplesForRole(roleId, agentType),
    bestPractices: getBestPracticesForRole(roleId, agentType),
  };
}

/**
 * Get templates specific to role and agent type
 */
function getTemplatesForRole(roleId: string, agentType: string): string[] {
  const templates: Record<string, string[]> = {
    'product-manager': ['project-setup', 'requirements-gathering', 'stakeholder-communication'],
    architect: ['system-design', 'api-specification', 'database-schema'],
    'senior-developer': ['component-implementation', 'api-integration', 'testing-strategy'],
    'code-review': ['quality-checklist', 'security-review', 'performance-analysis'],
    'integration-engineer': ['deployment-config', 'monitoring-setup', 'documentation'],
  };

  const cursorTemplates: Record<string, string[]> = {
    'senior-developer': [
      'cursor-react-component',
      'cursor-api-route',
      'cursor-testing-patterns',
      'cursor-typescript-patterns',
    ],
  };

  const baseTemplates = templates[roleId] || [];
  const agentTemplates = agentType === 'cursor' ? cursorTemplates[roleId] || [] : [];

  return [...baseTemplates, ...agentTemplates];
}

/**
 * Get examples specific to role and agent type
 */
function getExamplesForRole(roleId: string, agentType: string): string[] {
  const examples: Record<string, string[]> = {
    'product-manager': ['Project scope definition', 'User story creation', 'Acceptance criteria'],
    architect: ['System architecture diagram', 'API endpoint design', 'Database schema'],
    'senior-developer': ['Component implementation', 'Service layer design', 'Test cases'],
    'code-review': ['Code quality report', 'Security assessment', 'Performance metrics'],
    'integration-engineer': [
      'Deployment pipeline',
      'Environment configuration',
      'Monitoring setup',
    ],
  };

  const cursorExamples: Record<string, string[]> = {
    'senior-developer': [
      'React component with TypeScript',
      'API service with error handling',
      'Comprehensive test suite',
      'Performance optimized implementation',
    ],
  };

  const baseExamples = examples[roleId] || [];
  const agentExamples = agentType === 'cursor' ? cursorExamples[roleId] || [] : [];

  return [...baseExamples, ...agentExamples];
}

/**
 * Get best practices specific to role and agent type
 */
function getBestPracticesForRole(roleId: string, agentType: string): string[] {
  const bestPractices: Record<string, string[]> = {
    'product-manager': ['Clear requirements', 'Stakeholder alignment', 'Progress tracking'],
    architect: ['SOLID principles', 'Scalable design', 'Security first'],
    'senior-developer': ['Clean code', 'Test-driven development', 'Performance optimization'],
    'code-review': ['Thorough review', 'Security focus', 'Quality standards'],
    'integration-engineer': ['Reliable deployment', 'Comprehensive monitoring', 'Documentation'],
  };

  const cursorBestPractices: Record<string, string[]> = {
    'senior-developer': [
      'TypeScript strict mode',
      'React best practices',
      'Component composition',
      'State management patterns',
      'Accessibility standards',
      'Performance optimization',
      'Comprehensive testing',
    ],
  };

  const basePractices = bestPractices[roleId] || [];
  const agentPractices = agentType === 'cursor' ? cursorBestPractices[roleId] || [] : [];

  return [...basePractices, ...agentPractices];
}

/**
 * Create a new Anubis workflow execution
 */
export function createAnubisExecution(
  workflowId: string,
  initialRole: string = 'product-manager',
  context: Record<string, unknown> = {}
): AnubisWorkflowExecution {
  const now = new Date().toISOString();

  return {
    id: `anubis-${Date.now()}`,
    workflowId,
    currentRole: initialRole,
    completedSteps: [],
    currentStep: 'initialization',
    context,
    status: 'running',
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    metrics: {
      filesCreated: 0,
      filesModified: 0,
      testsWritten: 0,
      coverage: 0,
      qualityScore: 0,
    },
    roleHistory: [],
  };
}

/**
 * Transition to a different role in the workflow
 */
export function transitionToRole(
  execution: AnubisWorkflowExecution,
  toRole: string,
  handoffNotes: string,
  decisions: string[] = [],
  rationale: string = ''
): AnubisWorkflowExecution {
  const now = new Date().toISOString();

  const transition: AnubisRoleTransition = {
    fromRole: execution.currentRole,
    toRole,
    timestamp: now,
    context: execution.context,
    handoffNotes,
    decisions,
    rationale,
  };

  return {
    ...execution,
    currentRole: toRole,
    updatedAt: now,
    roleHistory: [...execution.roleHistory, transition],
  };
}

/**
 * Get the next available roles for the current execution
 */
export function getNextRoles(execution: AnubisWorkflowExecution): string[] {
  const currentRole = ANUBIS_ROLES[execution.currentRole];
  return currentRole?.nextRoles || [];
}

/**
 * Check if a role transition is valid
 */
export function isValidRoleTransition(fromRole: string, toRole: string): boolean {
  const role = ANUBIS_ROLES[fromRole];
  return role?.nextRoles.includes(toRole) ?? false;
}
