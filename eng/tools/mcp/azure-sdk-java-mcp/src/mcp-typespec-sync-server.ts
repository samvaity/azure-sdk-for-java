/**
 * MCP Server Integration: TypeSpec Sync Tools
 *
 * This file integrates all TypeSpec synchronization tools into the MCP server,
 * making them available for AI agents to orchestrate complex multi-stage operations.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import our TypeSpec sync tools
import {
    conductTypeSpecSync,
    validateEnvironment,
    runCompilationAnalysis,
    updateTypeSpecClient,
    analyzeTypeSpecConfig,
} from './typespec-sync-conductor.js';

import { parseCompilationErrors } from './compilation-issue-detector.js';

const server = new Server(
  {
    name: 'azure-sdk-java-typespec-sync',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Register all TypeSpec synchronization tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Main orchestration tool
      {
        name: 'typespec_sync_orchestrate',
        description: `
Main orchestration tool for TypeSpec synchronization. Coordinates a multi-stage process to:
1. Validate environment and project structure
2. Analyze compilation errors from Maven
3. Generate and apply fixes to customization code
4. Verify fixes through recompilation

Use this when TypeSpec updates cause compilation errors in Azure SDK customizations.
        `.trim(),
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Absolute path to the Azure SDK project directory (containing pom.xml)'
            },
            dryRun: {
              type: 'boolean',
              description: 'If true, analyze and plan fixes without applying them',
              default: false
            },
            verbose: {
              type: 'boolean',
              description: 'Enable verbose logging for detailed progress information',
              default: false
            },
            commitSha: {
              type: 'string',
              description: 'TypeSpec commit SHA to analyze for specific change patterns (e.g., 74d0cc137b23cbaab58baa746f182876522e88a0)',
              default: undefined
            }
          },
          required: ['projectPath']
        }
      },

      // Environment validation
      {
        name: 'typespec_validate_environment',
        description: `
Validates that the environment is ready for TypeSpec synchronization:
- Checks Maven availability
- Verifies project structure (pom.xml, customization directory)
- Confirms TypeSpec configuration (tsp-location.yaml)

Call this before running synchronization to ensure prerequisites are met.
        `.trim(),
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Absolute path to the project directory'
            }
          },
          required: ['projectPath']
        }
      },

      // Compilation analysis
      {
        name: 'typespec_analyze_compilation',
        description: `
Runs Maven compilation and analyzes errors to identify TypeSpec-related issues:
- Executes 'mvn clean compile' on the project
- Parses compilation output for error patterns
- Identifies affected files and symbols
- Suggests potential fixes based on error patterns

Use this to understand current compilation state before applying fixes.
        `.trim(),
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Absolute path to the project directory'
            }
          },
          required: ['projectPath']
        }
      },

      // TypeSpec configuration analysis
      {
        name: 'typespec_analyze_config',
        description: `
Analyzes TypeSpec configuration to understand current state:
- Reads tsp-location.yaml
- Extracts current commit, directory, and repository information
- Helps understand what TypeSpec version is being used

Useful for understanding the context of TypeSpec changes.
        `.trim(),
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Absolute path to the project directory'
            }
          },
          required: ['projectPath']
        }
      },

      // TypeSpec client update
      {
        name: 'typespec_update_client',
        description: `
Updates TypeSpec client code using tsp-client:
- Runs 'tsp-client update' to regenerate code
- Updates generated files based on current TypeSpec configuration

Use this to sync generated code with TypeSpec specification changes.
        `.trim(),
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Absolute path to the project directory'
            }
          },
          required: ['projectPath']
        }
      },

      // Compilation error parser
      {
        name: 'typespec_parse_compilation_errors',
        description: `
Parses Maven compilation output to extract structured error information:
- Identifies file paths, line numbers, and error types
- Extracts symbol information from compilation messages
- Generates potential fix suggestions based on error patterns

Use this to analyze compilation output from Maven builds.
        `.trim(),
        inputSchema: {
          type: 'object',
          properties: {
            mavenOutput: {
              type: 'string',
              description: 'Raw Maven compilation output containing error messages'
            }
          },
          required: ['mavenOutput']
        }
      },

      // Project structure analyzer
      {
        name: 'typespec_analyze_project_structure',
        description: `
Analyzes project structure to understand TypeSpec integration:
- Identifies generated vs customization files
- Maps relationships between TypeSpec specs and generated code
- Checks for proper autorest.java customization setup

Helps understand project layout for troubleshooting and fix application.
        `.trim(),
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Absolute path to the project directory'
            }
          },
          required: ['projectPath']
        }
      }
    ]
  };
});

/**
 * Handle tool execution requests
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'typespec_sync_orchestrate': {
        const { projectPath, dryRun = false, verbose = false, commitSha } = args as {
          projectPath: string;
          dryRun?: boolean;
          verbose?: boolean;
          commitSha?: string;
        };

        const result = await conductTypeSpecSync({
          projectPath,
          dryRun,
          verbose,
          commitSha
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'typespec_validate_environment': {
        const { projectPath } = args as { projectPath: string };

        const result = await validateEnvironment(projectPath);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'typespec_analyze_compilation': {
        const { projectPath } = args as { projectPath: string };

        const result = await runCompilationAnalysis(projectPath);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }      case 'typespec_analyze_config': {
        const { projectPath } = args as { projectPath: string };

        const result = await analyzeTypeSpecConfig(projectPath);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'typespec_update_client': {
        const { projectPath } = args as { projectPath: string };

        const result = await updateTypeSpecClient(projectPath);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'typespec_parse_compilation_errors': {
        const { mavenOutput } = args as { mavenOutput: string };

        const result = parseCompilationErrors(mavenOutput);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'typespec_analyze_project_structure': {
        const { projectPath } = args as { projectPath: string };

        // Implementation for project structure analysis
        const result = await analyzeProjectStructure(projectPath);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
            tool: name,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

/**
 * Analyze project structure to understand TypeSpec integration
 */
