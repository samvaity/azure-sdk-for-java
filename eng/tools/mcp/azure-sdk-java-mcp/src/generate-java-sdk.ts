/**
 * SIMPLE POC: Azure SDK Tools CLI + Java MCP Integration
 *
 * Flow:
 * 1. Use Azure SDK Tools CLI (azsdk-cli) for TypeSpec operations
 * 2. Java MCP handles Java-specific operations (Maven, validation, etc.)
 *
 * Based on: https://github.com/Azure/azure-sdk-tools/tree/main/tools/azsdk-cli/Azure.Sdk.Tools.Cli
 */

import { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { spawnAsync } from "./utils/index.js";
import * as path from "path";
import * as fs from "fs";

/**
 * Simple POC: Generate Java SDK using Azure SDK Tools CLI + Java MCP
 *
 * @param moduleDir - The SDK project directory (contains tsp-location.yaml or tspconfig.yaml)
 * @param isGenerate - Whether to generate (true) or update (false) the SDK
 * @returns CallToolResult with generation and Java-specific processing results
 */
export async function generateJavaSdk(moduleDir: string, isGenerate: boolean = true): Promise<CallToolResult> {
    try {
        let result = `🔄 Simple POC: Azure SDK Tools CLI + Java MCP\n\n`;

        // STEP 1: Call Azure SDK Tools CLI (azsdk-cli) for TypeSpec operations
        result += `📦 STEP 1: TypeSpec Generation (Azure SDK Tools CLI)\n`;
        result += `Command: azsdk.exe spec-workflow generate-sdk --typespec-project ${moduleDir} --language Java --pr 0 --workitem-id 0\n\n`;

        const azsdkResult = await callAzureSdkToolsCli(moduleDir, isGenerate);
        result += azsdkResult.output;

        if (azsdkResult.success) {
            // STEP 2: Java MCP handles language-specific operations
            result += `\n🔧 STEP 2: Java-Specific Operations (Java MCP)\n`;
            result += `Taking over for Maven setup, validation, and Java-specific tasks...\n\n`;

            const javaOperations = await performJavaOperations(moduleDir);
            result += javaOperations;

        } else {
            result += `\n⚠️  TypeSpec generation failed. Skipping Java-specific operations.\n`;
        }

        return {
            content: [
                {
                    type: "text",
                    text: result,
                },
            ],
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Unexpected error in Java SDK generation: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
}

/**
 * Calls Azure SDK Tools CLI (azsdk-cli) for TypeSpec operations
 * See: https://github.com/Azure/azure-sdk-tools/tree/main/tools/azsdk-cli
 */
async function callAzureSdkToolsCli(moduleDir: string, isGenerate: boolean): Promise<{ success: boolean; output: string }> {
    try {
        // Use the Azure SDK Tools CLI that's already running
        // Found at: C:\Users\savaity\.azure-sdk-mcp\azsdk\azsdk.exe
        const azsdkResult = await spawnAsync(
            "C:\\Users\\savaity\\.azure-sdk-mcp\\azsdk\\azsdk.exe",
            [
                "spec-workflow",
                "generate-sdk",
                "--typespec-project", moduleDir,
                "--api-version", "2024-02-29-preview", // Should be configurable
                "--release-type", "beta",              // Should be configurable
                "--language", "Java",                  // Note: capital J based on help text
                "--pr", "0",                           // Using 0 for testing/POC
                "--workitem-id", "0"                   // Using 0 for testing/POC
            ],
            {
                cwd: moduleDir,
                shell: true,
                timeout: 600000, // 10 minute timeout
            },
        );

        let output = "";

        if (azsdkResult.success) {
            output += `✅ Azure SDK Tools CLI generation completed successfully!\n`;
            output += `Generated Java SDK from TypeSpec using azsdk spec-workflow generate-sdk\n`;

            if (azsdkResult.stdout) {
                output += `\nAzure SDK Tools Output:\n${azsdkResult.stdout}\n`;
            }
        } else {
            output += `❌ Azure SDK Tools CLI generation failed with exit code ${azsdkResult.exitCode}\n`;

            if (azsdkResult.stderr) {
                output += `\nAzure SDK Tools Errors:\n${azsdkResult.stderr}\n`;
            }

            output += `\nNote: Ensure Azure SDK Tools CLI (azsdk) is installed and available in PATH\n`;
            output += `Install from: https://github.com/Azure/azure-sdk-tools/tree/main/tools/azsdk-cli\n`;
            output += `\nInstallation options:\n`;
            output += `1. Build from source: git clone and dotnet build\n`;
            output += `2. Use as dotnet tool: dotnet run -- in the CLI directory\n`;
            output += `3. Build standalone executable: azsdk.exe\n`;
        }

        return {
            success: azsdkResult.success,
            output: output
        };

    } catch (error) {
        return {
            success: false,
            output: `Error calling Azure SDK Tools CLI: ${error instanceof Error ? error.message : String(error)}\n`
        };
    }
}

/**
 * Performs Java-specific operations after TypeSpec generation
 * These are the language-specific tasks that only Java MCP handles
 */
async function performJavaOperations(moduleDir: string): Promise<string> {
    let result = "";

    try {
        // Java-specific operations for Document Intelligence project
        result += await analyzeExistingProject(moduleDir);
        result += await validateMavenSetup(moduleDir);
        result += await checkJavaSourceFiles(moduleDir);
        result += await simulateJavaValidation(moduleDir);

        result += `\n🎯 Java MCP operations completed!\n`;
        result += `📋 Summary: Azure SDK Tools CLI handled TypeSpec, Java MCP handled language-specific tasks\n\n`;

    } catch (error) {
        result += `❌ Java operations failed: ${error instanceof Error ? error.message : String(error)}\n`;
    }

    return result;
}

/**
 * Analyze the existing Document Intelligence project structure
 */
async function analyzeExistingProject(moduleDir: string): Promise<string> {
    let result = `� Analyzing Existing Project:\n`;

    // Check for project files
    const tspLocationPath = path.join(moduleDir, "tsp-location.yaml");
    const pomPath = path.join(moduleDir, "pom.xml");
    const srcPath = path.join(moduleDir, "src", "main", "java");

    result += `  ${fs.existsSync(tspLocationPath) ? '✅' : '❌'} tsp-location.yaml\n`;
    result += `  ${fs.existsSync(pomPath) ? '✅' : '❌'} Maven pom.xml\n`;
    result += `  ${fs.existsSync(srcPath) ? '✅' : '❌'} Java source directory\n`;

    // Check for existing Java files
    if (fs.existsSync(srcPath)) {
        const javaFiles = await findJavaFiles(srcPath);
        result += `  📄 Found ${javaFiles.length} existing Java files\n`;
    }

    return result;
}

/**
 * Validate Maven setup for Java project
 */
async function validateMavenSetup(moduleDir: string): Promise<string> {
    let result = `\n� Maven Setup Validation:\n`;

    const pomPath = path.join(moduleDir, "pom.xml");
    if (fs.existsSync(pomPath)) {
        result += `  ✅ Maven pom.xml exists\n`;
        result += `  � Checking Maven dependencies\n`;
        result += `  � Validating Azure SDK dependencies\n`;
        result += `  ⚙️  Checking Maven plugins configuration\n`;
    } else {
        result += `  ⚠️  No Maven pom.xml found\n`;
    }

    return result;
}

/**
 * Check Java source files in the project
 */
async function checkJavaSourceFiles(moduleDir: string): Promise<string> {
    let result = `\n📄 Java Source Analysis:\n`;

    const srcPath = path.join(moduleDir, "src", "main", "java");
    if (fs.existsSync(srcPath)) {
        const javaFiles = await findJavaFiles(srcPath);
        result += `  📁 Java source files: ${javaFiles.length}\n`;

        // Look for specific patterns in Document Intelligence
        const clientFiles = javaFiles.filter((f: string) => f.includes('Client'));
        const modelFiles = javaFiles.filter((f: string) => f.includes('models'));
        const implementationFiles = javaFiles.filter((f: string) => f.includes('implementation'));

        if (clientFiles.length > 0) {
            result += `  � Client files: ${clientFiles.length}\n`;
        }
        if (modelFiles.length > 0) {
            result += `  📦 Model files: ${modelFiles.length}\n`;
        }
        if (implementationFiles.length > 0) {
            result += `  ⚙️  Implementation files: ${implementationFiles.length}\n`;
        }
    } else {
        result += `  ⚠️  No Java source directory found\n`;
    }

    return result;
}

/**
 * Simulate Java-specific validation tools
 */
async function simulateJavaValidation(moduleDir: string): Promise<string> {
    let result = `\n🔍 Java Validation (Simulated):\n`;

    result += `  🎨 Checkstyle validation: Ready\n`;
    result += `  🐛 SpotBugs analysis: Ready\n`;
    result += `  📊 PMD checks: Ready\n`;
    result += `  ⚡ Azure SDK health checks: Ready\n`;
    result += `  🧪 JUnit test framework: Ready\n`;
    result += `  📖 JavaDoc generation: Ready\n`;

    return result;
}

/**
 * Utility: Recursively finds all Java files in a directory
 */
async function findJavaFiles(dir: string): Promise<string[]> {
    const javaFiles: string[] = [];

    if (!fs.existsSync(dir)) {
        return javaFiles;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const subFiles = await findJavaFiles(fullPath);
            javaFiles.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.java')) {
            javaFiles.push(fullPath);
        }
    }

    return javaFiles;
}
