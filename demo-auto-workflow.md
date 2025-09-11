# Auto-Workflow Detection Demo

This demonstrates the new automatic workflow detection feature that triggers workflows based on natural language input.

## How It Works

The MCP server now includes an **Auto-Workflow Detector** that:

1. **Analyzes natural language input** for development task patterns
2. **Matches patterns** to predefined workflow triggers
3. **Suggests or auto-executes** appropriate workflows
4. **Extracts variables** from the input (component names, frameworks, etc.)

## Available MCP Tools

### 1. `auto_detect_workflow`

Automatically detect and suggest workflows based on natural language input.

**Parameters:**

- `userInput` (required): Natural language input to analyze
- `projectPath` (optional): Path to project directory
- `currentFile` (optional): Current file being worked on
- `projectType` (optional): Type of project
- `autoExecute` (optional): Whether to automatically execute detected workflows

### 2. `init_samples`

Initialize sample workflows and templates for auto-workflow detection.

**Parameters:**

- `action` (required): "init", "status", or "check"

## Example Usage

### Initialize Samples First

```bash
# Initialize sample workflows and templates
mcp call init_samples --action init
```

### Test Auto-Workflow Detection

```bash
# Detect workflow for building a button
mcp call auto_detect_workflow --userInput "build a button component"

# Detect workflow for creating a form
mcp call auto_detect_workflow --userInput "create a form with validation"

# Detect workflow for API endpoint
mcp call auto_detect_workflow --userInput "build an API endpoint for users"

# Auto-execute detected workflow
mcp call auto_detect_workflow --userInput "build a modal component" --autoExecute true
```

## Supported Patterns

### UI Components

- "build a button" → React Button Component workflow
- "create a form" → React Form Component workflow
- "make a modal" → React Modal Component workflow
- "add styling" → Tailwind CSS Styling workflow

### Backend/API

- "build an API" → Express API Endpoint workflow
- "create CRUD" → Express CRUD Operations workflow
- "setup database" → Database Schema workflow

### Testing

- "write tests" → Jest Unit Tests workflow
- "create test suite" → Jest Unit Tests workflow

### Authentication

- "setup auth" → Authentication workflow
- "create login" → Authentication workflow

### Performance

- "optimize performance" → Performance Optimization workflow
- "make it faster" → Performance Optimization workflow

## Sample Workflows Included

1. **React Button Component** - Creates a reusable button with TypeScript and Tailwind
2. **React Form Component** - Creates a form with validation and error handling
3. **React Modal Component** - Creates a modal with backdrop and animations
4. **Express API Endpoint** - Creates a RESTful API with validation
5. **Express CRUD Operations** - Creates full CRUD operations
6. **Jest Unit Tests** - Creates comprehensive unit tests
7. **Tailwind CSS Styling** - Adds responsive styling

## Sample Templates Included

1. **React Button Component** - TypeScript + Tailwind button template
2. **React Form Component** - Form with validation template
3. **React Modal Component** - Modal with portal template
4. **Express API Route** - API route with error handling template
5. **Jest Unit Test** - Comprehensive test template

## Features

### Pattern Matching

- **Regex-based patterns** for common development tasks
- **Confidence scoring** for match quality
- **Variable extraction** from natural language
- **Context-aware suggestions**

### Auto-Execution

- **High-confidence triggers** can auto-execute
- **Variable substitution** from input
- **Workflow step execution** with progress tracking
- **Error handling** and rollback

### Smart Suggestions

- **Contextual suggestions** when no patterns match
- **Framework-specific recommendations**
- **Common pattern examples**
- **Learning from user input**

## Integration with Existing MCP Tools

The auto-workflow detection integrates seamlessly with existing MCP tools:

- **`manage_workflows`** - Lists and manages workflows
- **`manage_templates`** - Manages code templates
- **`manage_execution`** - Executes workflows with roles
- **`analyze_code`** - Analyzes code for patterns
- **`semantic_search`** - Searches for similar workflows

## Benefits

1. **Natural Language Interface** - Use plain English to trigger workflows
2. **Automatic Detection** - No need to remember specific commands
3. **Context Awareness** - Understands project type and current file
4. **Variable Extraction** - Automatically extracts component names, frameworks, etc.
5. **Smart Suggestions** - Provides helpful suggestions when patterns don't match
6. **Seamless Integration** - Works with existing MCP tools and workflows

## Example Output

When you say "build a button component", the system will:

1. **Detect the pattern** with 90% confidence
2. **Extract variables** like componentName="Button", framework="react"
3. **Suggest the workflow** "React Button Component"
4. **Auto-execute** if confidence > 80% and autoExecute=true
5. **Create files** using the appropriate templates
6. **Run quality checks** and validation
7. **Provide feedback** on execution results

This makes the MCP server much more intuitive and user-friendly for development tasks!