async function analyzeProjectStructure(projectPath: string) {
  const fs = await import('fs');
  const path = await import('path');

  const structure = {
    hasTypeSpecConfig: false,
    hasPom: false,
    hasCustomizations: false,
    generatedSources: [] as string[],
    customizationFiles: [] as string[],
    tspConfig: null as any
  };

  // Check for TypeSpec configuration
  const tspLocationPath = path.join(projectPath, 'tsp-location.yaml');
  structure.hasTypeSpecConfig = fs.existsSync(tspLocationPath);

  if (structure.hasTypeSpecConfig) {
    try {
      structure.tspConfig = await analyzeTypeSpecConfig(projectPath);
    } catch (error) {
      // Handle parsing errors
    }
  }

  // Check for Maven configuration
  structure.hasPom = fs.existsSync(path.join(projectPath, 'pom.xml'));

  // Check for customization directory
  const customizationPath = path.join(projectPath, 'customization');
  structure.hasCustomizations = fs.existsSync(customizationPath);

  if (structure.hasCustomizations) {
    // Find customization files
    const findJavaFiles = (dir: string): string[] => {
      const files: string[] = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...findJavaFiles(fullPath));
          } else if (entry.name.endsWith('.java')) {
            files.push(path.relative(projectPath, fullPath));
          }
        }
      } catch (error) {
        // Handle directory read errors
      }
      return files;
    };

    structure.customizationFiles = findJavaFiles(customizationPath);
  }

  // Find generated sources
  const srcMainJavaPath = path.join(projectPath, 'src', 'main', 'java');
  if (fs.existsSync(srcMainJavaPath)) {
    const findJavaFiles = (dir: string): string[] => {
      const files: string[] = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...findJavaFiles(fullPath));
          } else if (entry.name.endsWith('.java')) {
            files.push(path.relative(projectPath, fullPath));
          }
        }
      } catch (error) {
        // Handle directory read errors
      }
      return files;
    };

    structure.generatedSources = findJavaFiles(srcMainJavaPath);
  }

  return structure;
}

/**
 * Start the MCP server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Azure SDK Java TypeSpec Sync MCP Server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Server failed:', error);
    process.exit(1);
  });
}

export { server };
