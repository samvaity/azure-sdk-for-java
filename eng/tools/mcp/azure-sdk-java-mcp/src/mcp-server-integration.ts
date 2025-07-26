/**
 * MCP Server Integration for TypeSpec Synchronization Tools
 * Exposes the TypeSpec sync tools as MCP functions for use in Copilot
 */

import { 
    syncTypeSpecChanges, 
    analyzeCompilationIssues, 
    getEnvironmentSetupCookbook,
    getFixSuggestions 
} from './typespec-sync-mcp-tools';

/**
 * @tool
 * Orchestrate TypeSpec synchronization workflow to fix compilation issues after TypeSpec updates.
 * This tool handles the complete multi-stage process of updating customizations when generated 
 * code changes due to TypeSpec repository updates.
 * 
 * Usage: When users report compilation errors after updating TypeSpec references or running tsp-client update
 */
export async function synchronizeTypeSpecCustomizations(
    projectPath: string,
    options?: {
        dryRun?: boolean;
        updateTypeSpec?: boolean;
        autoFix?: boolean;
    }
): Promise<string> {
    const { dryRun = false, updateTypeSpec = true, autoFix = true } = options || {};
    
    console.log(`🔄 Starting TypeSpec customization sync for: ${projectPath}`);
    
    return await syncTypeSpecChanges(projectPath, {
        dryRun,
        updateTypeSpec,
        autoFix
    });
}

/**
 * @tool  
 * Analyze compilation issues without making changes to provide detailed diagnostics.
 * Use this tool when users want to understand what compilation errors exist and 
 * what fixes would be applied before making actual changes.
 */
export async function analyzeTypeSpecCompilationIssues(projectPath: string): Promise<string> {
    console.log(`🔍 Analyzing compilation issues in: ${projectPath}`);
    
    return await analyzeCompilationIssues(projectPath);
}

/**
 * @tool
 * Get comprehensive setup instructions for TypeSpec development environment.
 * Returns a step-by-step cookbook for installing and configuring all required tools
 * for TypeSpec-based Azure SDK development.
 */
export function getTypeSpecEnvironmentSetupGuide(): string {
    console.log('📋 Providing TypeSpec environment setup cookbook');
    
    return getEnvironmentSetupCookbook();
}

/**
 * @tool
 * Get intelligent fix suggestions for specific compilation error patterns.
 * Provides both automated and manual fix approaches based on error analysis.
 */
export function getCompilationFixSuggestions(
    errorType: string, 
    errorDetails: string
): string {
    console.log(`💡 Generating fix suggestions for error type: ${errorType}`);
    
    return getFixSuggestions(errorType, errorDetails);
}

/**
 * @tool
 * Validate environment readiness for TypeSpec synchronization operations.
 * Checks for required tools (Maven, TypeSpec CLI, Java) and project structure.
 */
