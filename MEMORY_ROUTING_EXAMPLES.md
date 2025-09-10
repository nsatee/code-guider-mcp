# Intelligent Memory Routing System

The Code Guider MCP Server now includes an **intelligent memory routing system** that automatically decides whether to store memories globally or project-specifically based on AI-powered analysis of the content, context, and metadata.

## How It Works

The system analyzes multiple factors to make routing decisions:

1. **Memory Type Analysis** - Different types have different storage preferences
2. **Content Analysis** - Keywords and patterns suggest global vs project scope
3. **Context Analysis** - Project-specific vs general context indicators
4. **Tag Analysis** - Tags that suggest global or project-specific storage
5. **Category Analysis** - Technical vs process vs preference categories
6. **Project Context** - Current project state and requirements

## Memory Types and Their Routing

### Global Storage (Shared Across All Projects)

- `best_practice` - Universal coding best practices
- `user_preference` - User-specific preferences and settings
- `error_solution` - Common error solutions and fixes
- `performance_tip` - General performance optimization tips
- `security_note` - Security best practices and warnings
- `integration_pattern` - Common integration patterns

### Project Storage (Project-Specific)

- `project_requirement` - Specific project requirements
- `architecture_decision` - Project architecture decisions
- `workflow_insight` - Project-specific workflow insights
- `template_usage` - How templates are used in this project

### Neutral Types (Context-Dependent)

- `code_pattern` - Can be global or project-specific based on content
- `quality_rule` - Depends on whether it's a general rule or project-specific

## Usage Examples

### 1. Saving a Global Best Practice

```typescript
// This will be routed to GLOBAL storage
await mcpClient.callTool('save_memory', {
  content:
    "Always use TypeScript strict mode and avoid 'any' types. Use proper type definitions for better code quality and maintainability.",
  type: 'best_practice',
  category: 'technical',
  tags: ['typescript', 'code-quality', 'general'],
  context: {
    language: 'typescript',
    framework: 'general',
  },
});

// Result: Stored in global database, available to all projects
```

### 2. Saving a Project-Specific Requirement

```typescript
// This will be routed to PROJECT storage
await mcpClient.callTool('save_memory', {
  content:
    "This project uses a custom authentication system with JWT tokens and requires all API endpoints to validate the 'X-User-ID' header.",
  type: 'project_requirement',
  category: 'technical',
  tags: ['authentication', 'api', 'project-specific'],
  context: {
    projectPath: '/path/to/project',
    projectType: 'api',
    framework: 'express',
  },
});

// Result: Stored in project database, only available to this project
```

### 3. Saving a Code Pattern (Context-Dependent)

```typescript
// This will be routed to PROJECT storage due to project-specific context
await mcpClient.callTool('save_memory', {
  content:
    'In this React project, we use a custom hook pattern for API calls: useApiCall(endpoint, options) that handles loading states and error handling consistently.',
  type: 'code_pattern',
  category: 'technical',
  tags: ['react', 'custom-hook', 'api'],
  context: {
    projectPath: '/path/to/react-project',
    projectType: 'react',
    framework: 'react',
    filePath: '/src/hooks/useApiCall.ts',
  },
});

// Result: Stored in project database due to project-specific context
```

### 4. Searching Memories

```typescript
// Search across both global and project memories
const results = await mcpClient.callTool('search_memories', {
  query: 'TypeScript best practices',
  limit: 10,
});

// Search only global memories
const globalResults = await mcpClient.callTool('search_memories', {
  query: 'error handling patterns',
  scope: 'global',
  limit: 5,
});

// Search only project memories
const projectResults = await mcpClient.callTool('search_memories', {
  query: 'authentication implementation',
  scope: 'project',
  limit: 5,
});
```

### 5. Listing Memories with Filters

```typescript
// List all memories
const allMemories = await mcpClient.callTool('list_memories', {
  limit: 50,
});

// List only best practices
const bestPractices = await mcpClient.callTool('list_memories', {
  type: 'best_practice',
  limit: 20,
});

// List only project-specific memories
const projectMemories = await mcpClient.callTool('list_memories', {
  scope: 'project',
  limit: 30,
});
```

## Decision Factors

The system analyzes these factors to make routing decisions:

### Content Analysis

- **Global indicators**: "general", "universal", "best practice", "standard", "common", "reusable", "template", "pattern", "guideline", "rule"
- **Project indicators**: "this project", "our project", "specific", "custom", "local", "project requirement", "business logic", "domain", "architecture"

### Context Analysis

- **Project context**: `projectPath`, `projectId`, `projectName` → Project storage
- **File context**: `filePath`, `fileName` → Project storage
- **User context**: `userId`, `userPreferences` → Global storage
- **Technology context**: `framework`, `technology`, `language` → Global storage

### Tag Analysis

- **Global tags**: "general", "universal", "best-practice", "standard", "common", "reusable", "template", "pattern", "guideline", "rule"
- **Project tags**: "project-specific", "custom", "local", "business", "domain", "architecture", "team", "organization"

## Memory Statistics

```typescript
// Get comprehensive memory statistics
const stats = await mcpClient.callTool('get_memory_stats', {});

// Returns:
// {
//   total: 150,
//   byType: {
//     'best_practice': 45,
//     'code_pattern': 30,
//     'project_requirement': 25,
//     'error_solution': 20,
//     // ... other types
//   },
//   byCategory: {
//     'technical': 80,
//     'process': 35,
//     'preference': 20,
//     // ... other categories
//   },
//   byScope: {
//     'global': 100,
//     'project': 50
//   }
// }
```

## Benefits

1. **Intelligent Routing**: Automatically determines the best storage location
2. **Context Awareness**: Considers project context and content analysis
3. **Flexible Search**: Search across both global and project memories
4. **Learning System**: Improves routing decisions over time
5. **Performance**: Fast semantic search with vector embeddings
6. **Scalability**: Handles multiple projects with isolated memories
7. **Consistency**: Ensures similar memories are stored consistently

## Integration with Existing Features

The memory system integrates seamlessly with existing Code Guider features:

- **Workflow Execution**: Memories can be created during workflow execution
- **Code Analysis**: AI analysis results can be saved as memories
- **Template Usage**: Template usage patterns can be remembered
- **Quality Rules**: Quality rule violations can be saved as learning memories
- **Project Management**: Memories are automatically scoped to the current project

This intelligent memory routing system ensures that knowledge is stored in the most appropriate location, making it easily discoverable and relevant to the context where it's needed.
