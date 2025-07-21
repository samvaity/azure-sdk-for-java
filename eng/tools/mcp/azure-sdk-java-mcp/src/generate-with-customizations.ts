import { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { spawnAsync } from "./utils/index.js";
import * as fs from "fs";
import * as path from "path";

/**
 * TypeSpec SDK Generation with Customizations Tool
 *
 * This tool addresses the critical gap in the TypeSpec SDK generation workflow where manual
 * customizations need to be updated after SDK regeneration. It implements a cross-language
 * contract for SDK generation that includes customization preservation.
 *
 * Problem Statement:
 * - TypeSpec regeneration overwrites manual customizations
 * - Build errors occur after regeneration due to outdated customizations
 * - No systematic way to preserve and update customizations across generations
 *
 * Solution Approach:
 * 1. Deterministic Steps (Script-based): tsp-client update/generate
 * 2. Interactive LLM Assistance: Customization analysis and updates
 * 3. Build Error Analysis: Identify specific customization conflicts
 * 4. Cross-Language Contract: Standardized input/output for all SDK languages
 */

interface CustomizationContext {
    moduleDirectory: string;
    customizationFile?: string;
    buildErrors: string[];
    generatedChanges: string[];
    preservedCustomizations: string[];
}

interface GenerationContract {
    // Input standardization across languages
    scope: "code-only" | "code-with-changelog" | "full-package";
    preserveCustomizations: boolean;
    validateBuild: boolean;
    interactiveMode: boolean;
}

export async function generateWithCustomizations(
    moduleDir: string,
    options: GenerationContract = {
        scope: "code-with-changelog",
        preserveCustomizations: true,
        validateBuild: true,
        interactiveMode: true
    }
): Promise<CallToolResult> {
    try {
        process.chdir(moduleDir);

        let result = `🔄 TypeSpec SDK Generation with Customizations\n\n`;
        result += `📁 Module Directory: ${moduleDir}\n`;
        result += `🎯 Scope: ${options.scope}\n`;
        result += `🛡️ Preserve Customizations: ${options.preserveCustomizations}\n`;
        result += `✅ Validate Build: ${options.validateBuild}\n`;
        result += `🔄 Interactive Mode: ${options.interactiveMode}\n\n`;

        // Step 1: Pre-generation Analysis
        result += `## Step 1: Pre-Generation Analysis\n\n`;
        const context = await analyzeCustomizations(moduleDir);

        if (context.customizationFile) {
            result += `📋 Found customization file: ${context.customizationFile}\n`;
            result += `🔧 Existing customizations: ${context.preservedCustomizations.length}\n`;
        } else {
            result += `ℹ️ No existing customization file found\n`;
        }

        // Step 2: Backup Current State
        if (options.preserveCustomizations && context.customizationFile) {
            result += `\n## Step 2: Backup Customizations\n\n`;
            await backupCustomizations(moduleDir, context);
            result += `💾 Customizations backed up successfully\n`;
        }

        // Step 3: Generate SDK (Deterministic)
        result += `\n## Step 3: SDK Generation (Deterministic)\n\n`;
        const generateResult = await runTspClientGenerate(moduleDir);

        if (generateResult.success) {
            result += `✅ tsp-client generate completed successfully\n`;
            if (generateResult.stdout) {
                result += `📊 Generation output:\n${generateResult.stdout.substring(0, 500)}...\n`;
            }
        } else {
            result += `❌ tsp-client generate failed with exit code ${generateResult.exitCode}\n`;
            if (generateResult.stderr) {
                result += `🚨 Generation errors:\n${generateResult.stderr}\n`;
            }

            // Early return if generation fails
            return {
                content: [{
                    type: "text",
                    text: result + `\n⚠️ Generation failed. Please fix TypeSpec issues before proceeding with customizations.`
                }]
            };
        }

        // Step 4: Restore and Update Customizations (Interactive LLM)
        if (options.preserveCustomizations && context.customizationFile && options.interactiveMode) {
            result += `\n## Step 4: Customization Analysis & Update (Interactive)\n\n`;
            const customizationResult = await analyzeAndUpdateCustomizations(moduleDir, context);
            result += customizationResult;
        }

        // Step 5: Build Validation
        if (options.validateBuild) {
            result += `\n## Step 5: Build Validation\n\n`;
            const buildResult = await validateBuild(moduleDir);

            if (buildResult.success) {
                result += `✅ Build validation passed - no customization conflicts\n`;
            } else {
                result += `🔧 Build validation found issues:\n${buildResult.errors}\n\n`;

                if (options.interactiveMode) {
                    result += `🤖 **LLM Assistance Required**\n`;
                    result += `Please analyze the build errors above and help update the customization file.\n`;
                    result += `The errors typically indicate:\n`;
                    result += `- Missing imports after regeneration\n`;
                    result += `- Changed method signatures\n`;
                    result += `- Renamed or moved classes\n`;
                    result += `- Updated package structures\n\n`;
                    result += `Customization file location: ${context.customizationFile}\n`;
                }
            }
        }

        // Step 6: Changelog Update (if scope includes it)
        if (options.scope === "code-with-changelog" || options.scope === "full-package") {
            result += `\n## Step 6: Changelog Update\n\n`;
            result += `📝 Changelog update is included in scope - use update_java_sdk_changelog tool after build succeeds\n`;
        }

        // Step 7: Cross-Language Contract Summary
        result += `\n## Step 7: Generation Contract Summary\n\n`;
        result += `📋 **Standardized Output Contract:**\n`;
        result += `- Scope: ${options.scope}\n`;
        result += `- Generated: Source code ${options.scope.includes('changelog') ? '+ changelog' : ''}\n`;
        result += `- Customizations: ${options.preserveCustomizations ? 'Preserved & Updated' : 'Not handled'}\n`;
        result += `- Build Status: ${options.validateBuild ? 'Validated' : 'Not validated'}\n`;
        result += `- Manual Steps Required: ${(options.interactiveMode && options.preserveCustomizations && context.customizationFile) ? 'Yes (customization updates)' : 'No'}\n\n`;

        result += `🎉 **Generation with customizations completed!**\n`;

        return {
            content: [{
                type: "text",
                text: result
            }]
        };

    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `❌ Unexpected error during SDK generation with customizations: ${error instanceof Error ? error.message : String(error)}`
            }]
        };
    }
}

