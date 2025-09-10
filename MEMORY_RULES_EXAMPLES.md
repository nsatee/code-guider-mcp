# Memory Rules for Agent Requests

The Code Guider MCP Server now includes **intelligent memory rules** that automatically attach relevant memories to agent requests, making AI assistants like Cursor much more context-aware and effective.

## How It Works

When you initialize a project with memory capabilities, the system automatically creates intelligent rules that:

1. **Analyze Agent Requests** - Understand the context, file type, project type, and user intent
2. **Find Relevant Memories** - Search for memories that match the request context
3. **Enhance Prompts** - Automatically attach relevant memories to create more informed prompts
4. **Apply Intelligently** - Use different rules for different types of requests

## Automatic Project Initialization

When you run `code-guider-mcp --init`, the system automatically creates memory rules:

```bash
# Initialize a React project with memory rules
code-guider-mcp --init /path/to/react-project

# The system automatically creates:
# - Best Practices & Security rules
# - Project-Specific Knowledge rules
# - File-Specific Pattern rules
# - User Preferences & Learning rules
# - Workflow & Process rules
# - React-Specific Pattern rules
```

## Default Memory Rules Created

### 1. **Best Practices & Security** (Global)

- **Trigger**: Always
- **Memory Types**: `best_practice`, `security_note`, `performance_tip`
- **Purpose**: Attach universal coding best practices to all requests

### 2. **Project-Specific Knowledge** (Project)

- **Trigger**: Always
- **Memory Types**: `project_requirement`, `architecture_decision`, `workflow_insight`
- **Purpose**: Attach project-specific requirements and decisions

### 3. **File-Specific Patterns** (Project)

- **Trigger**: File path patterns (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, etc.)
- **Memory Types**: `code_pattern`, `error_solution`, `template_usage`
- **Purpose**: Attach memories related to specific file types

### 4. **User Preferences & Learning** (Global)

- **Trigger**: User query patterns (`how to`, `what is`, `explain`, `help`, `tutorial`)
- **Memory Types**: `user_preference`, `error_solution`, `best_practice`
- **Purpose**: Attach learning and preference memories for help requests

### 5. **Workflow & Process** (Project)

- **Trigger**: Workflow execution
- **Memory Types**: `workflow_insight`, `template_usage`, `quality_rule`
- **Purpose**: Attach workflow-related memories during execution

### 6. **React-Specific Patterns** (Global, for React projects)

- **Trigger**: File path patterns (`.tsx`, `.jsx`)
- **Memory Types**: `code_pattern`, `best_practice`, `integration_pattern`
- **Purpose**: Attach React-specific patterns and best practices

## Usage Examples

### 1. Initialize Project with Memory Rules

```typescript
// Initialize memory rules for a React project
await mcpClient.callTool('initialize_project_memory_rules', {
  projectPath: '/path/to/react-project',
  projectType: 'react',
});

// Result: Creates 6 intelligent memory rules automatically
```

### 2. Enhance Agent Requests with Memories

```typescript
// Enhance a Cursor request with relevant memories
const enhancedRequest = await mcpClient.callTool('enhance_agent_request', {
  request: 'Create a React component for user authentication',
  context: {
    filePath: '/src/components/AuthForm.tsx',
    projectPath: '/path/to/react-project',
    projectType: 'react',
    agentType: 'cursor',
  },
});

// Result: Automatically attaches relevant memories like:
// - React component best practices
// - Authentication patterns
// - Project-specific auth requirements
// - Security considerations
```

### 3. File-Specific Memory Attachment

```typescript
// When working on a TypeScript file
const enhancedRequest = await mcpClient.callTool('enhance_agent_request', {
  request: 'Fix this TypeScript error',
  context: {
    filePath: '/src/utils/api.ts',
    projectType: 'react',
    codeContent: "const data = await fetch('/api/users');",
  },
});

// Result: Automatically attaches:
// - TypeScript best practices
// - API error handling patterns
// - Project-specific API patterns
// - Common TypeScript solutions
```

### 4. Workflow-Enhanced Requests