export async function validateTypeSpecEnvironment(projectPath: string): Promise<string> {
    console.log(`🏗️  Validating TypeSpec environment for: ${projectPath}`);
    
    const { prepareEnvironment } = await import('./typespec-sync-orchestrator');
    
    try {
        const result = await prepareEnvironment(projectPath);
        
        if (result.success) {
            return `✅ Environment validation successful: ${result.message}`;
        } else {
            return `❌ Environment validation failed: ${result.message}`;
        }
    } catch (error) {
        return `❌ Environment validation error: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/**
 * @tool
 * Update TypeSpec client code by running tsp-client update in the project directory.
 * This regenerates Java code based on the current TypeSpec configuration.
 */
export async function updateTypeSpecClientCode(projectPath: string): Promise<string> {
    console.log(`📦 Updating TypeSpec client code in: ${projectPath}`);
    
    const { updateTypeSpecClient } = await import('./typespec-sync-orchestrator');
    
    try {
        const result = await updateTypeSpecClient(projectPath);
        
        if (result.success) {
            return `✅ TypeSpec client update successful: ${result.message}`;
        } else {
            return `❌ TypeSpec client update failed: ${result.message}`;
        }
    } catch (error) {
        return `❌ TypeSpec client update error: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/**
 * @tool
 * Comprehensive workflow that combines TypeSpec update, compilation analysis, and fix application.
 * This is the main orchestration tool that handles the complete synchronization process.
 */
export async function executeCompleteTypeSpecSyncWorkflow(
    projectPath: string,
    tspCommitSha?: string
): Promise<string> {
    console.log(`🚀 Executing complete TypeSpec sync workflow for: ${projectPath}`);
    if (tspCommitSha) {
        console.log(`🔗 Target TypeSpec commit: ${tspCommitSha}`);
    }
    
    const steps: string[] = [];
    
    try {
        // Step 1: Environment validation
        steps.push('🏗️  Step 1: Environment Validation');
        const envResult = await validateTypeSpecEnvironment(projectPath);
        steps.push(envResult);
        
        if (envResult.includes('❌')) {
            return steps.join('\n') + '\n\n❌ Workflow stopped due to environment issues.';
        }
        
        // Step 2: Update TypeSpec client if commit SHA provided
        if (tspCommitSha) {
            steps.push('\n📝 Step 2: TypeSpec Configuration Update');
            steps.push(`   Updating tsp-location.yaml to commit: ${tspCommitSha}`);
            // Note: In real implementation, would update tsp-location.yaml file
            steps.push('   ⚠️  Manual update required: Edit tsp-location.yaml with new commit SHA');
        }
        
        // Step 3: TypeSpec client update
        steps.push('\n📦 Step 3: TypeSpec Client Code Update');
        const updateResult = await updateTypeSpecClientCode(projectPath);
        steps.push(updateResult);
        
        // Step 4: Compilation analysis and fixes
        steps.push('\n🔧 Step 4: Compilation Analysis and Fixes');
        const syncResult = await synchronizeTypeSpecCustomizations(projectPath, {
            dryRun: false,
            updateTypeSpec: false, // Already updated above
            autoFix: true
        });
        steps.push(syncResult);
        
        // Step 5: Final validation
        steps.push('\n✅ Step 5: Final Validation');
        const finalAnalysis = await analyzeTypeSpecCompilationIssues(projectPath);
        steps.push(finalAnalysis);
        
        steps.push('\n🎉 Complete TypeSpec synchronization workflow finished!');
        
        return steps.join('\n');
        
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        steps.push(`❌ Workflow failed: ${errorMsg}`);
        return steps.join('\n');
    }
}

// Export all tools for MCP server registration
export const mcpTools = {
    synchronizeTypeSpecCustomizations,
    analyzeTypeSpecCompilationIssues,
    getTypeSpecEnvironmentSetupGuide,
    getCompilationFixSuggestions,
    validateTypeSpecEnvironment,
    updateTypeSpecClientCode,
    executeCompleteTypeSpecSyncWorkflow
};

// Tool metadata for MCP server
export const toolMetadata = {
    synchronizeTypeSpecCustomizations: {
        description: "Orchestrate TypeSpec synchronization workflow to fix compilation issues after TypeSpec updates",
        parameters: {
            projectPath: { type: "string", description: "Absolute path to the Azure SDK project directory" },
            options: { 
                type: "object", 
                properties: {
                    dryRun: { type: "boolean", description: "Preview changes without applying them" },
                    updateTypeSpec: { type: "boolean", description: "Whether to run tsp-client update" },
                    autoFix: { type: "boolean", description: "Automatically apply high-confidence fixes" }
                }
            }
        }
    },
    analyzeTypeSpecCompilationIssues: {
        description: "Analyze compilation issues without making changes to provide detailed diagnostics",
        parameters: {
            projectPath: { type: "string", description: "Absolute path to the Azure SDK project directory" }
        }
    },
    getTypeSpecEnvironmentSetupGuide: {
        description: "Get comprehensive setup instructions for TypeSpec development environment",
        parameters: {}
    },
    executeCompleteTypeSpecSyncWorkflow: {
        description: "Execute the complete TypeSpec synchronization workflow including all stages",
        parameters: {
            projectPath: { type: "string", description: "Absolute path to the Azure SDK project directory" },
            tspCommitSha: { type: "string", description: "Optional TypeSpec commit SHA to update to" }
        }
    }
};
