import type { StorageInterface } from './storage-interface';
import type { Workflow } from './types';

export interface WorkflowTrigger {
  id: string;
  name: string;
  confidence: number;
  workflowId: string;
  variables: Record<string, string>;
  reasoning: string;
  autoExecute: boolean;
}

export interface AutoWorkflowResult {
  detected: boolean;
  triggers: WorkflowTrigger[];
  suggestions: string[];
  autoExecuted: WorkflowTrigger[];
}

export class AutoWorkflowDetector {
  private storage: StorageInterface;
  private triggerPatterns: Map<string, WorkflowPattern>;

  constructor(storage: StorageInterface) {
    this.storage = storage;
    this.triggerPatterns = new Map();
    this.initializePatterns();
  }

  /**
   * Analyze user input and detect potential workflow triggers
   */
  async analyzeInput(
    userInput: string,
    context: {
      projectPath?: string;
      currentFile?: string;
      projectType?: string;
    } = {}
  ): Promise<AutoWorkflowResult> {
    const normalizedInput = userInput.toLowerCase().trim();

    // Find matching patterns
    const triggers: WorkflowTrigger[] = [];
    const suggestions: string[] = [];

    for (const [, pattern] of this.triggerPatterns) {
      const match = this.matchPattern(normalizedInput, pattern);
      if (match) {
        const workflow = await this.findBestWorkflow(pattern, context);
        if (workflow) {
          const trigger: WorkflowTrigger = {
            id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: pattern.name,
            confidence: match.confidence,
            workflowId: workflow.id,
            variables: this.extractVariables(normalizedInput, pattern, match.groups),
            reasoning: this.generateReasoning(pattern, match),
            autoExecute: pattern.autoExecute && match.confidence > 0.8,
          };
          triggers.push(trigger);
        }
      }
    }

    // Generate suggestions for unmatched patterns
    if (triggers.length === 0) {
      suggestions.push(...this.generateSuggestions(normalizedInput));
    }

    // Auto-execute high-confidence triggers
    const autoExecuted = triggers.filter((trigger) => trigger.autoExecute);

    return {
      detected: triggers.length > 0,
      triggers,
      suggestions,
      autoExecuted,
    };
  }