```typescript
// During workflow execution
const enhancedRequest = await mcpClient.callTool('enhance_agent_request', {
  request: 'Generate the next step in the workflow',
  context: {
    workflowId: 'react-component-creation',
    workflowStep: 'create-component',
    projectType: 'react',
  },
});

// Result: Automatically attaches:
// - Workflow-specific insights
// - Component creation patterns
// - Project quality rules
// - Template usage examples
```

## Memory Rule Management

### List All Rules

```typescript
// List all memory rules
const rules = await mcpClient.callTool('list_memory_rules', {});

// List only project-specific rules
const projectRules = await mcpClient.callTool('list_memory_rules', {
  scope: 'project',
});

// List only global rules
const globalRules = await mcpClient.callTool('list_memory_rules', {
  scope: 'global',
});
```

### Create Custom Rules

```typescript
// Create a custom memory rule
await mcpClient.callTool('create_memory_rule', {
  rule: {
    name: 'API Error Handling',
    description: 'Attach API error handling patterns for API-related requests',
    trigger: {
      type: 'file_path',
      patterns: ['/api/', '/services/', 'api.ts', 'service.ts'],
      conditions: {},
    },
    scope: 'project',
    memoryTypes: ['code_pattern', 'error_solution', 'best_practice'],
    memoryCategories: ['technical', 'troubleshooting'],
    maxMemories: 3,
    relevanceThreshold: 0.7,
    context: { projectType: 'api' },
    enabled: true,
  },
});
```

## Integration with Cursor

### 1. **Automatic Enhancement**

When you use Cursor, the memory rules automatically enhance your requests:

```typescript
// Your original Cursor request:
"Create a login form component"

// Enhanced with memories:
"Create a login form component

**Relevant Knowledge Base:**
1. **best_practice** (global): Always use TypeScript strict mode and avoid 'any' types
2. **security_note** (global): Implement proper input validation and CSRF protection
3. **code_pattern** (project): Use our custom useAuth hook for authentication state
4. **project_requirement** (project): Forms must use our design system components

**Context:**
- Project: react
- File: /src/components/LoginForm.tsx
- Agent: cursor

Please use the relevant knowledge above to provide a more informed and contextual response."
```

### 2. **Context-Aware Responses**

The system understands different contexts:

- **File Type**: Different memories for `.tsx` vs `.py` files
- **Project Type**: React-specific vs API-specific patterns
- **Request Type**: Help requests vs code generation vs debugging
- **Workflow State**: Different memories during workflow execution

### 3. **Learning Over Time**

As you save more memories, the system becomes smarter:

```typescript
// Save a memory about a specific pattern you use
await mcpClient.callTool('save_memory', {
  content:
    'In this project, we always use React Query for data fetching instead of useEffect',
  type: 'project_requirement',
  category: 'technical',
  tags: ['react', 'data-fetching', 'project-specific'],
  context: { projectType: 'react', framework: 'react-query' },
});

// This memory will now be automatically attached to future React data fetching requests
```

## Benefits for Cursor Users

1. **Consistent Patterns**: Automatically applies your project's coding patterns
2. **Security Awareness**: Always includes security best practices
3. **Project Context**: Remembers your project's specific requirements
4. **Learning**: Gets smarter as you add more memories
5. **Efficiency**: Reduces need to repeat context in every request
6. **Quality**: Ensures consistent code quality across the project

## Example Workflow

```typescript
// 1. Initialize project with memory rules
await mcpClient.callTool('initialize_project_memory_rules', {
  projectPath: '/my-react-app',
  projectType: 'react',
});

// 2. Save some project-specific memories
await mcpClient.callTool('save_memory', {
  content: 'We use Tailwind CSS for styling and shadcn/ui for components',
  type: 'project_requirement',
  category: 'technical',
  tags: ['styling', 'ui', 'project-specific'],
});

// 3. Use Cursor with enhanced requests
const enhancedRequest = await mcpClient.callTool('enhance_agent_request', {
  request: 'Create a button component',
  context: {
    filePath: '/src/components/Button.tsx',
    projectType: 'react',
    agentType: 'cursor',
  },
});

// 4. Cursor now has context about:
// - Your styling preferences (Tailwind + shadcn/ui)
// - React best practices
// - Project-specific patterns
// - Security considerations
// - And more...
```

This intelligent memory system makes Cursor much more effective by providing rich, contextual knowledge that grows with your project!
