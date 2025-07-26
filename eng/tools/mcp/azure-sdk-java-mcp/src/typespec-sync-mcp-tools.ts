/**
 * MCP Tool Implementation: TypeSpec Synchronization Cookbook
 * This tool orchestrates the complete flow of updating customizations 
 * when TypeSpec changes cause compilation errors.
 */

import { synchronizeCodeWithTypeSpec, prepareEnvironment, updateTypeSpecClient } from './typespec-sync-orchestrator';

/**
 * MCP Tool: Complete TypeSpec sync workflow
 * Orchestrates multi-stage operations to resolve compilation issues after TypeSpec updates
 */
export async function syncTypeSpecChanges(projectPath: string, options: {
    dryRun?: boolean;
    autoFix?: boolean;
    updateTypeSpec?: boolean;
} = {}): Promise<string> {
    
    const { dryRun = false, autoFix = true, updateTypeSpec = true } = options;
    
    console.log('🚀 Starting TypeSpec Synchronization Workflow');
    console.log(`📁 Project: ${projectPath}`);
    console.log(`🔧 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    
    const steps: string[] = [];
    
    try {
        // Step 1: Environment Check
        steps.push('🏗️  Step 1: Environment Preparation');
        const envCheck = await prepareEnvironment(projectPath);
        if (!envCheck.success) {
            return `❌ Environment check failed: ${envCheck.message}`;
        }
        steps.push(`✅ ${envCheck.message}`);
        
        // Step 2: Update TypeSpec Client (if requested)
        if (updateTypeSpec) {
            steps.push('📦 Step 2: Updating TypeSpec Client Code');
            const tspUpdate = await updateTypeSpecClient(projectPath);
            if (!tspUpdate.success) {
                steps.push(`⚠️  TypeSpec update failed: ${tspUpdate.message}`);
            } else {
                steps.push(`✅ ${tspUpdate.message}`);
            }
        }
        
        // Step 3: Synchronize Code
        steps.push('🔄 Step 3: Analyzing and Fixing Compilation Issues');
        const syncResult = await synchronizeCodeWithTypeSpec({
            projectPath,
            dryRun
        });
        
        steps.push(`📊 Analysis Complete:`);
        steps.push(`   • Changes Applied: ${syncResult.changesApplied.length}`);
        steps.push(`   • Remaining Errors: ${syncResult.remainingErrors.length}`);
        steps.push(`   • Status: ${syncResult.success ? '✅ SUCCESS' : '⚠️  PARTIAL'}`);
        
        // Step 4: Detailed Results
        if (syncResult.changesApplied.length > 0) {
            steps.push('');
            steps.push('📝 Applied Changes:');
            for (const change of syncResult.changesApplied) {
                const status = change.applied ? '✅' : '❌';
                steps.push(`   ${status} ${change.description}`);
                steps.push(`       File: ${change.filePath.split('/').pop()}`);
                steps.push(`       Changed: "${change.oldCode}" → "${change.newCode}"`);
            }
        }
        
        steps.push('');
        steps.push(`📋 Summary: ${syncResult.summary}`);
        
        // Step 5: Next Steps Guidance
        if (!syncResult.success && syncResult.remainingErrors.length > 0) {
            steps.push('');
            steps.push('🔧 Manual Review Required:');
            steps.push('   The following issues require manual attention:');
            for (const error of syncResult.remainingErrors.slice(0, 5)) {
                steps.push(`   • ${error}`);
            }
            if (syncResult.remainingErrors.length > 5) {
                steps.push(`   • ... and ${syncResult.remainingErrors.length - 5} more errors`);
            }
        }
        
        return steps.join('\n');
        
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        steps.push(`❌ Workflow failed: ${errorMsg}`);
        return steps.join('\n');
    }
}

/**
 * MCP Tool: Quick compilation error analysis
 * Provides fast feedback on compilation issues without making changes
 */
export async function analyzeCompilationIssues(projectPath: string): Promise<string> {
    console.log('🔍 Analyzing compilation issues...');
    
    try {
        const syncResult = await synchronizeCodeWithTypeSpec({
            projectPath,
            dryRun: true  // Always dry run for analysis
        });
        
        const report: string[] = [];
        report.push('📊 Compilation Analysis Report');
        report.push('================================');
        report.push('');
        
        if (syncResult.changesApplied.length === 0) {
            report.push('✅ No compilation errors detected or no fixable issues found.');
        } else {
            report.push(`🔧 Found ${syncResult.changesApplied.length} potential fixes:`);
            report.push('');
            
            for (let i = 0; i < syncResult.changesApplied.length; i++) {
                const change = syncResult.changesApplied[i];
                report.push(`${i + 1}. ${change.description}`);
                report.push(`   File: ${change.filePath.split('/').pop()}`);
                report.push(`   Fix: "${change.oldCode}" → "${change.newCode}"`);
                report.push('');
            }
        }
        
        if (syncResult.remainingErrors.length > 0) {
            report.push(`⚠️  ${syncResult.remainingErrors.length} issues require manual review.`);
        }
        
        report.push('💡 Run with autoFix=true to apply these changes automatically.');
        
        return report.join('\n');
        
    } catch (error) {
        return `❌ Analysis failed: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/**
 * MCP Tool: Environment validation cookbook
 * Returns step-by-step instructions for setting up the development environment
 */
export function getEnvironmentSetupCookbook(): string {
    return `
🏗️  TypeSpec Development Environment Setup Cookbook

Prerequisites Checklist:
========================

1. ☐ Java Development Kit (JDK 11 or higher)
   Installation: Download from https://adoptium.net/
   Verify: java --version

2. ☐ Apache Maven (3.6.0 or higher)
   Installation: Download from https://maven.apache.org/download.cgi
   Verify: mvn --version

3. ☐ TypeSpec Client Tools
   Installation: npm install -g @azure-tools/typespec-client-generator-cli
   Verify: tsp-client --version

4. ☐ Node.js (LTS version)
   Installation: Download from https://nodejs.org/
   Verify: node --version

Setup Workflow:
===============

1. Clone the Azure SDK for Java repository
2. Navigate to your service directory (e.g., sdk/documentintelligence/azure-ai-documentintelligence)
3. Check tsp-location.yaml for TypeSpec configuration
4. Run initial compilation to establish baseline: mvn clean compile
5. Update TypeSpec reference if needed: edit tsp-location.yaml
6. Update generated code: tsp-client update
7. Fix customization issues: Use this MCP tool

Common Issues and Solutions:
============================

Issue: "tsp-client command not found"
Solution: Install TypeSpec CLI globally: npm install -g @azure-tools/typespec-client-generator-cli

Issue: "Maven not found"
Solution: Add Maven bin directory to your system PATH

Issue: "Java compilation errors after TypeSpec update"
Solution: Use the syncTypeSpecChanges MCP tool to automatically fix parameter name mismatches

Issue: "Permission denied during file updates"
Solution: Ensure you have write permissions to the project directory

Troubleshooting:
================

1. Always run 'mvn clean compile' first to identify issues
2. Check that tsp-location.yaml points to the correct commit
3. Verify generated code matches expected TypeSpec output
4. Review customization files for parameter name conflicts
5. Use dry-run mode first to preview changes before applying

For more help: https://github.com/Azure/azure-sdk-for-java/wiki/TypeSpec-Java-QuickStart
`;
}

/**
 * MCP Tool: Fix suggestions based on common patterns
 * Provides intelligent suggestions for manual fixes based on error patterns
 */
export function getFixSuggestions(errorType: string, errorDetails: string): string {
    const suggestions: string[] = [];
    
    suggestions.push(`🔧 Fix Suggestions for: ${errorType}`);
    suggestions.push('================================');
    suggestions.push('');
    
    if (errorDetails.includes('analyzeDocumentOptions')) {
        suggestions.push('🎯 Parameter Name Mismatch Detected');
        suggestions.push('');
        suggestions.push('Problem: Generated code parameter names changed from "analyzeDocumentOptions" to "analyzeDocumentRequest"');
        suggestions.push('');
        suggestions.push('Automatic Fix Available:');
        suggestions.push('• Use syncTypeSpecChanges() MCP tool with autoFix=true');
        suggestions.push('');
        suggestions.push('Manual Fix:');
        suggestions.push('1. Open the affected Java files');
        suggestions.push('2. Find all references to "analyzeDocumentOptions"');
        suggestions.push('3. Replace with "analyzeDocumentRequest"');
        suggestions.push('4. Ensure parameter types match method signatures');
        suggestions.push('');
        suggestions.push('OpenRewrite Rule (for batch processing):');
        suggestions.push('```java');
        suggestions.push('// Create a recipe to replace parameter references');
        suggestions.push('@Override');
        suggestions.push('public TreeVisitor<?, ExecutionContext> getVisitor() {');
        suggestions.push('    return new JavaIsoVisitor<ExecutionContext>() {');
        suggestions.push('        @Override');
        suggestions.push('        public J.Identifier visitIdentifier(J.Identifier identifier, ExecutionContext ctx) {');
        suggestions.push('            if ("analyzeDocumentOptions".equals(identifier.getSimpleName())) {');
        suggestions.push('                return identifier.withSimpleName("analyzeDocumentRequest");');
        suggestions.push('            }');
        suggestions.push('            return super.visitIdentifier(identifier, ctx);');
        suggestions.push('        }');
        suggestions.push('    };');
        suggestions.push('}');
        suggestions.push('```');
    } else if (errorDetails.includes('cannot find symbol')) {
        suggestions.push('🎯 Symbol Not Found Error');
        suggestions.push('');
        suggestions.push('Common Causes:');
        suggestions.push('• Parameter name changes in generated code');
        suggestions.push('• Method signature changes');
        suggestions.push('• Import statement changes');
        suggestions.push('• Class or package renames');
        suggestions.push('');
        suggestions.push('Investigation Steps:');
        suggestions.push('1. Check recent TypeSpec changes in azure-rest-api-specs');
        suggestions.push('2. Compare generated code before/after update');
        suggestions.push('3. Review customization files for outdated references');
        suggestions.push('4. Update imports and parameter names accordingly');
    } else {
        suggestions.push('🎯 General Compilation Error');
        suggestions.push('');
        suggestions.push('Recommended Approach:');
        suggestions.push('1. Run analyzeCompilationIssues() for detailed analysis');
        suggestions.push('2. Compare with known patterns in fix database');
        suggestions.push('3. Apply automated fixes where confidence is high');
        suggestions.push('4. Generate OpenRewrite rules for complex transformations');
    }
    
    return suggestions.join('\n');
}