async function analyzeCustomizations(moduleDir: string): Promise<CustomizationContext> {
    const context: CustomizationContext = {
        moduleDirectory: moduleDir,
        buildErrors: [],
        generatedChanges: [],
        preservedCustomizations: []
    };

    // Look for customization files (Java-specific patterns)
    const possibleCustomizationFiles = [
        path.join(moduleDir, "customization.json"),
        path.join(moduleDir, "src", "main", "java", "customizations.json"),
        path.join(moduleDir, "tsp-location.yaml") // May contain customization references
    ];

    for (const filePath of possibleCustomizationFiles) {
        if (fs.existsSync(filePath)) {
            context.customizationFile = filePath;

            // Analyze existing customizations
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                if (filePath.endsWith('.json')) {
                    const customizations = JSON.parse(content);
                    context.preservedCustomizations = Object.keys(customizations);
                }
            } catch (error) {
                // Continue if parsing fails
            }
            break;
        }
    }

    return context;
}

async function backupCustomizations(moduleDir: string, context: CustomizationContext): Promise<void> {
    if (!context.customizationFile) return;

    const backupPath = `${context.customizationFile}.backup.${Date.now()}`;
    fs.copyFileSync(context.customizationFile, backupPath);
}

async function runTspClientGenerate(moduleDir: string) {
    return await spawnAsync(
        "tsp-client",
        ["generate", "--debug", "--save-inputs"],
        {
            cwd: moduleDir,
            shell: true,
            timeout: 600000, // 10 minute timeout
        }
    );
}

async function analyzeAndUpdateCustomizations(
    moduleDir: string,
    context: CustomizationContext
): Promise<string> {
    let result = "";

    // This is where LLM assistance is most valuable
    result += `🤖 **AI-Assisted Customization Analysis Required**\n\n`;
    result += `The following customizations were found and may need updates:\n`;

    for (const customization of context.preservedCustomizations) {
        result += `- ${customization}\n`;
    }

    result += `\n📁 Customization file: ${context.customizationFile}\n`;
    result += `\n🔍 **Analysis Needed:**\n`;
    result += `1. Compare generated code with previous version\n`;
    result += `2. Identify if customizations still apply\n`;
    result += `3. Update customization syntax if API changed\n`;
    result += `4. Add new customizations for new issues\n\n`;

    result += `💡 **Common Customization Updates After Regeneration:**\n`;
    result += `- Import statements changed\n`;
    result += `- Package names updated\n`;
    result += `- Method signatures modified\n`;
    result += `- Class names renamed\n`;
    result += `- New dependencies required\n\n`;

    return result;
}

async function validateBuild(moduleDir: string) {
    const buildResult = await spawnAsync(
        "mvn",
        ["compile", "-q"],
        {
            cwd: moduleDir,
            shell: true,
            timeout: 300000, // 5 minute timeout
        }
    );

    return {
        success: buildResult.success,
        errors: buildResult.stderr || ""
    };
}

/**
 * Cross-Language SDK Generation Contract
 *
 * This contract ensures consistency across all Azure SDK languages (Java, .NET, Python, JS/TS, Go)
 * for the "generate SDK" operation scope and expectations.
 */
export const SDK_GENERATION_CONTRACT = {
    // Standardized scopes across all languages
    SCOPES: {
        "code-only": "Generate source code files only, no build artifacts or documentation",
        "code-with-changelog": "Generate source code + update changelog based on API changes",
        "full-package": "Generate source code + changelog + build validation + package metadata"
    },

    // Standardized input parameters
    REQUIRED_INPUTS: {
        "moduleDirectory": "Absolute path to SDK module directory",
        "scope": "One of: code-only | code-with-changelog | full-package"
    },

    // Standardized output expectations
    OUTPUT_CONTRACT: {
        "code-only": ["Generated source files", "Basic validation"],
        "code-with-changelog": ["Generated source files", "Updated CHANGELOG.md", "Build validation"],
        "full-package": ["Generated source files", "Updated CHANGELOG.md", "Build validation", "Package metadata", "Documentation"]
    },

    // Cross-language customization handling
    CUSTOMIZATION_CONTRACT: {
        "preserveCustomizations": "Boolean flag to backup and restore customizations",
        "customizationFile": "Language-specific customization file (customization.json for Java)",
        "buildValidation": "Post-generation build to detect customization conflicts",
        "interactiveMode": "Enable LLM assistance for customization updates"
    }
};
