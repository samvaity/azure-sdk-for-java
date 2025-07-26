# Using TypeSpec Sync MCP Server in VS Code

## Quick Start

With the MCP server running, you can now use simple prompts in VS Code to access the TypeSpec synchronization tools.

## Available Tools

### 1. **Environment Validation** 
**Prompt**: "Check if my Document Intelligence project is ready for TypeSpec sync"

**What it does**: 
- Checks Maven availability
- Verifies project structure (pom.xml, customization directory)
- Confirms TypeSpec configuration exists

### 2. **TypeSpec Configuration Analysis**
**Prompt**: "What's the current TypeSpec configuration for Document Intelligence?"

**What it does**:
- Reads tsp-location.yaml
- Shows current commit SHA, directory, and repository
- Helps understand TypeSpec version being used

### 3. **Compilation Analysis**
**Prompt**: "Are there any compilation errors in the Document Intelligence project?"

**What it does**:
- Runs `mvn clean compile`
- Identifies compilation errors and patterns
- Suggests potential fixes based on error types

### 4. **Complete Orchestration**
**Prompt**: "Run a dry-run analysis to see what TypeSpec sync changes would be made"

**What it does**:
- Full multi-stage analysis
- Identifies required fixes
- Shows what would be changed (without applying)

### 5. **Parse Compilation Errors**
**Prompt**: "I have Maven compilation errors - analyze them: [paste output]"

**What it does**:
- Parses Maven compilation output
- Extracts structured error information
- Generates fix suggestions

### 6. **Project Structure Analysis**
**Prompt**: "Help me understand the structure of my TypeSpec-generated project"

**What it does**:
- Maps generated vs customization files
- Shows TypeSpec integration status
- Identifies key project components

## Example Conversations

### Simple Check
```
You: "Check if my Document Intelligence project is ready for TypeSpec sync"

AI: I'll validate your environment using the TypeSpec sync tools.
[Uses typespec_validate_environment tool]

Result: ✅ Environment validation passed
- Maven is available
- Project structure is valid
- Customization directory found
- TypeSpec configuration detected
```

### Compilation Analysis
```
You: "Are there any compilation errors in the Document Intelligence project?"

AI: Let me analyze the compilation status of your project.
[Uses typespec_analyze_compilation tool]

Result: Found 0 compilation errors - project is already in sync
```

### Full Dry Run
```
You: "Run a dry-run to see what changes would be made"

AI: I'll perform a comprehensive dry-run analysis.
[Uses typespec_sync_orchestrate with dryRun: true]

Result: Would apply 0 fixes - project is currently synchronized
```

## Project Path
The tools are configured to work with your Document Intelligence project at:
```
C:\Users\savaity\IdeaProjects\azure-sdk-for-java\sdk\documentintelligence\azure-ai-documentintelligence
```

## Natural Language Support

You can use natural language prompts like:
- "Help me fix TypeSpec compilation issues"
- "What's wrong with my Document Intelligence build?"
- "Sync my customizations with the latest TypeSpec changes"
- "Show me the TypeSpec configuration details"

The AI will automatically select the appropriate tools and coordinate the multi-stage process as needed.

## Server Status

✅ MCP Server is running and ready
✅ 6 specialized tools available
✅ VS Code integration configured
✅ Ready for natural language prompts
