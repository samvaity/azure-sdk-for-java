/**
 * Simple VS Code MCP Client Test
 *
 * This demonstrates how to use the TypeSpec sync tools through simple prompts
 * once the MCP server is configured in VS Code.
 */

// Example prompts you can use directly in VS Code with the MCP server:

const examplePrompts = [
  // 1. Environment validation
  `Use the typespec_validate_environment tool to check if the Document Intelligence project is ready for synchronization.
   Project path: C:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence`,

  // 2. Analyze TypeSpec configuration
  `Use typespec_analyze_config to examine the TypeSpec setup for the Document Intelligence project.
   Project path: C:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence`,

  // 3. Check compilation status
  `Run typespec_analyze_compilation to identify any compilation errors in the Document Intelligence project.
   Project path: C:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence`,

  // 4. Full orchestration (dry run)
  `Use typespec_sync_orchestrate to perform a dry run analysis of TypeSpec synchronization issues.
   Parameters: {
     "projectPath": "C:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence",
     "dryRun": true,
     "verbose": true
   }`,

  // 5. Parse existing compilation errors
  `Use typespec_parse_compilation_errors to analyze this Maven output and suggest fixes:
   [paste your Maven compilation output here]`,

  // 6. Project structure analysis
  `Analyze the project structure using typespec_analyze_project_structure for the Document Intelligence project.
   Project path: C:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence`
];

// Simple natural language prompts that will work:
const naturalLanguagePrompts = [
  "Check if my Document Intelligence project environment is ready for TypeSpec sync",

  "What's the current TypeSpec configuration for Document Intelligence?",

  "Are there any compilation errors in the Document Intelligence project?",

  "Run a dry-run analysis to see what TypeSpec sync changes would be made",

  "Help me understand the structure of my TypeSpec-generated project",

  "I have Maven compilation errors - can you analyze them and suggest fixes?"
];

export { examplePrompts, naturalLanguagePrompts };
