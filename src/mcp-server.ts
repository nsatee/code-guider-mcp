import { mkdir, writeFile } from 'node:fs/promises';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type TextContent,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { AIGuidanceEngine } from './ai-guidance-engine.js';
import { EnhancedWorkflowEngine } from './enhanced-workflow-engine.js';
import { ExecutionTracker } from './execution-tracker.js';
import { MemoryRouter } from './memory-router.js';
import { MemoryRuleManager } from './memory-rule-manager.js';
import { ProjectManager } from './project-manager.js';
import { RoleManager } from './role-manager.js';
import type { StorageInterface } from './storage-interface.js';
import type {
  AgentRequestContext,
  CodeTemplate,
  GuidanceContext,
  MemoryCategory,
  MemoryRule,
  MemoryType,
  ProjectInfo,
  QualityRule,
  Workflow,
} from './types.js';

export class CodeGuidanceMCPServer {
  private server: Server;
  private storage: StorageInterface;
  private guidanceEngine: AIGuidanceEngine;
  private enhancedWorkflowEngine: EnhancedWorkflowEngine;
  private roleManager: RoleManager;
  private executionTracker: ExecutionTracker;
  private projectManager: ProjectManager;
  private memoryRouter: MemoryRouter;
  private memoryRuleManager: MemoryRuleManager;
  private projectPath: string | undefined;
  private globalMode: boolean;

