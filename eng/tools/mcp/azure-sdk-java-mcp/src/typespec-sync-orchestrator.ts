/**
 * MCP Tool: Code Synchronizer for TypeSpec Updates
 * This tool orchestrates the process of updating customizations when TypeSpec changes
 * cause compilation errors in generated Azure SDK code.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { parseCompilationErrors, CompilationAnalysis } from './compilation-issue-detector';

export interface SyncOptions {
    projectPath: string;
    tspConfigPath?: string;
    customizationPath?: string;
    dryRun?: boolean;
}

export interface SyncResult {
    success: boolean;
    changesApplied: CodeChange[];
    remainingErrors: string[];
    summary: string;
}

export interface CodeChange {
    filePath: string;
    description: string;
    oldCode: string;
    newCode: string;
    applied: boolean;
}

/**
 * Main orchestration function that handles the multi-stage TypeSpec sync process
 */
export async function synchronizeCodeWithTypeSpec(options: SyncOptions): Promise<SyncResult> {
    const { projectPath, dryRun = false } = options;

    console.log(`🔄 Starting TypeSpec synchronization for: ${projectPath}`);

    const result: SyncResult = {
        success: false,
        changesApplied: [],
        remainingErrors: [],
        summary: ''
    };

    try {
        // Stage 1: Check current compilation status
        console.log('📋 Stage 1: Analyzing current compilation status...');
        const initialAnalysis = await runCompilationAnalysis(projectPath);

        if (initialAnalysis.errors.length === 0) {
            result.success = true;
            result.summary = 'No compilation errors found. Code is already in sync.';
            return result;
        }

        console.log(`Found ${initialAnalysis.errors.length} compilation errors in ${initialAnalysis.affectedFiles.length} files`);

        // Stage 2: Identify and apply fixes
        console.log('🔧 Stage 2: Applying automated fixes...');
        const changes = await applyAutomatedFixes(initialAnalysis, dryRun);
        result.changesApplied = changes;

        // Stage 3: Verify fixes by recompiling
        if (!dryRun && changes.length > 0) {
            console.log('✅ Stage 3: Verifying fixes...');
            const verificationAnalysis = await runCompilationAnalysis(projectPath);

            if (verificationAnalysis.errors.length === 0) {
                result.success = true;
                result.summary = `Successfully applied ${changes.length} fixes. All compilation errors resolved.`;
            } else {
                result.remainingErrors = verificationAnalysis.errors.map(e => e.message);
                result.summary = `Applied ${changes.length} fixes, but ${verificationAnalysis.errors.length} errors remain.`;
            }
        } else {
            result.summary = dryRun
                ? `Dry run completed. Would apply ${changes.length} fixes.`
                : 'No fixes were applicable.';
        }

        // Stage 4: Generate manual fix suggestions for remaining errors
        if (result.remainingErrors.length > 0) {
            console.log('📝 Stage 4: Generating manual fix suggestions...');
            const suggestions = generateManualFixSuggestions(result.remainingErrors);
            result.summary += `\n\nManual fixes required:\n${suggestions.join('\n')}`;
        }

    } catch (error) {
        result.summary = `Synchronization failed: ${error instanceof Error ? error.message : String(error)}`;
    }

    return result;
}

/**
 * Runs Maven compilation and analyzes the output
 */
async function runCompilationAnalysis(projectPath: string): Promise<CompilationAnalysis> {
    try {
        console.log('🔨 Running Maven compilation...');
        execSync('mvn clean compile', {
            cwd: projectPath,
            stdio: 'pipe'
        });

        // If compilation succeeds, no errors
        return {
            errors: [],
            affectedFiles: [],
            potentialFixes: []
        };

    } catch (error: any) {
        // Maven failed, parse the error output
        const output = error.stdout?.toString() || error.stderr?.toString() || '';
        return parseCompilationErrors(output);
    }
}

/**
 * Applies automated fixes based on compilation analysis
 */
async function applyAutomatedFixes(analysis: CompilationAnalysis, dryRun: boolean): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    for (const fix of analysis.potentialFixes) {
        if (fix.confidence > 0.8) {
            console.log(`🔄 Applying fix: ${fix.description}`);

            try {
                const change = await applyCodeFix(fix, dryRun);
                changes.push(change);
            } catch (error) {
                console.error(`❌ Failed to apply fix: ${error instanceof Error ? error.message : String(error)}`);
                changes.push({
                    filePath: fix.filePath,
                    description: fix.description,
                    oldCode: fix.oldValue,
                    newCode: fix.newValue,
                    applied: false
                });
            }
        }
    }

    return changes;
}

/**
 * Applies a specific code fix to a file
 */
async function applyCodeFix(fix: any, dryRun: boolean): Promise<CodeChange> {
    const filePath = fix.filePath;

    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(new RegExp(escapeRegExp(fix.oldValue), 'g'), fix.newValue);

    const change: CodeChange = {
        filePath,
        description: fix.description,
        oldCode: fix.oldValue,
        newCode: fix.newValue,
        applied: false
    };

    if (content !== newContent) {
        if (!dryRun) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            change.applied = true;
            console.log(`✅ Updated: ${path.basename(filePath)}`);
        } else {
            console.log(`🔍 Would update: ${path.basename(filePath)}`);
        }
    } else {
        console.log(`⚠️  No changes needed in: ${path.basename(filePath)}`);
    }

    return change;
}

/**
 * Generates manual fix suggestions for errors that couldn't be automatically resolved
 */
function generateManualFixSuggestions(errors: string[]): string[] {
    const suggestions: string[] = [];

    for (const error of errors) {
        if (error.includes('cannot find symbol')) {
            suggestions.push(`• Review symbol names in generated code and update customizations accordingly`);
        } else if (error.includes('method does not override')) {
            suggestions.push(`• Check method signatures in parent classes/interfaces for changes`);
        } else {
            suggestions.push(`• Manual review required for: ${error}`);
        }
    }

    return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Utility function to escape special regex characters
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * MCP Tool: Environment preparation for TypeSpec sync
 */
export async function prepareEnvironment(projectPath: string): Promise<{success: boolean, message: string}> {
    try {
        console.log('🏗️  Preparing environment for TypeSpec synchronization...');

        // Check if Maven is available
        execSync('mvn --version', { stdio: 'pipe' });

        // Check if tsp-client is available
        try {
            execSync('tsp-client --version', { stdio: 'pipe' });
        } catch {
            return {
                success: false,
                message: 'tsp-client not found. Please install TypeSpec client tools.'
            };
        }

        // Verify project structure
        const pomPath = path.join(projectPath, 'pom.xml');
        if (!fs.existsSync(pomPath)) {
            return {
                success: false,
                message: 'Maven pom.xml not found in project directory.'
            };
        }

        return {
            success: true,
            message: 'Environment ready for TypeSpec synchronization.'
        };

    } catch (error) {
        return {
            success: false,
            message: `Environment preparation failed: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * MCP Tool: Updates TypeSpec client code
 */
export async function updateTypeSpecClient(projectPath: string): Promise<{success: boolean, message: string}> {
    try {
        console.log('📦 Updating TypeSpec client code...');

        execSync('tsp-client update', {
            cwd: projectPath,
            stdio: 'pipe'
        });

        return {
            success: true,
            message: 'TypeSpec client code updated successfully.'
        };

    } catch (error) {
        return {
            success: false,
            message: `TypeSpec client update failed: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}
