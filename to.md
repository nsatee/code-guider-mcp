# Code Guider MCP Server - Consolidated Function Implementation

## Overview

This document provides the complete implementation guide for consolidating the Code Guider MCP Server from 47 individual functions to 13 unified functions with action parameters.

## Current State

- **Current Functions**: 47 individual MCP functions
- **Target Functions**: 13 consolidated functions
- **Reduction**: 72% fewer functions
- **Available Slots**: 27 additional slots for other MCP servers

## Implementation Plan

### 1. Update Tool Definitions

Replace the current 47 tool definitions in `src/mcp-server.ts` with these 13 consolidated functions:

```typescript
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
          description: 'Path to project directory (required for execute)',
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
          enum: ['guidance', 'validation', 'ai_analysis', 'similar_code'],
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
          description: 'Maximum number of results (optional for similar_code)',
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
    description: 'Unified semantic search across different content types',
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
          description: 'ID of execution (required for status/pause/resume)',
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
          description: 'Transformation description (required for other types)',
        },
        source: {
          type: 'string',
          description: 'Source format (optional for data, default: file-based)',
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
          enum: ['list', 'init', 'info', 'sync'],
          description: 'Action to perform',
        },
        projectPath: {
          type: 'string',
          description:
            'Path to project directory (optional, defaults to current)',
        },
        projectType: {
          type: 'string',
          description: 'Type of project (optional for init)',
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
          description: 'Maximum number of results (optional for search/list)',
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
          description: 'Original request (required for enhance_request)',
        },
        context: {
          type: 'object',
          description: 'Context information (required for enhance_request)',
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
];
```

### 2. Update Switch Statement

Replace the current switch statement in the `CallToolRequestSchema` handler:

```typescript
switch (name) {
  case 'manage_workflows':
    return await this.handleManageWorkflows(args);
  case 'manage_templates':
    return await this.handleManageTemplates(args);
  case 'analyze_code':
    return await this.handleAnalyzeCode(args);
  case 'manage_quality_rules':
    return await this.handleManageQualityRules(args);
  case 'semantic_search':
    return await this.handleSemanticSearch(args);
  case 'manage_execution':
    return await this.handleManageExecution(args);
  case 'manage_roles':
    return await this.handleManageRoles(args);
  case 'ai_migrate':
    return await this.handleAIMigrate(args);
  case 'manage_projects':
    return await this.handleManageProjects(args);
  case 'manage_memories':
    return await this.handleManageMemories(args);
  case 'manage_memory_rules':
    return await this.handleManageMemoryRules(args);
  case 'get_execution_metrics':
    return await this.handleGetExecutionMetrics(args);
  case 'transition_role':
    return await this.handleTransitionRole(args);
  default:
    throw new Error(`Unknown tool: ${name}`);
}
```

### 3. Implement New Handler Methods

Add these new handler methods to the `CodeGuidanceMCPServer` class:

```typescript
private async handleManageWorkflows(args: any): Promise<{ content: TextContent[] }> {
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

private async handleManageTemplates(args: any): Promise<{ content: TextContent[] }> {
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

private async handleAnalyzeCode(args: any): Promise<{ content: TextContent[] }> {
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

private async handleManageQualityRules(args: any): Promise<{ content: TextContent[] }> {
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

private async handleSemanticSearch(args: any): Promise<{ content: TextContent[] }> {
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

private async handleManageExecution(args: any): Promise<{ content: TextContent[] }> {
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

private async handleManageRoles(args: any): Promise<{ content: TextContent[] }> {
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

private async handleAIMigrate(args: any): Promise<{ content: TextContent[] }> {
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

private async handleManageProjects(args: any): Promise<{ content: TextContent[] }> {
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
    default:
      throw new Error(`Unknown project action: ${action}`);
  }
}

private async handleManageMemories(args: any): Promise<{ content: TextContent[] }> {
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

private async handleManageMemoryRules(args: any): Promise<{ content: TextContent[] }> {
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
```

### 4. Keep Existing Handler Methods

All existing handler methods (`handleListWorkflows`, `handleGetWorkflow`, etc.) should remain unchanged. The new consolidated handlers simply route to these existing methods.

### 5. Update Documentation

Update the README.md to reflect the new consolidated API:

```markdown
## MCP Functions

The Code Guider MCP Server provides 13 consolidated functions:

1. **manage_workflows** - Workflow management (list, get, create, execute)
2. **manage_templates** - Template management (list, create)
3. **analyze_code** - Code analysis (guidance, validation, ai_analysis, similar_code)
4. **manage_quality_rules** - Quality rules management (list, create)
5. **semantic_search** - Semantic search (workflows, templates, code)
6. **manage_execution** - Execution management (execute, status, pause, resume)
7. **manage_roles** - Role management (list, guidance)
8. **ai_migrate** - AI migration (data, workflows, templates, quality_rules)
9. **manage_projects** - Project management (list, init, info, sync)
10. **manage_memories** - Memory management (save, search, list, get, stats)
11. **manage_memory_rules** - Memory rules management (enhance_request, init_project, list, create)
12. **get_execution_metrics** - Get execution metrics
13. **transition_role** - Transition between roles
```

## Benefits of Consolidation

1. **Reduced Function Count**: 72% reduction (47 → 13)
2. **More MCP Slots**: 27 additional slots for other MCP servers
3. **Cleaner API**: Logical grouping of related operations
4. **Easier Maintenance**: Fewer functions to maintain
5. **Better Organization**: Related operations grouped together
6. **Consistent Interface**: All functions follow similar patterns

## Testing

After implementation, test each consolidated function with different action/type parameters to ensure all existing functionality works correctly.

## Migration Notes

- All existing functionality is preserved
- Performance impact is negligible
- The consolidation uses action/type parameters to differentiate operations
- Error handling and validation remain the same
- All return formats remain unchanged