  /**
   * Execute a detected workflow automatically
   */
  async executeWorkflow(trigger: WorkflowTrigger, context: Record<string, unknown>) {
    try {
      // Get the workflow from storage
      const workflow = await this.storage.getWorkflow(trigger.workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${trigger.workflowId} not found`);
      }

      // Create execution context
      const executionContext = {
        projectPath: context.projectPath || process.cwd(),
        projectType: context.projectType || 'general',
        frameworks: context.frameworks || [],
        qualityLevel: 'moderate' as const,
        ...trigger.variables,
      };

      // Execute the workflow
      const result = await this.executeWorkflowSteps(workflow, executionContext, trigger.variables);

      return {
        success: result.success,
        executionId: result.executionId,
        message: `Auto-executed workflow: ${trigger.name}`,
        variables: trigger.variables,
        results: result.results,
        errors: result.errors,
      };
    } catch (error) {
      return {
        success: false,
        executionId: '',
        message: `Failed to execute workflow: ${error}`,
        variables: trigger.variables,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeWorkflowSteps(
    workflow: Workflow,
    _context: Record<string, unknown>,
    variables: Record<string, string>
  ) {
    const results: Array<{
      step: string;
      result: string;
      success: boolean;
    }> = [];
    const errors: string[] = [];
    let success = true;

    // Sort steps by order
    const sortedSteps = [...workflow.steps].sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      try {
        const result = await this.executeStep(step, variables);
        results.push({
          step: step.name,
          result: result.message,
          success: true,
        });
      } catch (error) {
        const errorMsg = `Step ${step.name} failed: ${error}`;
        errors.push(errorMsg);
        results.push({
          step: step.name,
          result: errorMsg,
          success: false,
        });
        success = false;
      }
    }

    return {
      success,
      executionId: `exec_${Date.now()}`,
      results,
      errors,
    };
  }

  private async executeStep(
    step: {
      name: string;
      action: string;
      filePath?: string;
      template?: string;
    },
    _variables: Record<string, string>
  ) {
    // This is a simplified step execution
    // In a real implementation, this would integrate with the actual workflow engine

    switch (step.action) {
      case 'create':
        return {
          message: `Created ${step.filePath} using template ${step.template}`,
          success: true,
        };
      case 'modify':
        return {
          message: `Modified ${step.filePath}`,
          success: true,
        };
      case 'test':
        return {
          message: `Created test file ${step.filePath}`,
          success: true,
        };
      case 'validate':
        return {
          message: `Validated ${step.filePath}`,
          success: true,
        };
      default:
        return {
          message: `Executed step: ${step.name}`,
          success: true,
        };
    }
  }

  private initializePatterns() {
    // UI Component Patterns
    this.triggerPatterns.set('build_button', {
      id: 'build_button',
      name: 'Build Button Component',
      patterns: [
        /build\s+(a\s+)?button/i,
        /create\s+(a\s+)?button/i,
        /make\s+(a\s+)?button/i,
        /button\s+component/i,
        /ui\s+button/i,
      ],
      workflowTags: ['ui', 'component', 'button', 'react'],
      autoExecute: true,
      confidence: 0.9,
      variables: {
        componentType: 'button',
        framework: 'react',
      },
    });

    this.triggerPatterns.set('build_form', {
      id: 'build_form',
      name: 'Build Form Component',
      patterns: [
        /build\s+(a\s+)?form/i,
        /create\s+(a\s+)?form/i,
        /make\s+(a\s+)?form/i,
        /form\s+component/i,
        /input\s+form/i,
      ],
      workflowTags: ['ui', 'component', 'form', 'react'],
      autoExecute: true,
      confidence: 0.9,
      variables: {
        componentType: 'form',
        framework: 'react',
      },
    });

    this.triggerPatterns.set('build_modal', {
      id: 'build_modal',
      name: 'Build Modal Component',
      patterns: [
        /build\s+(a\s+)?modal/i,
        /create\s+(a\s+)?modal/i,
        /make\s+(a\s+)?modal/i,
        /modal\s+component/i,
        /popup\s+component/i,
        /dialog\s+component/i,
      ],
      workflowTags: ['ui', 'component', 'modal', 'react'],
      autoExecute: true,
      confidence: 0.9,
      variables: {
        componentType: 'modal',
        framework: 'react',
      },
    });

    // API Patterns
    this.triggerPatterns.set('build_api', {
      id: 'build_api',
      name: 'Build API Endpoint',
      patterns: [
        /build\s+(an\s+)?api/i,
        /create\s+(an\s+)?api/i,
        /make\s+(an\s+)?api/i,
        /api\s+endpoint/i,
        /rest\s+api/i,
        /endpoint/i,
      ],
      workflowTags: ['api', 'backend', 'endpoint', 'express'],
      autoExecute: true,
      confidence: 0.9,
      variables: {
        componentType: 'api',
        framework: 'express',
      },
    });

    this.triggerPatterns.set('build_crud', {
      id: 'build_crud',
      name: 'Build CRUD Operations',
      patterns: [
        /build\s+crud/i,
        /create\s+crud/i,
        /make\s+crud/i,
        /crud\s+operations/i,
        /full\s+crud/i,
      ],
      workflowTags: ['api', 'crud', 'database', 'backend'],
      autoExecute: true,
      confidence: 0.9,
      variables: {
        componentType: 'crud',
        framework: 'express',
      },
    });

    // Database Patterns
    this.triggerPatterns.set('setup_database', {
      id: 'setup_database',
      name: 'Setup Database Schema',
      patterns: [
        /setup\s+database/i,
        /create\s+database/i,
        /database\s+schema/i,
        /migration/i,
        /prisma\s+schema/i,
      ],
      workflowTags: ['database', 'schema', 'migration', 'prisma'],
      autoExecute: false,
      confidence: 0.8,
      variables: {
        componentType: 'database',
        framework: 'prisma',
      },
    });

    // Testing Patterns
    this.triggerPatterns.set('write_tests', {
      id: 'write_tests',
      name: 'Write Unit Tests',
      patterns: [
        /write\s+tests/i,
        /create\s+tests/i,
        /make\s+tests/i,
        /unit\s+tests/i,
        /test\s+suite/i,
        /jest\s+tests/i,
      ],
      workflowTags: ['testing', 'unit', 'jest', 'vitest'],
      autoExecute: false,
      confidence: 0.8,
      variables: {
        componentType: 'tests',
        framework: 'jest',
      },
    });

    // Authentication Patterns
    this.triggerPatterns.set('setup_auth', {
      id: 'setup_auth',
      name: 'Setup Authentication',
      patterns: [
        /setup\s+auth/i,
        /create\s+auth/i,
        /make\s+auth/i,
        /authentication/i,
        /login\s+system/i,
        /jwt\s+auth/i,
      ],
      workflowTags: ['auth', 'authentication', 'security', 'jwt'],
      autoExecute: false,
      confidence: 0.8,
      variables: {
        componentType: 'auth',
        framework: 'jwt',
      },
    });

    // Styling Patterns
    this.triggerPatterns.set('add_styling', {
      id: 'add_styling',
      name: 'Add Styling',
      patterns: [
        /add\s+styling/i,
        /style\s+component/i,
        /css\s+styling/i,
        /tailwind\s+styling/i,
        /make\s+it\s+pretty/i,
      ],
      workflowTags: ['styling', 'css', 'tailwind', 'ui'],
      autoExecute: true,
      confidence: 0.7,
      variables: {
        componentType: 'styling',
        framework: 'tailwind',
      },
    });

    // Performance Patterns
    this.triggerPatterns.set('optimize_performance', {
      id: 'optimize_performance',
      name: 'Optimize Performance',
      patterns: [
        /optimize\s+performance/i,
        /make\s+it\s+faster/i,
        /performance\s+optimization/i,
        /speed\s+up/i,
        /lazy\s+loading/i,
      ],
      workflowTags: ['performance', 'optimization', 'speed'],
      autoExecute: false,
      confidence: 0.7,
      variables: {
        componentType: 'optimization',
        framework: 'react',
      },
    });

    // Project Analysis Patterns
    this.triggerPatterns.set('analyze_project', {
      id: 'analyze_project',
      name: 'Analyze Project',
      patterns: [
        /analyze\s+(the\s+)?project/i,
        /analyze\s+codebase/i,
        /project\s+analysis/i,
        /code\s+analysis/i,
        /analyze\s+code/i,
        /review\s+project/i,
        /audit\s+project/i,
        /inspect\s+project/i,
        /analyzed\s+(the\s+)?project/i,
        /analyzed\s+codebase/i,
        /analyzed\s+code/i,
      ],
      workflowTags: ['analysis', 'project', 'code-review', 'audit'],
      autoExecute: false,
      confidence: 0.9,
      variables: {
        componentType: 'analysis',
        framework: 'general',
      },
    });

    // Refactoring Patterns
    this.triggerPatterns.set('refactor_code', {
      id: 'refactor_code',
      name: 'Refactor Code',
      patterns: [
        /refactor\s+(the\s+)?code/i,
        /refactor\s+project/i,
        /refactor\s+codebase/i,
        /code\s+refactoring/i,
        /refactor/i,
        /restructure\s+code/i,
        /improve\s+code\s+structure/i,
        /clean\s+up\s+code/i,
      ],
      workflowTags: ['refactoring', 'code-improvement', 'cleanup'],
      autoExecute: false,
      confidence: 0.9,
      variables: {
        componentType: 'refactoring',
        framework: 'general',
      },
    });

    // Cleanup Patterns
    this.triggerPatterns.set('cleanup_project', {
      id: 'cleanup_project',
      name: 'Clean Up Project',
      patterns: [
        /clean\s+up\s+(the\s+)?project/i,
        /clean\s+up\s+code/i,
        /remove\s+unused\s+code/i,
        /remove\s+unused\s+files/i,
        /remove\s+unused\s+imports/i,
        /remove\s+unused\s+variables/i,
        /remove\s+unused\s+functions/i,
        /remove\s+unused\s+classes/i,
        /remove\s+unused\s+interfaces/i,
        /remove\s+unused\s+types/i,
        /remove\s+unused\s+enums/i,
        /remove\s+unused\s+constants/i,
        /clean\s+up/i,
        /cleanup/i,
        /remove\s+dead\s+code/i,
        /remove\s+commented\s+code/i,
        /remove\s+duplicate\s+code/i,
        /consolidate\s+code/i,
        /optimize\s+imports/i,
        /organize\s+code/i,
        /see\s+what's\s+not\s+used/i,
        /what's\s+not\s+used/i,
        /not\s+used/i,
        /unused/i,
      ],
      workflowTags: ['cleanup', 'unused-code', 'code-optimization', 'maintenance'],
      autoExecute: false,
      confidence: 0.9,
      variables: {
        componentType: 'cleanup',
        framework: 'general',
      },
    });

    // Code Quality Patterns
    this.triggerPatterns.set('improve_code_quality', {
      id: 'improve_code_quality',
      name: 'Improve Code Quality',
      patterns: [
        /improve\s+code\s+quality/i,
        /fix\s+code\s+quality/i,
        /enhance\s+code\s+quality/i,
        /code\s+quality\s+improvement/i,
        /quality\s+assurance/i,
        /code\s+standards/i,
        /enforce\s+standards/i,
        /apply\s+best\s+practices/i,
        /follow\s+conventions/i,
        /standardize\s+code/i,
        /improve\s+quality/i,
        /fix\s+quality/i,
        /enhance\s+quality/i,
      ],
      workflowTags: ['quality', 'standards', 'best-practices', 'conventions'],
      autoExecute: false,
      confidence: 0.8,
      variables: {
        componentType: 'quality',
        framework: 'general',
      },
    });

    // Documentation Patterns
    this.triggerPatterns.set('improve_documentation', {
      id: 'improve_documentation',
      name: 'Improve Documentation',
      patterns: [
        /improve\s+documentation/i,
        /update\s+documentation/i,
        /add\s+documentation/i,
        /create\s+documentation/i,
        /write\s+documentation/i,
        /document\s+code/i,
        /add\s+comments/i,
        /improve\s+comments/i,
        /add\s+jsdoc/i,
        /add\s+readme/i,
      ],
      workflowTags: ['documentation', 'comments', 'readme', 'jsdoc'],
      autoExecute: false,
      confidence: 0.8,
      variables: {
        componentType: 'documentation',
        framework: 'general',
      },
    });
  }

  private matchPattern(input: string, pattern: WorkflowPattern): PatternMatch | null {
    for (const regex of pattern.patterns) {
      const match = input.match(regex);
      if (match) {
        return {
          confidence: pattern.confidence,
          groups: match.groups || {},
          matchedPattern: regex.source,
        };
      }
    }
    return null;
  }

  private async findBestWorkflow(
    pattern: WorkflowPattern,
    _context: Record<string, unknown>
  ): Promise<Workflow | null> {
    // Search for workflows that match the pattern tags
    const workflows = await this.storage.listWorkflows();

    // Filter workflows by tags
    const matchingWorkflows = workflows.filter((workflow) =>
      pattern.workflowTags.some((tag) =>
        workflow.tags.some((workflowTag) => workflowTag.toLowerCase().includes(tag.toLowerCase()))
      )
    );

    if (matchingWorkflows.length === 0) {
      return null;
    }

    // Return the first matching workflow (could be improved with better scoring)
    return matchingWorkflows[0] || null;
  }

  private extractVariables(
    input: string,
    pattern: WorkflowPattern,
    _groups: Record<string, string>
  ): Record<string, string> {
    const variables: Record<string, string> = { ...pattern.variables };

    // Extract component name if mentioned
    const componentNameMatch = input.match(/(?:build|create|make)\s+(?:a\s+)?(\w+)/i);
    if (componentNameMatch?.[1]) {
      variables.componentName = this.capitalizeFirst(componentNameMatch[1]);
    }

    // Extract framework if mentioned
    const frameworkMatch = input.match(/(react|vue|angular|svelte|next|nuxt)/i);
    if (frameworkMatch?.[1]) {
      variables.framework = frameworkMatch[1].toLowerCase();
    }

    // Extract styling framework if mentioned
    const stylingMatch = input.match(/(tailwind|css|scss|styled-components|emotion)/i);
    if (stylingMatch?.[1]) {
      variables.stylingFramework = stylingMatch[1].toLowerCase();
    }

    return variables;
  }

  private generateReasoning(pattern: WorkflowPattern, match: PatternMatch): string {
    return `Detected pattern "${pattern.name}" with ${(match.confidence * 100).toFixed(
      0
    )}% confidence. Matched: "${match.matchedPattern}"`;
  }

  private generateSuggestions(input: string): string[] {
    const suggestions: string[] = [];

    // Add keyword-based suggestions
    suggestions.push(...this.getKeywordSuggestions(input));

    // Add generic suggestions
    suggestions.push('Try: "build a [component name]" or "create [feature name]"');
    suggestions.push(
      'Examples: "build a button", "create a form", "analyze the project", "refactor code"'
    );

    return suggestions;
  }

  private getKeywordSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    const keywordMap = new Map([
      [['ui', 'component'], 'Try: "build a button component" or "create a form"'],
      [['api', 'backend'], 'Try: "build an API endpoint" or "create CRUD operations"'],
      [['test', 'testing'], 'Try: "write unit tests" or "create test suite"'],
      [['auth', 'login'], 'Try: "setup authentication" or "create login system"'],
      [['style', 'css'], 'Try: "add styling" or "style component"'],
      [['analyze', 'analysis'], 'Try: "analyze the project" or "analyze codebase"'],
      [['refactor', 'refactoring'], 'Try: "refactor the code" or "refactor project"'],
      [['clean', 'cleanup', 'unused'], 'Try: "clean up the project" or "remove unused code"'],
      [['quality', 'standards'], 'Try: "improve code quality" or "apply best practices"'],
      [['document', 'comment'], 'Try: "improve documentation" or "add comments"'],
    ]);

    for (const [keywords, suggestion] of keywordMap) {
      if (keywords.some((keyword) => input.includes(keyword))) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

interface WorkflowPattern {
  id: string;
  name: string;
  patterns: RegExp[];
  workflowTags: string[];
  autoExecute: boolean;
  confidence: number;
  variables: Record<string, string>;
}

interface PatternMatch {
  confidence: number;
  groups: Record<string, string>;
  matchedPattern: string;
}