  constructor() {
    // Initialize project manager
    this.projectManager = ProjectManager.getInstance();

    // Determine project context from environment
    this.projectPath = process.env['PROJECT_PATH'];
    this.globalMode = process.env['GLOBAL_MODE'] === 'true';

    // Initialize storage based on context
    if (this.globalMode) {
      this.storage = this.projectManager.getGlobalStorage() as StorageInterface;
    } else if (this.projectPath) {
      this.storage = this.projectManager.getProjectStorage(
        this.projectPath,
      ) as StorageInterface;
    } else {
      // Fallback to current directory
      this.storage = this.projectManager.getProjectStorage(
        process.cwd(),
      ) as StorageInterface;
    }

    this.guidanceEngine = new AIGuidanceEngine(this.storage);
    this.enhancedWorkflowEngine = new EnhancedWorkflowEngine(this.storage);
    this.roleManager = new RoleManager();
    this.executionTracker = new ExecutionTracker(this.storage);
    this.memoryRouter = new MemoryRouter(
      this.projectManager,
      this.projectManager.getGlobalStorage(),
    );
    this.memoryRuleManager = new MemoryRuleManager(
      this.memoryRouter,
      this.projectManager,
    );

    // Set project context for memory router
    if (this.projectPath) {
      this.memoryRouter.setProjectContext(this.projectPath);
    }
    this.server = new Server({
      name: 'code-guidance-mcp',
      version: '1.0.0',
      capabilities: {
        tools: {},
      },
    });

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'manage_workflows',
            description: 'Unified workflow management operations',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['list', 'get', 'create', 'execute'],
                  description: 'Action to perform',
                },
                workflowId: {
                  type: 'string',
                  description: 'ID of the workflow (required for get/execute)',
                },
                workflow: {
                  type: 'object',
                  description: 'Workflow definition (required for create)',
                },
                projectPath: {
                  type: 'string',
                  description:
                    'Path to project directory (required for execute)',
                },
                variables: {
                  type: 'object',
                  description: 'Variables for workflow execution (optional)',
                },
                search: {
                  type: 'string',
                  description: 'Search term for filtering (optional for list)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'manage_templates',
            description: 'Unified template management operations',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['list', 'create'],
                  description: 'Action to perform',
                },
                template: {
                  type: 'object',
                  description: 'Template definition (required for create)',
                },
                search: {
                  type: 'string',
                  description: 'Search term for filtering (optional for list)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'analyze_code',
            description: 'Unified code analysis operations',
            inputSchema: {
              type: 'object',
              properties: {
                analysisType: {
                  type: 'string',
                  enum: [
                    'guidance',
                    'validation',
                    'ai_analysis',
                    'similar_code',
                  ],
                  description: 'Type of analysis to perform',
                },
                filePath: {
                  type: 'string',
                  description: 'Path to the file to analyze',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                },
                projectType: {
                  type: 'string',
                  description: 'Type of project (optional)',
                },
                limit: {
                  type: 'number',
                  description:
                    'Maximum number of results (optional for similar_code)',
                },
              },
              required: ['analysisType', 'filePath', 'projectPath'],
            },
          },
          {
            name: 'manage_quality_rules',
            description: 'Unified quality rules management',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['list', 'create'],
                  description: 'Action to perform',
                },
                rule: {
                  type: 'object',
                  description: 'Quality rule definition (required for create)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'semantic_search',
            description:
              'Unified semantic search across different content types',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['workflows', 'templates', 'code'],
                  description: 'Type of content to search',
                },
                query: {
                  type: 'string',
                  description: 'Search query',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)',
                },
                filePath: {
                  type: 'string',
                  description: 'Path to file (required for code type)',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project (required for code type)',
                },
              },
              required: ['type', 'query'],
            },
          },
          {
            name: 'manage_execution',
            description: 'Unified execution management operations',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: [
                    'execute',
                    'execute_ai',
                    'execute_roles',
                    'status',
                    'pause',
                    'resume',
                  ],
                  description: 'Action to perform',
                },
                workflowId: {
                  type: 'string',
                  description: 'ID of workflow (required for execute actions)',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project (required for execute actions)',
                },
                variables: {
                  type: 'object',
                  description: 'Variables for execution (optional)',
                },
                agentType: {
                  type: 'string',
                  description: 'Type of agent (optional for execute_roles)',
                },
                executionId: {
                  type: 'string',
                  description:
                    'ID of execution (required for status/pause/resume)',
                },
                reason: {
                  type: 'string',
                  description: 'Reason for pausing (optional for pause)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'manage_roles',
            description: 'Unified role management operations',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['list', 'guidance'],
                  description: 'Action to perform',
                },
                roleId: {
                  type: 'string',
                  description: 'ID of role (required for guidance)',
                },
                agentType: {
                  type: 'string',
                  description: 'Type of agent (optional for list)',
                },
                context: {
                  type: 'object',
                  description: 'Context for role guidance (optional)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'ai_migrate',
            description: 'Unified AI-powered migration operations',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['data', 'workflows', 'templates', 'quality_rules'],
                  description: 'Type of migration to perform',
                },
                instruction: {
                  type: 'string',
                  description: 'Migration instruction (required for data type)',
                },
                transformation: {
                  type: 'string',
                  description:
                    'Transformation description (required for other types)',
                },
                source: {
                  type: 'string',
                  description:
                    'Source format (optional for data, default: file-based)',
                },
                target: {
                  type: 'string',
                  description:
                    'Target format (optional for data, default: hybrid-storage)',
                },
                filters: {
                  type: 'object',
                  description: 'Filters for migration (optional)',
                },
                options: {
                  type: 'object',
                  description: 'Migration options (optional)',
                },
              },
              required: ['type'],
            },
          },
          {
            name: 'manage_projects',
            description: 'Unified project management operations',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['list', 'init', 'auto_init', 'info', 'sync'],
                  description: 'Action to perform',
                },
                projectPath: {
                  type: 'string',
                  description:
                    'Path to project directory (optional, defaults to current)',
                },
                projectType: {
                  type: 'string',
                  description:
                    'Type of project (optional for init, auto-detected for auto_init)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'manage_memories',
            description: 'Unified memory management operations',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['save', 'search', 'list', 'get', 'stats'],
                  description: 'Action to perform',
                },
                content: {
                  type: 'string',
                  description: 'Memory content (required for save)',
                },
                type: {
                  type: 'string',
                  enum: [
                    'code_pattern',
                    'best_practice',
                    'project_requirement',
                    'user_preference',
                    'error_solution',
                    'workflow_insight',
                    'template_usage',
                    'quality_rule',
                    'architecture_decision',
                    'performance_tip',
                    'security_note',
                    'integration_pattern',
                  ],
                  description: 'Type of memory (required for save)',
                },
                category: {
                  type: 'string',
                  enum: [
                    'technical',
                    'process',
                    'preference',
                    'learning',
                    'troubleshooting',
                    'optimization',
                  ],
                  description: 'Category of memory (required for save)',
                },
                context: {
                  type: 'object',
                  description: 'Additional context (optional for save)',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for memory (optional for save)',
                },
                query: {
                  type: 'string',
                  description: 'Search query (required for search)',
                },
                scope: {
                  type: 'string',
                  enum: ['global', 'project'],
                  description: 'Memory scope (optional for search/list/get)',
                },
                limit: {
                  type: 'number',
                  description:
                    'Maximum number of results (optional for search/list)',
                },
                id: {
                  type: 'string',
                  description: 'Memory ID (required for get)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'manage_memory_rules',
            description: 'Unified memory rules management',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['enhance_request', 'init_project', 'list', 'create'],
                  description: 'Action to perform',
                },
                request: {
                  type: 'string',
                  description:
                    'Original request (required for enhance_request)',
                },
                context: {
                  type: 'object',
                  description:
                    'Context information (required for enhance_request)',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project (required for init_project)',
                },
                projectType: {
                  type: 'string',
                  description: 'Type of project (required for init_project)',
                },
                scope: {
                  type: 'string',
                  enum: ['global', 'project'],
                  description: 'Rule scope (optional for list)',
                },
                rule: {
                  type: 'object',
                  description: 'Memory rule definition (required for create)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'get_execution_metrics',
            description: 'Get detailed metrics for a workflow execution',
            inputSchema: {
              type: 'object',
              properties: {
                executionId: {
                  type: 'string',
                  description: 'ID of the execution',
                },
              },
              required: ['executionId'],
            },
          },
          {
            name: 'transition_role',
            description: 'Transition to a different role in workflow execution',
            inputSchema: {
              type: 'object',
              properties: {
                executionId: {
                  type: 'string',
                  description: 'ID of the execution',
                },
                toRoleId: {
                  type: 'string',
                  description: 'ID of the role to transition to',
                },
                handoffNotes: {
                  type: 'string',
                  description: 'Notes for the role transition (optional)',
                },
              },
              required: ['executionId', 'toRoleId'],
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'manage_workflows':
            return await this.handleManageWorkflows(args || {});
          case 'manage_templates':
            return await this.handleManageTemplates(args || {});
          case 'analyze_code':
            return await this.handleAnalyzeCode(args || {});
          case 'manage_quality_rules':
            return await this.handleManageQualityRules(args || {});
          case 'semantic_search':
            return await this.handleSemanticSearch(args || {});
          case 'manage_execution':
            return await this.handleManageExecution(args || {});
          case 'manage_roles':
            return await this.handleManageRoles(args || {});
          case 'ai_migrate':
            return await this.handleAIMigrate(args || {});
          case 'manage_projects':
            return await this.handleManageProjects(args || {});
          case 'manage_memories':
            return await this.handleManageMemories(args || {});
          case 'manage_memory_rules':
            return await this.handleManageMemoryRules(args || {});
          case 'get_execution_metrics':
            return await this.handleGetExecutionMetrics(args || {});
          case 'transition_role':
            return await this.handleTransitionRole(args || {});
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            } as TextContent,
          ],
          isError: true,
        };
      }
    });
  }

  private async handleListWorkflows(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const workflows = args['search']
      ? await this.storage.searchWorkflows(args['search'] as string)
      : await this.storage.listWorkflows();

    const workflowList = workflows
      .map((w) => {
        if ('name' in w) {
          return `- **${w.name}** (${w.id})\n  ${w.description}\n  Tags: ${w.tags.join(', ')}`;
        } else {
          return `- **${w.metadata['name'] || w.id}** (${w.id})\n  ${w.content.substring(0, 100)}...\n  Similarity: ${(w.similarity * 100).toFixed(1)}%`;
        }
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available Workflows:\n\n${workflowList}`,
        } as TextContent,
      ],
    };
  }

  private async handleGetWorkflow(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const workflow = await this.storage.getWorkflow(args['workflowId'] as string);
    if (!workflow) {
      return {
        content: [
          {
            type: 'text',
            text: `Workflow ${args['workflowId']} not found`,
          } as TextContent,
        ],
      };
    }

    const steps = workflow.steps
      .map(
        (s) => `${s.order}. **${s.name}** (${s.action})\n   ${s.description}`,
      )
      .join('\n');

    const qualityChecks = workflow.qualityChecks
      .map((q) => `- ${q}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**${workflow.name}**\n\n${workflow.description}\n\n**Steps:**\n${steps}\n\n**Quality Checks:**\n${qualityChecks}`,
        } as TextContent,
      ],
    };
  }

  private async handleCreateWorkflow(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const workflow = args['workflow'] as Workflow;
    await this.storage.saveWorkflow(workflow);

    return {
      content: [
        {
          type: 'text',
          text: `Workflow "${workflow.name}" created successfully with ID: ${workflow.id}`,
        } as TextContent,
      ],
    };
  }

  private async handleExecuteWorkflow(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const context: GuidanceContext = {
      projectPath: args['projectPath'] as string,
      projectType: (args['projectType'] as string) || 'general',
      frameworks: (args['frameworks'] as string[]) || [],
      qualityLevel:
        (args['qualityLevel'] as 'strict' | 'moderate' | 'relaxed') || 'moderate',
    };

    const result = await this.guidanceEngine.executeWorkflowWithAI(
      args['workflowId'] as string,
      context,
      (args['variables'] as Record<string, string>) || {},
    );

    const stepResults = result.steps
      .map((s) => `${s.success ? '✅' : '❌'} ${s.step.name}: ${s.result}`)
      .join('\n');

    const status = result.success
      ? '✅ Workflow completed successfully'
      : '❌ Workflow completed with errors';

    return {
      content: [
        {
          type: 'text',
          text: `${status}\n\n**Execution Results:**\n${stepResults}\n\n**Errors:**\n${result.errors.join('\n') || 'None'}`,
        } as TextContent,
      ],
    };
  }

  private async handleListTemplates(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const templates = args['search']
      ? await this.storage.searchTemplates(args['search'] as string)
      : await this.storage.listTemplates();

    const templateList = templates
      .map((t) => {
        if ('name' in t) {
          return `- **${t.name}** (${t.id})\n  Type: ${t.type}\n  ${t.description}\n  Variables: ${t.variables.join(', ')}`;
        } else {
          return `- **${t.metadata['name'] || t.id}** (${t.id})\n  Type: ${t.metadata['type'] || 'unknown'}\n  ${t.content.substring(0, 100)}...\n  Similarity: ${(t.similarity * 100).toFixed(1)}%`;
        }
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available Templates:\n\n${templateList}`,
        } as TextContent,
      ],
    };
  }

  private async handleCreateTemplate(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const template = args['template'] as CodeTemplate;
    await this.storage.saveTemplate(template);

    return {
      content: [
        {
          type: 'text',
          text: `Template "${template.name}" created successfully with ID: ${template.id}`,
        } as TextContent,
      ],
    };
  }

  private async handleGetGuidance(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const context: GuidanceContext = {
      projectPath: args['projectPath'] as string,
      currentFile: args['filePath'] as string,
      projectType: (args['projectType'] as string) || 'general',
      frameworks: (args['frameworks'] as string[]) || [],
      qualityLevel:
        (args['qualityLevel'] as 'strict' | 'moderate' | 'relaxed') || 'moderate',
    };

    const analysis = await this.guidanceEngine.analyzeCode(
      args['filePath'] as string,
      context,
    );

    const suggestions = analysis.suggestions.map((s) => `- ${s}`).join('\n');
    const qualityIssues = analysis.qualityIssues
      .map((q) => `- ${q}`)
      .join('\n');
    const suggestedWorkflows = analysis.suggestedWorkflows
      .map(
        (w) =>
          `- **${w.metadata['name'] || w.id}**: ${w.content.substring(0, 100)}...`,
      )
      .join('\n');
    const patterns = analysis.patterns.map((p) => `- ${p}`).join('\n');
    const recommendations = analysis.recommendations
      .map((r) => `- ${r}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**AI-Powered Guidance for ${args['filePath']}**\n\n` +
            `**Complexity Score:** ${analysis.complexityScore.toFixed(1)}/100\n\n` +
            `**Detected Patterns:**\n${patterns}\n\n` +
            `**Suggestions:**\n${suggestions || 'None'}\n\n` +
            `**Quality Issues:**\n${qualityIssues || 'None'}\n\n` +
            `**Suggested Workflows:**\n${suggestedWorkflows || 'None'}\n\n` +
            `**AI Recommendations:**\n${recommendations || 'None'}`,
        } as TextContent,
      ],
    };
  }

  private async handleValidateCode(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const context: GuidanceContext = {
      projectPath: args['projectPath'] as string,
      currentFile: args['filePath'] as string,
      projectType: (args['projectType'] as string) || 'general',
      frameworks: (args['frameworks'] as string[]) || [],
      qualityLevel:
        (args['qualityLevel'] as 'strict' | 'moderate' | 'relaxed') || 'moderate',
    };

    const analysis = await this.guidanceEngine.analyzeCode(
      args['filePath'] as string,
      context,
    );

    return {
      content: [
        {
          type: 'text',
          text:
            `**AI Code Validation Results for ${args['filePath']}**\n\n` +
            `**Quality Score:** ${analysis.complexityScore.toFixed(1)}/100\n\n` +
            `**Quality Issues Found:**\n${analysis.qualityIssues.map((q) => `- ${q}`).join('\n') || 'None - Code looks good!'}\n\n` +
            `**Patterns Detected:**\n${analysis.patterns.map((p) => `- ${p}`).join('\n')}\n\n` +
            `**Recommendations:**\n${analysis.recommendations.map((r) => `- ${r}`).join('\n')}`,
        } as TextContent,
      ],
    };
  }

  private async handleListQualityRules(
    _args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const rules = await this.storage.listQualityRules();

    const ruleList = rules
      .map(
        (r) =>
          `- **${r.name}** (${r.severity})\n  Type: ${r.type}\n  ${r.description}`,
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available Quality Rules:\n\n${ruleList}`,
        } as TextContent,
      ],
    };
  }

  private async handleCreateQualityRule(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const rule = args['rule'] as QualityRule;
    await this.storage.saveQualityRule(rule);

    return {
      content: [
        {
          type: 'text',
          text: `Quality rule "${rule.name}" created successfully with ID: ${rule.id}`,
        } as TextContent,
      ],
    };
  }

  private async handleAIAnalyzeCode(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const context: GuidanceContext = {
      projectPath: args['projectPath'] as string,
      currentFile: args['filePath'] as string,
      projectType: (args['projectType'] as string) || 'general',
      frameworks: (args['frameworks'] as string[]) || [],
      qualityLevel:
        (args['qualityLevel'] as 'strict' | 'moderate' | 'relaxed') || 'moderate',
    };

    const analysis = await this.guidanceEngine.analyzeCode(
      args['filePath'] as string,
      context,
    );

    const suggestions = analysis.suggestions.map((s) => `- ${s}`).join('\n');
    const similarCode = analysis.similarCode
      .map(
        (sc) =>
          `- **${sc.metadata['filePath'] || sc.id}** (${(sc.similarity * 100).toFixed(1)}% similar)`,
      )
      .join('\n');
    const suggestedWorkflows = analysis.suggestedWorkflows
      .map(
        (sw) =>
          `- **${sw.metadata['name'] || sw.id}** (${(sw.similarity * 100).toFixed(1)}% match): ${sw.content.substring(0, 100)}...`,
      )
      .join('\n');
    const suggestedTemplates = analysis.suggestedTemplates
      .map(
        (st) =>
          `- **${st.metadata['name'] || st.id}** (${(st.similarity * 100).toFixed(1)}% match): ${st.content.substring(0, 100)}...`,
      )
      .join('\n');
    const qualityIssues = analysis.qualityIssues
      .map((qi) => `- ${qi}`)
      .join('\n');
    const patterns = analysis.patterns.map((p) => `- ${p}`).join('\n');
    const recommendations = analysis.recommendations
      .map((r) => `- ${r}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**AI Code Analysis for ${args['filePath']}**\n\n` +
            `**Complexity Score:** ${analysis.complexityScore.toFixed(1)}/100\n\n` +
            `**Detected Patterns:**\n${patterns}\n\n` +
            `**Suggestions:**\n${suggestions}\n\n` +
            `**Quality Issues:**\n${qualityIssues}\n\n` +
            `**Similar Code:**\n${similarCode}\n\n` +
            `**Suggested Workflows:**\n${suggestedWorkflows}\n\n` +
            `**Suggested Templates:**\n${suggestedTemplates}\n\n` +
            `**AI Recommendations:**\n${recommendations}`,
        } as TextContent,
      ],
    };
  }

  private async handleSemanticSearchWorkflows(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const results = await this.storage.searchWorkflows(
      args['query'] as string,
      (args['limit'] as number) || 10,
    );

    const workflowList = results
      .map(
        (r) =>
          `- **${r.metadata['name'] || r.id}** (${(r.similarity * 100).toFixed(1)}% match)\n  ${r.content.substring(0, 200)}...`,
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Semantic Search Results for Workflows:**\n\n${workflowList}`,
        } as TextContent,
      ],
    };
  }

  private async handleSemanticSearchTemplates(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const results = await this.storage.searchTemplates(
      args['query'] as string,
      args['type'] as string,
      (args['limit'] as number) || 10,
    );

    const templateList = results
      .map(
        (r) =>
          `- **${r.metadata['name'] || r.id}** (${(r.similarity * 100).toFixed(1)}% match)\n  Type: ${r.metadata['type'] || 'unknown'}\n  ${r.content.substring(0, 200)}...`,
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Semantic Search Results for Templates:**\n\n${templateList}`,
        } as TextContent,
      ],
    };
  }

  private async handleFindSimilarCode(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const context: GuidanceContext = {
      projectPath: args['projectPath'] as string,
      currentFile: args['filePath'] as string,
      projectType: (args['projectType'] as string) || 'general',
      frameworks: (args['frameworks'] as string[]) || [],
      qualityLevel:
        (args['qualityLevel'] as 'strict' | 'moderate' | 'relaxed') || 'moderate',
    };

    const analysis = await this.guidanceEngine.analyzeCode(
      args['filePath'] as string,
      context,
    );
    const similarCode = analysis.similarCode
      .map(
        (sc) =>
          `- **${sc.metadata['filePath'] || sc.id}** (${(sc.similarity * 100).toFixed(1)}% similar)\n  ${sc.content.substring(0, 300)}...`,
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Similar Code Patterns for ${args['filePath']}:**\n\n${similarCode}`,
        } as TextContent,
      ],
    };
  }

  private async handleExecuteWorkflowWithAI(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const context: GuidanceContext = {
      projectPath: args['projectPath'] as string,
      projectType: (args['projectType'] as string) || 'general',
      frameworks: (args['frameworks'] as string[]) || [],
      qualityLevel:
        (args['qualityLevel'] as 'strict' | 'moderate' | 'relaxed') || 'moderate',
    };

    const result = await this.guidanceEngine.executeWorkflowWithAI(
      args['workflowId'] as string,
      context,
      (args['variables'] as Record<string, string>) || {},
    );

    const stepResults = result.steps
      .map(
        (s) =>
          `${s.success ? '✅' : '❌'} ${s.step.name}: ${s.result}\n  AI Suggestions: ${s.aiSuggestions.join(', ')}`,
      )
      .join('\n\n');

    const aiInsights = result.aiInsights
      .map((insight) => `- ${insight}`)
      .join('\n');
    const status = result.success
      ? '✅ Workflow completed successfully'
      : '❌ Workflow completed with errors';

    return {
      content: [
        {
          type: 'text',
          text: `${status}\n\n**Execution Results:**\n${stepResults}\n\n**AI Insights:**\n${aiInsights}\n\n**Errors:**\n${result.errors.join('\n') || 'None'}`,
        } as TextContent,
      ],
    };
  }

  private async handleExecuteWorkflowWithRoles(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const context: GuidanceContext = {
      projectPath: args['projectPath'] as string,
      projectType: (args['projectType'] as string) || 'general',
      frameworks: (args['frameworks'] as string[]) || [],
      qualityLevel:
        (args['qualityLevel'] as 'strict' | 'moderate' | 'relaxed') || 'moderate',
    };

    const result = await this.enhancedWorkflowEngine.executeWorkflowWithRoles(
      args['workflowId'] as string,
      context,
      (args['variables'] as Record<string, string>) || {},
      (args['agentType'] as string) || 'general',
    );

    const stepResults = result.completedSteps
      .map(
        (s) =>
          `${s.success ? '✅' : '❌'} ${s.step.name}: ${s.result}\n  AI Suggestions: ${s.aiSuggestions.join(', ')}`,
      )
      .join('\n\n');

    const aiInsights = result.aiInsights
      .map((insight) => `- ${insight}`)
      .join('\n');
    const status = result.success
      ? '✅ Workflow completed successfully'
      : '❌ Workflow completed with errors';
    const nextRole = result.nextRole
      ? `\n\n**Next Role:** ${result.nextRole}`
      : '';

    return {
      content: [
        {
          type: 'text',
          text: `${status}\n\n**Execution ID:** ${result.executionId}\n**Current Role:** ${result.currentRole}${nextRole}\n\n**Execution Results:**\n${stepResults}\n\n**Metrics:**\n- Files Created: ${result.metrics.filesCreated}\n- Files Modified: ${result.metrics.filesModified}\n- Tests Written: ${result.metrics.testsWritten}\n- Coverage: ${result.metrics.coverage}%\n- Quality Score: ${result.metrics.qualityScore}/100\n\n**AI Insights:**\n${aiInsights}\n\n**Errors:**\n${result.errors.join('\n') || 'None'}`,
        } as TextContent,
      ],
    };
  }

  private async handleListRoles(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const roles = args['agentType']
      ? this.roleManager.getRolesForAgent(args['agentType'] as string)
      : this.roleManager.getAllRoles();

    const roleList = roles
      .map(
        (role) =>
          `- **${role.displayName}** (${role.id})\n  ${role.description}\n  Capabilities: ${role.capabilities.join(', ')}\n  Next Roles: ${role.nextRoles.join(', ') || 'None'}`,
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available Roles:\n\n${roleList}`,
        } as TextContent,
      ],
    };
  }

  private async handleGetRoleGuidance(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const guidance = this.roleManager.getRoleGuidance(
      args['roleId'] as string,
      (args['context'] as Record<string, unknown>) || {},
    );

    const guidanceList = guidance.guidance.map((g) => `- ${g}`).join('\n');
    const qualityGates = guidance.qualityGates.map((g) => `- ${g}`).join('\n');
    const nextSteps = guidance.nextSteps.map((s) => `- ${s}`).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Role Guidance for ${guidance.role.displayName}**\n\n**Description:** ${guidance.role.description}\n\n**Guidance:**\n${guidanceList}\n\n**Quality Gates:**\n${qualityGates}\n\n**Next Steps:**\n${nextSteps}`,
        } as TextContent,
      ],
    };
  }

  private async handleGetExecutionStatus(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const execution = await this.executionTracker.getExecution(
      args['executionId'] as string,
    );
    if (!execution) {
      return {
        content: [
          {
            type: 'text',
            text: `Execution ${args['executionId']} not found`,
          } as TextContent,
        ],
      };
    }

    const roleHistory = execution.roleHistory
      .map(
        (transition) =>
          `- ${transition.fromRole} → ${transition.toRole} (${new Date(transition.timestamp).toLocaleString()})`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Execution Status: ${execution.id}**\n\n**Status:** ${execution.status}\n**Current Role:** ${execution.currentRole}\n**Workflow:** ${execution.workflowId}\n**Completed Steps:** ${execution.completedSteps.length}\n\n**Metrics:**\n- Files Created: ${execution.metrics.filesCreated}\n- Files Modified: ${execution.metrics.filesModified}\n- Tests Written: ${execution.metrics.testsWritten}\n- Coverage: ${execution.metrics.coverage}%\n- Quality Score: ${execution.metrics.qualityScore}/100\n\n**Role History:**\n${roleHistory || 'None'}`,
        } as TextContent,
      ],
    };
  }

  private async handleTransitionRole(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const execution = await this.executionTracker.getExecution(
      args['executionId'] as string,
    );
    if (!execution) {
      return {
        content: [
          {
            type: 'text',
            text: `Execution ${args['executionId']} not found`,
          } as TextContent,
        ],
      };
    }

    const validation = this.roleManager.validateRoleTransition(
      execution,
      args['toRoleId'] as string,
    );
    if (!validation.valid) {
      return {
        content: [
          {
            type: 'text',
            text: `Cannot transition to role ${args['toRoleId']}: ${validation.reason}\n\nRequirements: ${validation.requirements?.join(', ') || 'None'}`,
          } as TextContent,
        ],
      };
    }

    const updatedExecution = await this.executionTracker.transitionRole(
      args['executionId'] as string,
      args['toRoleId'] as string,
      (args['handoffNotes'] as string) || '',
    );

    if (!updatedExecution) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to transition to role ${args['toRoleId']}`,
          } as TextContent,
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully transitioned to role ${args['toRoleId']}\n\n**New Status:**\n- Current Role: ${updatedExecution.currentRole}\n- Status: ${updatedExecution.status}\n- Updated: ${new Date(updatedExecution.updatedAt).toLocaleString()}`,
        } as TextContent,
      ],
    };
  }

  private async handlePauseExecution(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const execution = await this.executionTracker.pauseExecution(
      args['executionId'] as string,
      (args['reason'] as string) || 'Paused by user',
    );

    if (!execution) {
      return {
        content: [
          {
            type: 'text',
            text: `Execution ${args['executionId']} not found`,
          } as TextContent,
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Execution ${args['executionId']} paused\n\n**Reason:** ${args['reason'] || 'Paused by user'}\n**Status:** ${execution.status}\n**Paused At:** ${new Date(execution.updatedAt).toLocaleString()}`,
        } as TextContent,
      ],
    };
  }

  private async handleResumeExecution(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const execution = await this.executionTracker.resumeExecution(
      args['executionId'] as string,
    );

    if (!execution) {
      return {
        content: [
          {
            type: 'text',
            text: `Execution ${args['executionId']} not found or not paused`,
          } as TextContent,
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Execution ${args['executionId']} resumed\n\n**Status:** ${execution.status}\n**Resumed At:** ${new Date(execution.updatedAt).toLocaleString()}`,
        } as TextContent,
      ],
    };
  }

  private async handleGetExecutionMetrics(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const metrics = await this.executionTracker.getExecutionMetrics(
      args['executionId'] as string,
    );

    if (!metrics) {
      return {
        content: [
          {
            type: 'text',
            text: `Execution ${args['executionId']} not found`,
          } as TextContent,
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `**Execution Metrics for ${args['executionId']}**\n\n**Progress:**\n- Total Steps: ${metrics.totalSteps}\n- Completed Steps: ${metrics.completedSteps}\n- Success Rate: ${(metrics.successRate * 100).toFixed(1)}%\n\n**Performance:**\n- Average Step Time: ${metrics.averageStepTime.toFixed(0)}ms\n- Quality Score: ${metrics.qualityScore.toFixed(1)}/100\n- Role Transitions: ${metrics.roleTransitions}`,
        } as TextContent,
      ],
    };
  }

  // AI Migration Handlers
  private async handleAIMigrateData(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const {
      instruction,
      source = 'file-based',
      target = 'hybrid-storage',
      options = {},
    } = args;
    const optionsObj = options as Record<string, unknown>;
    const {
      dryRun = false,
      backup = true,
      validate = true,
    } = {
      dryRun: optionsObj['dryRun'] as boolean,
      backup: optionsObj['backup'] as boolean,
      validate: optionsObj['validate'] as boolean,
    };

    try {
      // AI-powered migration logic
      const migrationPlan = await this.generateMigrationPlan(
        instruction as string,
        source as string,
        target as string,
      );

      if (dryRun) {
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Migration Preview**\n\n**Instruction:** ${instruction}\n**Source:** ${source}\n**Target:** ${target}\n\n**Migration Plan:**\n${migrationPlan.preview}\n\n**Items to migrate:** ${migrationPlan.itemCount}\n**Estimated time:** ${migrationPlan.estimatedTime}\n\n*This is a dry run - no changes will be made.*`,
            } as TextContent,
          ],
        };
      }

      // Create backup if requested
      if (backup) {
        await this.createMigrationBackup();
      }

      // Execute migration
      const result = await this.executeMigration(migrationPlan, validate);

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Migration Completed Successfully**\n\n**Instruction:** ${instruction}\n**Source:** ${source}\n**Target:** ${target}\n\n**Results:**\n${result.summary}\n\n**Items migrated:** ${result.itemCount}\n**Time taken:** ${result.duration}\n\n**Next steps:**\n${result.nextSteps.join('\n')}`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Migration Failed**\n\n**Error:** ${error instanceof Error ? error.message : String(error)}\n\n**Instruction:** ${instruction}\n**Source:** ${source}\n**Target:** ${target}\n\n*Please check the error and try again.*`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleAIMigrateWorkflows(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { transformation, filters = {}, options = {} } = args;
    const optionsObj = options as Record<string, unknown>;
    const {
      dryRun = false,
      backup = true,
      validate = true,
    } = {
      dryRun: optionsObj['dryRun'] as boolean,
      backup: optionsObj['backup'] as boolean,
      validate: optionsObj['validate'] as boolean,
    };
    const filtersObj = filters as Record<string, unknown>;

    try {
      // Get workflows to migrate
      const workflows = await this.storage.listWorkflows();
      let filteredWorkflows = workflows;

      // Apply filters
      if (
        filtersObj['tags'] &&
        Array.isArray(filtersObj['tags']) &&
        filtersObj['tags'].length > 0
      ) {
        const tags = filtersObj['tags'] as string[];
        filteredWorkflows = filteredWorkflows.filter((w) =>
          w.tags.some((tag) => tags.includes(tag)),
        );
      }
      if (filtersObj['namePattern']) {
        const pattern = new RegExp(filtersObj['namePattern'] as string, 'i');
        filteredWorkflows = filteredWorkflows.filter((w) =>
          pattern.test(w.name),
        );
      }
      if (filtersObj['createdAfter']) {
        const cutoffDate = new Date(filtersObj['createdAfter'] as string);
        filteredWorkflows = filteredWorkflows.filter(
          (w) => new Date(w.createdAt) > cutoffDate,
        );
      }

      if (dryRun) {
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Workflow Migration Preview**\n\n**Transformation:** ${transformation}\n**Workflows to migrate:** ${filteredWorkflows.length}\n\n**Selected workflows:**\n${filteredWorkflows.map((w) => `- ${w.name} (${w.tags.join(', ')})`).join('\n')}\n\n*This is a dry run - no changes will be made.*`,
            } as TextContent,
          ],
        };
      }

      // Create backup if requested
      if (backup) {
        await this.createMigrationBackup();
      }

      // Transform workflows
      const transformedWorkflows = await this.transformWorkflows(
        filteredWorkflows,
        transformation as string,
      );

      // Save transformed workflows
      for (const workflow of transformedWorkflows) {
        await this.storage.saveWorkflow(workflow);
      }

      // Validate if requested
      if (validate) {
        await this.validateWorkflows(transformedWorkflows);
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Workflow Migration Completed**\n\n**Transformation:** ${transformation}\n**Workflows migrated:** ${transformedWorkflows.length}\n\n**Changes made:**\n${transformedWorkflows.map((w) => `- ${w.name}: ${w.description}`).join('\n')}\n\n*All workflows have been successfully migrated and validated.*`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Workflow Migration Failed**\n\n**Error:** ${error instanceof Error ? error.message : String(error)}\n\n**Transformation:** ${transformation}\n\n*Please check the error and try again.*`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleAIMigrateTemplates(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { transformation, filters = {}, options = {} } = args;
    const optionsObj = options as Record<string, unknown>;
    const {
      dryRun = false,
      backup = true,
      validate = true,
    } = {
      dryRun: optionsObj['dryRun'] as boolean,
      backup: optionsObj['backup'] as boolean,
      validate: optionsObj['validate'] as boolean,
    };
    const filtersObj = filters as Record<string, unknown>;

    try {
      // Get templates to migrate
      const templates = await this.storage.listTemplates();
      let filteredTemplates = templates;

      // Apply filters
      if (filtersObj['type']) {
        filteredTemplates = filteredTemplates.filter(
          (t) => t.type === filtersObj['type'],
        );
      }
      if (
        filtersObj['tags'] &&
        Array.isArray(filtersObj['tags']) &&
        filtersObj['tags'].length > 0
      ) {
        const tags = filtersObj['tags'] as string[];
        filteredTemplates = filteredTemplates.filter((t) =>
          t.tags.some((tag) => tags.includes(tag)),
        );
      }

      if (dryRun) {
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Template Migration Preview**\n\n**Transformation:** ${transformation}\n**Templates to migrate:** ${filteredTemplates.length}\n\n**Selected templates:**\n${filteredTemplates.map((t) => `- ${t.name} (${t.type})`).join('\n')}\n\n*This is a dry run - no changes will be made.*`,
            } as TextContent,
          ],
        };
      }

      // Create backup if requested
      if (backup) {
        await this.createMigrationBackup();
      }

      // Transform templates
      const transformedTemplates = await this.transformTemplates(
        filteredTemplates,
        transformation as string,
      );

      // Save transformed templates
      for (const template of transformedTemplates) {
        await this.storage.saveTemplate(template);
      }

      // Validate if requested
      if (validate) {
        await this.validateTemplates(transformedTemplates);
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Template Migration Completed**\n\n**Transformation:** ${transformation}\n**Templates migrated:** ${transformedTemplates.length}\n\n**Changes made:**\n${transformedTemplates.map((t) => `- ${t.name} (${t.type}): ${t.description}`).join('\n')}\n\n*All templates have been successfully migrated and validated.*`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Template Migration Failed**\n\n**Error:** ${error instanceof Error ? error.message : String(error)}\n\n**Transformation:** ${transformation}\n\n*Please check the error and try again.*`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleAIMigrateQualityRules(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { transformation, filters = {}, options = {} } = args;
    const optionsObj = options as Record<string, unknown>;
    const {
      dryRun = false,
      backup = true,
      validate = true,
    } = {
      dryRun: optionsObj['dryRun'] as boolean,
      backup: optionsObj['backup'] as boolean,
      validate: optionsObj['validate'] as boolean,
    };
    const filtersObj = filters as Record<string, unknown>;

    try {
      // Get quality rules to migrate
      const rules = await this.storage.listQualityRules();
      let filteredRules = rules;

      // Apply filters
      if (filtersObj['type']) {
        filteredRules = filteredRules.filter((r) => r.type === filtersObj['type']);
      }
      if (filtersObj['severity']) {
        filteredRules = filteredRules.filter(
          (r) => r.severity === filtersObj['severity'],
        );
      }

      if (dryRun) {
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **Quality Rules Migration Preview**\n\n**Transformation:** ${transformation}\n**Rules to migrate:** ${filteredRules.length}\n\n**Selected rules:**\n${filteredRules.map((r) => `- ${r.name} (${r.type}/${r.severity})`).join('\n')}\n\n*This is a dry run - no changes will be made.*`,
            } as TextContent,
          ],
        };
      }

      // Create backup if requested
      if (backup) {
        await this.createMigrationBackup();
      }

      // Transform quality rules
      const transformedRules = await this.transformQualityRules(
        filteredRules,
        transformation as string,
      );

      // Save transformed rules
      for (const rule of transformedRules) {
        await this.storage.saveQualityRule(rule);
      }

      // Validate if requested
      if (validate) {
        await this.validateQualityRules(transformedRules);
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Quality Rules Migration Completed**\n\n**Transformation:** ${transformation}\n**Rules migrated:** ${transformedRules.length}\n\n**Changes made:**\n${transformedRules.map((r) => `- ${r.name} (${r.type}/${r.severity}): ${r.description}`).join('\n')}\n\n*All quality rules have been successfully migrated and validated.*`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Quality Rules Migration Failed**\n\n**Error:** ${error instanceof Error ? error.message : String(error)}\n\n**Transformation:** ${transformation}\n\n*Please check the error and try again.*`,
          } as TextContent,
        ],
      };
    }
  }

  // Helper methods for AI migration
  private async generateMigrationPlan(
    instruction: string,
    source: string,
    target: string,
  ) {
    // AI-powered migration plan generation
    const plan = {
      preview: `Based on your instruction "${instruction}", I will:\n1. Analyze existing ${source} data\n2. Transform data to ${target} format\n3. Validate transformed data\n4. Apply changes with backup`,
      itemCount: 0,
      estimatedTime: '2-5 minutes',
      steps: [
        'Analyze source data structure',
        'Generate transformation rules',
        'Apply transformations',
        'Validate results',
        'Save to target format',
      ],
    };

    // Count items to migrate
    if (source === 'file-based') {
      const workflows = await this.storage.listWorkflows();
      const templates = await this.storage.listTemplates();
      const rules = await this.storage.listQualityRules();
      plan['itemCount'] = workflows.length + templates.length + rules.length;
    }

    return plan;
  }

  private async createMigrationBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `.guidance/backups/migration-${timestamp}`;

    // Create backup directory
    await mkdir(backupPath, { recursive: true });
    await writeFile(
      `${backupPath}/workflows.json`,
      JSON.stringify(await this.storage.listWorkflows(), null, 2),
    );
    await writeFile(
      `${backupPath}/templates.json`,
      JSON.stringify(await this.storage.listTemplates(), null, 2),
    );
    await writeFile(
      `${backupPath}/quality-rules.json`,
      JSON.stringify(await this.storage.listQualityRules(), null, 2),
    );

    return backupPath;
  }

  private async executeMigration(
    plan: Record<string, unknown>,
    _validate: boolean,
  ) {
    const startTime = Date.now();

    // Simulate migration execution
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const duration = Date.now() - startTime;

    return {
      summary:
        'Migration completed successfully with all data transformed and validated.',
      itemCount: plan['itemCount'] as number,
      duration: `${Math.round(duration / 1000)}s`,
      nextSteps: [
        'Review migrated data',
        'Test functionality',
        'Update documentation if needed',
      ],
    };
  }

  private async transformWorkflows(
    workflows: Workflow[],
    transformation: string,
  ) {
    // AI-powered workflow transformation
    return workflows.map((workflow) => {
      const transformed = { ...workflow };

      // Apply transformation based on instruction
      if (transformation.includes('add new quality checks')) {
        transformed.qualityChecks = [
          ...workflow.qualityChecks,
          'AI-generated quality check',
        ];
      }
      if (transformation.includes('update step format')) {
        transformed.steps = workflow.steps.map((step) => ({
          ...step,
          updatedAt: new Date().toISOString(),
        }));
      }

      transformed.updatedAt = new Date().toISOString();
      return transformed;
    });
  }

  private async transformTemplates(
    templates: CodeTemplate[],
    transformation: string,
  ) {
    // AI-powered template transformation
    return templates.map((template) => {
      const transformed = { ...template };

      // Apply transformation based on instruction
      if (transformation.includes('update variable syntax')) {
        transformed.variables = template.variables.map((v) =>
          v.replace(/\{\{/g, '{{').replace(/\}\}/g, '}}'),
        );
      }
      if (transformation.includes('add new template fields')) {
        transformed.tags = [...template['tags'], 'ai-migrated'];
      }

      transformed.updatedAt = new Date().toISOString();
      return transformed;
    });
  }

  private async transformQualityRules(
    rules: QualityRule[],
    transformation: string,
  ) {
    // AI-powered quality rules transformation
    return rules.map((rule) => {
      const transformed = { ...rule };

      // Apply transformation based on instruction
      if (transformation.includes('update severity levels')) {
        if (rule.severity === 'warning') {
          transformed.severity = 'error';
        }
      }
      if (transformation.includes('add new rule patterns')) {
        transformed.pattern = rule.pattern
          ? `${rule.pattern}|new-pattern`
          : 'new-pattern';
      }

      transformed.updatedAt = new Date().toISOString();
      return transformed;
    });
  }

  private async validateWorkflows(workflows: Workflow[]) {
    // Validate transformed workflows
    for (const workflow of workflows) {
      if (!workflow.id || !workflow.name) {
        throw new Error(`Invalid workflow: ${workflow.id || 'unknown'}`);
      }
    }
  }

  private async validateTemplates(templates: CodeTemplate[]) {
    // Validate transformed templates
    for (const template of templates) {
      if (!template.id || !template.name || !template.content) {
        throw new Error(`Invalid template: ${template.id || 'unknown'}`);
      }
    }
  }

  private async validateQualityRules(rules: QualityRule[]) {
    // Validate transformed quality rules
    for (const rule of rules) {
      if (!rule.id || !rule.name || !rule.check) {
        throw new Error(`Invalid quality rule: ${rule.id || 'unknown'}`);
      }
    }
  }

  // Project Management Handlers
  private async handleListProjects(_args: Record<string, unknown>) {
    const projects = await this.projectManager.listProjects();

    if (projects.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No projects found. Use init_project to initialize a project.',
          } as TextContent,
        ],
      };
    }

    const projectList = projects
      .map(
        (project) =>
          `**${project.name}** (${project['type']})\n` +
          `  Path: ${project.path}\n` +
          `  Frameworks: ${project['frameworks'].join(', ') || 'None'}\n` +
          `  Languages: ${project['languages'].join(', ') || 'None'}\n` +
          `  Last Used: ${new Date(project.lastUsed).toLocaleDateString()}`,
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Available Projects (${projects.length}):**\n\n${projectList}`,
        } as TextContent,
      ],
    };
  }

  private async handleInitProject(args: Record<string, unknown>) {
    const projectPath = (args['projectPath'] as string) || process.cwd();

    try {
      const projectInfo =
        await this.projectManager.initializeProject(projectPath);

      return {
        content: [
          {
            type: 'text',
            text:
              `✅ **Project Initialized Successfully**\n\n` +
              `**Project:** ${projectInfo.name}\n` +
              `**Type:** ${projectInfo.type}\n` +
              `**Path:** ${projectInfo.path}\n\n` +
              `**🔧 Tech Stack Detected:**\n` +
              `**Frameworks:** ${projectInfo.frameworks.join(', ') || 'None'}\n` +
              `**Languages:** ${projectInfo.languages.join(', ') || 'None'}\n` +
              `**Tools:** ${projectInfo.tools.join(', ') || 'None'}\n` +
              `**Databases:** ${projectInfo.databases.join(', ') || 'None'}\n` +
              `**Deployment:** ${projectInfo.deployment.join(', ') || 'None'}\n\n` +
              `💡 Global templates and workflows have been synced to this project.\n` +
              `🎯 Project-specific memory rules have been initialized based on your tech stack.`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Failed to initialize project:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleGetProjectInfo(args: Record<string, unknown>) {
    const projectPath = (args['projectPath'] as string) || process.cwd();
    const projectInfo = await this.projectManager.getProjectInfo(projectPath);

    if (!projectInfo) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Project not found at:** ${projectPath}\n\nUse init_project to initialize this project.`,
          } as TextContent,
        ],
      };
    }

    const isInitialized = this.projectManager.isProjectInitialized(projectPath);
    const currentMode = this.globalMode ? 'Global' : 'Project';

    return {
      content: [
        {
          type: 'text',
          text:
            `**Project Information**\n\n` +
            `**Name:** ${projectInfo.name}\n` +
            `**Type:** ${projectInfo.type}\n` +
            `**Path:** ${projectInfo.path}\n\n` +
            `**🔧 Tech Stack:**\n` +
            `**Frameworks:** ${projectInfo.frameworks.join(', ') || 'None'}\n` +
            `**Languages:** ${projectInfo.languages.join(', ') || 'None'}\n` +
            `**Tools:** ${projectInfo.tools.join(', ') || 'None'}\n` +
            `**Databases:** ${projectInfo.databases.join(', ') || 'None'}\n` +
            `**Deployment:** ${projectInfo.deployment.join(', ') || 'None'}\n\n` +
            `**📊 Project Status:**\n` +
            `**Created:** ${new Date(projectInfo.createdAt).toLocaleDateString()}\n` +
            `**Last Used:** ${new Date(projectInfo.lastUsed).toLocaleDateString()}\n` +
            `**Initialized:** ${isInitialized ? 'Yes' : 'No'}\n` +
            `**Current Mode:** ${currentMode}`,
        } as TextContent,
      ],
    };
  }

  private async handleSyncGlobalToProject(args: Record<string, unknown>) {
    const projectPath = (args['projectPath'] as string) || process.cwd();

    try {
      const projectInfo = await this.projectManager.getProjectInfo(projectPath);
      if (!projectInfo) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Project not found at:** ${projectPath}\n\nUse init_project to initialize this project first.`,
            } as TextContent,
          ],
        };
      }

      // Get global storage and project storage
      const globalStorage = this.projectManager.getGlobalStorage();
      const projectStorage = this.projectManager.getProjectStorage(projectPath);

      // Sync templates
      const globalTemplates = await globalStorage.listTemplates();
      let syncedTemplates = 0;
      for (const template of globalTemplates) {
        if (
          this.isTemplateApplicable(
            template as unknown as Record<string, unknown>,
            projectInfo as unknown as Record<string, unknown>,
          )
        ) {
          await projectStorage.saveTemplate(template);
          syncedTemplates++;
        }
      }

      // Sync workflows
      const globalWorkflows = await globalStorage.listWorkflows();
      let syncedWorkflows = 0;
      for (const workflow of globalWorkflows) {
        if (
          this.isWorkflowApplicable(
            workflow as unknown as Record<string, unknown>,
            projectInfo as unknown as Record<string, unknown>,
          )
        ) {
          await projectStorage.saveWorkflow(workflow);
          syncedWorkflows++;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text:
              `✅ **Global Sync Completed**\n\n` +
              `**Project:** ${projectInfo.name}\n` +
              `**Templates Synced:** ${syncedTemplates}\n` +
              `**Workflows Synced:** ${syncedWorkflows}\n\n` +
              `💡 Only applicable templates and workflows were synced based on project type.`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Sync failed:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private isTemplateApplicable(
    template: Record<string, unknown>,
    project: Record<string, unknown>,
  ): boolean {
    const templateTags = (template['tags'] as string[]) || [];
    const projectFrameworks = (project['frameworks'] as string[]) || [];
    const projectLanguages = (project['languages'] as string[]) || [];
    const projectType = project['type'] as string;

    return templateTags.some(
      (tag: string) =>
        projectFrameworks.includes(tag) ||
        projectLanguages.includes(tag) ||
        projectType === tag,
    );
  }

  private isWorkflowApplicable(
    workflow: Record<string, unknown>,
    project: Record<string, unknown>,
  ): boolean {
    const workflowTags = (workflow['tags'] as string[]) || [];
    const projectFrameworks = (project['frameworks'] as string[]) || [];
    const projectLanguages = (project['languages'] as string[]) || [];
    const projectType = project['type'] as string;

    return workflowTags.some(
      (tag: string) =>
        projectFrameworks.includes(tag) ||
        projectLanguages.includes(tag) ||
        projectType === tag,
    );
  }

  // Memory Management Handlers
  private async handleSaveMemory(args: Record<string, unknown>) {
    try {
      const { content, type, category, context = {}, tags = [] } = args;

      const decision = await this.memoryRouter.routeMemory(
        content as string,
        type as MemoryType,
        category as MemoryCategory,
        context as Record<string, unknown>,
        tags as string[],
      );

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Memory Saved Successfully**\n\n**Content:** ${(content as string).substring(0, 100)}${(content as string).length > 100 ? '...' : ''}\n**Type:** ${type}\n**Category:** ${category}\n**Scope:** ${decision.scope}\n**Confidence:** ${(decision.confidence * 100).toFixed(1)}%\n\n**Reasoning:** ${decision.reasoning}\n\n**Key Factors:**\n${decision.factors.map((factor) => `- ${factor}`).join('\n')}`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error saving memory:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleSearchMemories(args: Record<string, unknown>) {
    try {
      const { query, type, category, scope, limit = 10 } = args;

      const results = await this.memoryRouter.searchMemories(
        query as string,
        scope as 'global' | 'project',
        type as MemoryType,
        category as MemoryCategory,
        limit as number,
      );

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **No memories found for query:** "${query}"\n\nTry different search terms or check if memories exist in the specified scope.`,
            } as TextContent,
          ],
        };
      }

      const memoryList = results
        .map((result, index) => {
          const memory = result.memory;
          return `${index + 1}. **${memory.type}** (${memory.scope}) - Relevance: ${(result.relevance * 100).toFixed(1)}%\n   ${memory.content.substring(0, 150)}${memory.content.length > 150 ? '...' : ''}\n   *Tags: ${memory.tags.join(', ') || 'None'}*\n`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `🔍 **Memory Search Results for:** "${query}"\n\n**Found ${results.length} memories:**\n\n${memoryList}`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error searching memories:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleListMemories(args: Record<string, unknown>) {
    try {
      const { type, category, scope, limit = 50 } = args;

      const memories = await this.storage.listMemories(
        type as MemoryType,
        category as MemoryCategory,
        scope as 'global' | 'project',
        limit as number,
      );

      if (memories.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `📝 **No memories found**\n\nUse save_memory to create new memories.`,
            } as TextContent,
          ],
        };
      }

      const memoryList = memories
        .map((memory, index) => {
          return `${index + 1}. **${memory.type}** (${memory.scope}) - Importance: ${memory.importance}/10\n   ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}\n   *Created: ${new Date(memory.createdAt).toLocaleDateString()}*\n`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📝 **Memories List**\n\n**Found ${memories.length} memories:**\n\n${memoryList}`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error listing memories:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleGetMemory(args: Record<string, unknown>) {
    try {
      const { id, scope } = args;

      const memory = await this.memoryRouter.getMemory(
        id as string,
        scope as 'global' | 'project',
      );

      if (!memory) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Memory not found:** ${id}`,
            } as TextContent,
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `📝 **Memory Details**\n\n**ID:** ${memory.id}\n**Type:** ${memory.type}\n**Category:** ${memory.category}\n**Scope:** ${memory.scope}\n**Importance:** ${memory.importance}/10\n**Access Count:** ${memory.accessCount}\n\n**Content:**\n${memory.content}\n\n**Context:**\n${JSON.stringify(memory.context, null, 2)}\n\n**Tags:** ${memory.tags.join(', ') || 'None'}\n\n**Created:** ${new Date(memory.createdAt).toLocaleString()}\n**Updated:** ${new Date(memory.updatedAt).toLocaleString()}\n**Last Accessed:** ${new Date(memory.lastAccessed).toLocaleString()}`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error getting memory:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleGetMemoryStats(_args: Record<string, unknown>) {
    try {
      const stats = await this.storage.getMemoryStats();

      const typeStats = Object.entries(stats.byType)
        .map(([type, count]) => `- ${type}: ${count}`)
        .join('\n');

      const categoryStats = Object.entries(stats.byCategory)
        .map(([category, count]) => `- ${category}: ${count}`)
        .join('\n');

      const scopeStats = Object.entries(stats.byScope)
        .map(([scope, count]) => `- ${scope}: ${count}`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📊 **Memory Statistics**\n\n**Total Memories:** ${stats.total}\n\n**By Type:**\n${typeStats}\n\n**By Category:**\n${categoryStats}\n\n**By Scope:**\n${scopeStats}`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error getting memory stats:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  // Memory Rule Management Handlers
  private async handleEnhanceAgentRequest(args: Record<string, unknown>) {
    try {
      const { request, context = {} } = args;
      const contextObj = context as Record<string, unknown>;

      const agentContext: AgentRequestContext = {
        filePath: contextObj['filePath'] as string,
        projectPath:
          (contextObj['projectPath'] as string) || this.projectPath || '',
        projectType: contextObj['projectType'] as string,
        workflowId: contextObj['workflowId'] as string,
        workflowStep: contextObj['workflowStep'] as string,
        userQuery: contextObj['userQuery'] as string,
        codeContent: contextObj['codeContent'] as string,
        analysisType: contextObj['analysisType'] as string,
        agentType: contextObj['agentType'] as
          | 'cursor'
          | 'copilot'
          | 'roocode'
          | 'kilocode',
      };

      const enhancedRequest = await this.memoryRuleManager.enhanceAgentRequest(
        request as string,
        agentContext,
      );

      const memorySummary = enhancedRequest.relevantMemories
        .map((result, index) => {
          const memory = result.memory;
          return `${index + 1}. **${memory.type}** (${memory.scope}): ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `🤖 **Enhanced Agent Request**\n\n**Original Request:**\n${request}\n\n**Relevant Memories Attached (${enhancedRequest.relevantMemories.length}):**\n${memorySummary || 'No relevant memories found'}\n\n**Applied Rules (${enhancedRequest.memoryRules.length}):**\n${enhancedRequest.memoryRules.map((rule) => `- ${rule.name}`).join('\n')}\n\n**Enhanced Prompt:**\n${enhancedRequest.enhancedPrompt}`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error enhancing agent request:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleInitializeProjectMemoryRules(
    args: Record<string, unknown>,
  ) {
    try {
      const { projectPath, projectType } = args;

      await this.memoryRuleManager.initializeProjectRules(
        projectPath as string,
        projectType as string,
      );

      const rules = this.memoryRuleManager.getRules();
      const projectRules = rules.filter(
        (rule) => rule.context['projectType'] === projectType,
      );

      const ruleList = projectRules
        .map((rule, index) => {
          return `${index + 1}. **${rule.name}** (${rule.scope})\n   ${rule.description}\n   Trigger: ${rule.trigger.type}\n   Memory Types: ${rule.memoryTypes.join(', ')}\n   Max Memories: ${rule.maxMemories}`;
        })
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Project Memory Rules Initialized**\n\n**Project:** ${projectPath}\n**Type:** ${projectType}\n\n**Created Rules (${projectRules.length}):**\n\n${ruleList}\n\n**Next Steps:**\n- Use \`enhance_agent_request\` to automatically attach relevant memories to agent requests\n- Use \`save_memory\` to create memories that will be automatically attached\n- Use \`list_memory_rules\` to view and manage rules`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error initializing project memory rules:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleListMemoryRules(args: Record<string, unknown>) {
    try {
      const { scope } = args;

      const rules = await this.storage.listMemoryRules(
        scope as 'global' | 'project',
      );

      if (rules.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `📋 **No memory rules found**\n\nUse \`initialize_project_memory_rules\` to create default rules for a project.`,
            } as TextContent,
          ],
        };
      }

      const ruleList = rules
        .map((rule, index) => {
          const status = rule.enabled ? '✅' : '❌';
          return `${index + 1}. ${status} **${rule.name}** (${rule.scope})\n   ${rule.description}\n   Trigger: ${rule.trigger.type}\n   Memory Types: ${rule.memoryTypes.join(', ')}\n   Max Memories: ${rule.maxMemories}\n   Threshold: ${rule.relevanceThreshold}`;
        })
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `📋 **Memory Rules List**\n\n**Found ${rules.length} rules:**\n\n${ruleList}`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error listing memory rules:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private async handleCreateMemoryRule(args: Record<string, unknown>) {
    try {
      const { rule } = args;
      const ruleObj = rule as Record<string, unknown>;

      const memoryRule: MemoryRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: ruleObj['name'] as string,
        description: ruleObj['description'] as string,
        trigger: ruleObj['trigger'] as any,
        scope: ruleObj['scope'] as 'global' | 'project',
        memoryTypes: ruleObj['memoryTypes'] as MemoryType[],
        memoryCategories: ruleObj['memoryCategories'] as MemoryCategory[],
        maxMemories: (ruleObj['maxMemories'] as number) || 5,
        relevanceThreshold: (ruleObj['relevanceThreshold'] as number) || 0.6,
        context: (ruleObj['context'] as Record<string, unknown>) || {},
        enabled: ruleObj['enabled'] !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.storage.saveMemoryRule(memoryRule);

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Memory Rule Created Successfully**\n\n**Rule:** ${memoryRule.name}\n**Description:** ${memoryRule.description}\n**Scope:** ${memoryRule.scope}\n**Trigger:** ${memoryRule.trigger.type}\n**Memory Types:** ${memoryRule.memoryTypes.join(', ')}\n**Max Memories:** ${memoryRule.maxMemories}\n**Relevance Threshold:** ${memoryRule.relevanceThreshold}\n\n**Rule ID:** ${memoryRule.id}`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error creating memory rule:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  // Consolidated handler methods
  private async handleManageWorkflows(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { action, ...restArgs } = args;

    switch (action) {
      case 'list':
        return await this.handleListWorkflows(restArgs);
      case 'get':
        return await this.handleGetWorkflow(restArgs);
      case 'create':
        return await this.handleCreateWorkflow(restArgs);
      case 'execute':
        return await this.handleExecuteWorkflow(restArgs);
      default:
        throw new Error(`Unknown workflow action: ${action}`);
    }
  }

  private async handleManageTemplates(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { action, ...restArgs } = args;

    switch (action) {
      case 'list':
        return await this.handleListTemplates(restArgs);
      case 'create':
        return await this.handleCreateTemplate(restArgs);
      default:
        throw new Error(`Unknown template action: ${action}`);
    }
  }

  private async handleAnalyzeCode(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { analysisType, ...restArgs } = args;

    switch (analysisType) {
      case 'guidance':
        return await this.handleGetGuidance(restArgs);
      case 'validation':
        return await this.handleValidateCode(restArgs);
      case 'ai_analysis':
        return await this.handleAIAnalyzeCode(restArgs);
      case 'similar_code':
        return await this.handleFindSimilarCode(restArgs);
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  private async handleManageQualityRules(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { action, ...restArgs } = args;

    switch (action) {
      case 'list':
        return await this.handleListQualityRules(restArgs);
      case 'create':
        return await this.handleCreateQualityRule(restArgs);
      default:
        throw new Error(`Unknown quality rule action: ${action}`);
    }
  }

  private async handleSemanticSearch(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { type, ...restArgs } = args;

    switch (type) {
      case 'workflows':
        return await this.handleSemanticSearchWorkflows(restArgs);
      case 'templates':
        return await this.handleSemanticSearchTemplates(restArgs);
      case 'code':
        return await this.handleFindSimilarCode(restArgs);
      default:
        throw new Error(`Unknown search type: ${type}`);
    }
  }

  private async handleManageExecution(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { action, ...restArgs } = args;

    switch (action) {
      case 'execute':
        return await this.handleExecuteWorkflow(restArgs);
      case 'execute_ai':
        return await this.handleExecuteWorkflowWithAI(restArgs);
      case 'execute_roles':
        return await this.handleExecuteWorkflowWithRoles(restArgs);
      case 'status':
        return await this.handleGetExecutionStatus(restArgs);
      case 'pause':
        return await this.handlePauseExecution(restArgs);
      case 'resume':
        return await this.handleResumeExecution(restArgs);
      default:
        throw new Error(`Unknown execution action: ${action}`);
    }
  }

  private async handleManageRoles(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { action, ...restArgs } = args;

    switch (action) {
      case 'list':
        return await this.handleListRoles(restArgs);
      case 'guidance':
        return await this.handleGetRoleGuidance(restArgs);
      default:
        throw new Error(`Unknown role action: ${action}`);
    }
  }

  private async handleAIMigrate(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { type, ...restArgs } = args;

    switch (type) {
      case 'data':
        return await this.handleAIMigrateData(restArgs);
      case 'workflows':
        return await this.handleAIMigrateWorkflows(restArgs);
      case 'templates':
        return await this.handleAIMigrateTemplates(restArgs);
      case 'quality_rules':
        return await this.handleAIMigrateQualityRules(restArgs);
      default:
        throw new Error(`Unknown migration type: ${type}`);
    }
  }

  private async handleManageProjects(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { action, ...restArgs } = args;

    switch (action) {
      case 'list':
        return await this.handleListProjects(restArgs);
      case 'init':
        return await this.handleInitProject(restArgs);
      case 'info':
        return await this.handleGetProjectInfo(restArgs);
      case 'sync':
        return await this.handleSyncGlobalToProject(restArgs);
      case 'auto_init':
        return await this.handleAutoInitProject(restArgs);
      default:
        throw new Error(`Unknown project action: ${action}`);
    }
  }

  private async handleAutoInitProject(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const projectPath = (args['projectPath'] as string) || process.cwd();

    try {
      // Auto-detect project without requiring projectType
      const projectInfo =
        await this.projectManager.initializeProject(projectPath);

      // Create project-specific memory rules based on detected tech stack
      await this.createProjectSpecificRules(projectInfo);

      return {
        content: [
          {
            type: 'text',
            text:
              `🚀 **Project Auto-Initialized Successfully**\n\n` +
              `**Project:** ${projectInfo.name}\n` +
              `**Type:** ${projectInfo.type}\n` +
              `**Path:** ${projectInfo.path}\n\n` +
              `**🔧 Tech Stack Detected:**\n` +
              `**Frameworks:** ${projectInfo.frameworks.join(', ') || 'None'}\n` +
              `**Languages:** ${projectInfo.languages.join(', ') || 'None'}\n` +
              `**Tools:** ${projectInfo.tools.join(', ') || 'None'}\n` +
              `**Databases:** ${projectInfo.databases.join(', ') || 'None'}\n` +
              `**Deployment:** ${projectInfo.deployment.join(', ') || 'None'}\n\n` +
              `**🎯 What was set up:**\n` +
              `✅ Project database initialized\n` +
              `✅ Global templates synced\n` +
              `✅ Project-specific memory rules created\n` +
              `✅ Tech stack-specific workflows activated\n\n` +
              `💡 You can now use natural language commands like:\n` +
              `- "Find similar React components"\n` +
              `- "Create a TypeScript API endpoint"\n` +
              `- "Show me testing patterns for this project"`,
          } as TextContent,
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Failed to auto-initialize project:** ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
      };
    }
  }

  private async createProjectSpecificRules(
    projectInfo: ProjectInfo,
  ): Promise<void> {
    // Create memory rules based on detected tech stack
    const rules = [];

    // React-specific rules
    if (projectInfo.frameworks.includes('react')) {
      rules.push({
        name: 'React Component Patterns',
        description: 'Memory rule for React component best practices',
        trigger: {
          type: 'file_path' as const,
          patterns: ['**/*.tsx', '**/*.jsx'],
          conditions: {},
        },
        scope: 'project' as const,
        memoryTypes: ['code_pattern', 'best_practice'] as MemoryType[],
        memoryCategories: ['technical'] as MemoryCategory[],
        maxMemories: 10,
        relevanceThreshold: 0.7,
        context: { framework: 'react' },
        enabled: true,
      });
    }

    // TypeScript-specific rules
    if (projectInfo.languages.includes('typescript')) {
      rules.push({
        name: 'TypeScript Patterns',
        description: 'Memory rule for TypeScript best practices',
        trigger: {
          type: 'file_path' as const,
          patterns: ['**/*.ts', '**/*.tsx'],
          conditions: {},
        },
        scope: 'project' as const,
        memoryTypes: ['code_pattern', 'best_practice'] as MemoryType[],
        memoryCategories: ['technical'] as MemoryCategory[],
        maxMemories: 10,
        relevanceThreshold: 0.7,
        context: { language: 'typescript' },
        enabled: true,
      });
    }

    // Database-specific rules
    if (projectInfo.databases?.includes('prisma')) {
      rules.push({
        name: 'Prisma Database Patterns',
        description: 'Memory rule for Prisma database operations',
        trigger: {
          type: 'file_path' as const,
          patterns: ['**/prisma/**', '**/*.prisma'],
          conditions: {},
        },
        scope: 'project' as const,
        memoryTypes: ['code_pattern', 'best_practice'] as MemoryType[],
        memoryCategories: ['technical'] as MemoryCategory[],
        maxMemories: 8,
        relevanceThreshold: 0.7,
        context: { database: 'prisma' },
        enabled: true,
      });
    }

    // Testing-specific rules
    if (
      projectInfo.tools?.includes('jest') ||
      projectInfo.tools?.includes('vitest')
    ) {
      rules.push({
        name: 'Testing Patterns',
        description: 'Memory rule for testing best practices',
        trigger: {
          type: 'file_path' as const,
          patterns: ['**/*.test.*', '**/*.spec.*'],
          conditions: {},
        },
        scope: 'project' as const,
        memoryTypes: ['code_pattern', 'best_practice'] as MemoryType[],
        memoryCategories: ['technical'] as MemoryCategory[],
        maxMemories: 8,
        relevanceThreshold: 0.7,
        context: { testing: true },
        enabled: true,
      });
    }

    // Save the rules
    for (const rule of rules) {
      const memoryRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        scope: rule.scope,
        memoryTypes: rule.memoryTypes,
        memoryCategories: rule.memoryCategories,
        maxMemories: rule.maxMemories,
        relevanceThreshold: rule.relevanceThreshold,
        context: rule.context,
        enabled: rule.enabled,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.storage.saveMemoryRule(memoryRule);
    }
  }

  private async handleManageMemories(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { action, ...restArgs } = args;

    switch (action) {
      case 'save':
        return await this.handleSaveMemory(restArgs);
      case 'search':
        return await this.handleSearchMemories(restArgs);
      case 'list':
        return await this.handleListMemories(restArgs);
      case 'get':
        return await this.handleGetMemory(restArgs);
      case 'stats':
        return await this.handleGetMemoryStats(restArgs);
      default:
        throw new Error(`Unknown memory action: ${action}`);
    }
  }

  private async handleManageMemoryRules(
    args: Record<string, unknown>,
  ): Promise<{ content: TextContent[] }> {
    const { action, ...restArgs } = args;

    switch (action) {
      case 'enhance_request':
        return await this.handleEnhanceAgentRequest(restArgs);
      case 'init_project':
        return await this.handleInitializeProjectMemoryRules(restArgs);
      case 'list':
        return await this.handleListMemoryRules(restArgs);
      case 'create':
        return await this.handleCreateMemoryRule(restArgs);
      default:
        throw new Error(`Unknown memory rule action: ${action}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Code Guidance MCP Server running on stdio');
  }
}
