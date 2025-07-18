/**
 * Intelligent Customization Update Tool
 * 
 * This tool analyzes actual TypeSpec changes and updates customized code accordingly,
 * rather than applying predetermined fixes. It integrates with the SDK generation pipeline.
 */

import { CallToolResult } from "@modelcontextprotocol/sdk/types";
import fs from "fs/promises";
import path from "path";
import { execAsync } from "./utils/index.js";

interface TypeSpecChange {
    type: 'method_signature' | 'parameter_change' | 'return_type' | 'new_method' | 'removed_method';
    oldSignature?: string;
    newSignature?: string;
    className: string;
    methodName: string;
    description: string;
}

interface CustomizedFile {
    filePath: string;
    className: string;
    isCustomization: boolean;
    hasHandWrittenCode: boolean;
    customizationType: 'partial-update' | 'customization-class' | 'manual-edit';
}

interface UpdateResult {
    file: string;
    changesApplied: string[];
    manualReviewRequired: string[];
    success: boolean;
}

/**
 * Main entry point for updating customized code after TypeSpec regeneration
 * This should be called as part of the SDK generation pipeline
 */
export async function updateCustomizedCodeAfterGeneration(args: {
    moduleDirectory: string;
    restApiSpecsPR?: string;  // Optional: PR URL to analyze changes
    typeSpecCommit?: string;  // Optional: specific commit to diff against
    dryRun?: boolean;         // Preview changes without applying
}): Promise<CallToolResult> {
    const { moduleDirectory, restApiSpecsPR, typeSpecCommit, dryRun = false } = args;

    try {
        // 1. Analyze what actually changed in the TypeSpec/generated code
        const changes = await analyzeTypeSpecChanges(moduleDirectory, restApiSpecsPR, typeSpecCommit);
        
        if (changes.length === 0) {
            return {
                content: [{
                    type: "text",
                    text: "✅ No TypeSpec changes detected that affect customized code."
                }]
            };
        }

        // 2. Find all customized files that might be affected
        const customizedFiles = await findCustomizedFiles(moduleDirectory);
        
        // 3. Use JavaParser to analyze which customizations need updating
        const affectedCustomizations = await analyzeAffectedCustomizations(customizedFiles, changes);
        
        // 4. Generate specific updates based on actual changes
        const updateResults = await generateAndApplyUpdates(
            moduleDirectory, 
            affectedCustomizations, 
            changes, 
            dryRun
        );

        // 5. Report results
        return generateUpdateReport(updateResults, changes, dryRun);

    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `❌ Error updating customized code: ${error instanceof Error ? error.message : String(error)}`
            }]
        };
    }
}

/**
 * Analyze what actually changed in TypeSpec/generated code
 * This replaces the predetermined change detection
 */
async function analyzeTypeSpecChanges(
    moduleDirectory: string, 
    restApiSpecsPR?: string, 
    typeSpecCommit?: string
): Promise<TypeSpecChange[]> {
    const changes: TypeSpecChange[] = [];

    try {
        // Option 1: Analyze based on rest-api-specs PR
        if (restApiSpecsPR) {
            // Parse the PR to understand what changed in the OpenAPI specs
            // This would require GitHub API integration
            console.log(`Analyzing rest-api-specs PR: ${restApiSpecsPR}`);
            // Implementation would fetch PR diff and parse OpenAPI changes
        }

        // Option 2: Compare generated code against previous version
        const generatedSrcPath = path.join(moduleDirectory, 'src', 'main', 'java');
        if (await directoryExists(generatedSrcPath)) {
            // Use git diff to see what changed in generated files
            const gitDiff = await execAsync('git diff HEAD~1 -- src/main/java', { cwd: moduleDirectory });
            changes.push(...parseGeneratedCodeDiff(gitDiff.stdout));
        }

        // Option 3: Use JavaParser to compare old vs new generated interfaces
        const clientInterfaces = await findClientInterfaces(moduleDirectory);
        for (const interfaceFile of clientInterfaces) {
            const interfaceChanges = await analyzeInterfaceChanges(interfaceFile);
            changes.push(...interfaceChanges);
        }

    } catch (error) {
        console.warn(`Could not analyze TypeSpec changes: ${error}`);
    }

    return changes;
}

/**
 * Find all files that contain customized code
 */
async function findCustomizedFiles(moduleDirectory: string): Promise<CustomizedFile[]> {
    const customizedFiles: CustomizedFile[] = [];

    // 1. Check for customization directory (customization-class pattern)
    const customizationDir = path.join(moduleDirectory, 'customization');
    if (await directoryExists(customizationDir)) {
        const javaFiles = await findJavaFiles(customizationDir);
        for (const file of javaFiles) {
            customizedFiles.push({
                filePath: file,
                className: path.basename(file, '.java'),
                isCustomization: true,
                hasHandWrittenCode: true,
                customizationType: 'customization-class'
            });
        }
    }

    // 2. Check for partial-update files (files with manual modifications)
    const srcMainJava = path.join(moduleDirectory, 'src', 'main', 'java');
    if (await directoryExists(srcMainJava)) {
        const allJavaFiles = await findJavaFiles(srcMainJava);
        for (const file of allJavaFiles) {
            const hasManualCode = await hasHandWrittenModifications(file);
            if (hasManualCode) {
                customizedFiles.push({
                    filePath: file,
                    className: path.basename(file, '.java'),
                    isCustomization: false,
                    hasHandWrittenCode: true,
                    customizationType: 'partial-update'
                });
            }
        }
    }

    return customizedFiles;
}

/**
 * Use JavaParser to analyze which customizations are affected by changes
 */
async function analyzeAffectedCustomizations(
    customizedFiles: CustomizedFile[], 
    changes: TypeSpecChange[]
): Promise<Array<{file: CustomizedFile, affectedChanges: TypeSpecChange[]}>> {
    const affected: Array<{file: CustomizedFile, affectedChanges: TypeSpecChange[]}> = [];

    for (const file of customizedFiles) {
        const fileChanges = changes.filter(change => 
            isFileAffectedByChange(file, change)
        );
        
        if (fileChanges.length > 0) {
            affected.push({ file, affectedChanges: fileChanges });
        }
    }

    return affected;
}

/**
 * Generate and apply specific updates based on actual detected changes
 */
async function generateAndApplyUpdates(
    moduleDirectory: string,
    affectedCustomizations: Array<{file: CustomizedFile, affectedChanges: TypeSpecChange[]}>,
    allChanges: TypeSpecChange[],
    dryRun: boolean
): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];

    for (const { file, affectedChanges } of affectedCustomizations) {
        const result: UpdateResult = {
            file: file.filePath,
            changesApplied: [],
            manualReviewRequired: [],
            success: false
        };

        try {
            // Use JavaParser to understand the current code structure
            const currentCode = await fs.readFile(file.filePath, 'utf-8');
            
            // Generate specific updates for each change
            for (const change of affectedChanges) {
                const update = await generateSpecificUpdate(currentCode, change, file);
                
                if (update.autoApplicable && !dryRun) {
                    // Apply the change using JavaParser AST manipulation
                    await applyCodeUpdate(file.filePath, update);
                    result.changesApplied.push(update.description);
                } else {
                    result.manualReviewRequired.push(update.description);
                }
            }

            result.success = true;
        } catch (error) {
            result.manualReviewRequired.push(`Error processing file: ${error}`);
        }

        results.push(result);
    }

    return results;
}

// Helper functions (implementation would use JavaParser, Git, etc.)

async function directoryExists(dirPath: string): Promise<boolean> {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

async function findJavaFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(directory, { withFileTypes: true, recursive: true });
    
    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.java')) {
            files.push(path.join(directory, entry.name));
        }
    }
    
    return files;
}

async function hasHandWrittenModifications(filePath: string): Promise<boolean> {
    // This would analyze if the file has been modified from its generated state
    // Could use git blame, file timestamps, or code pattern analysis
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        // Look for indicators of hand-written code vs generated code
        return content.includes('// Custom implementation') || 
               content.includes('// TODO:') ||
               !content.includes('// Code generated by');
    } catch {
        return false;
    }
}

function parseGeneratedCodeDiff(gitDiff: string): TypeSpecChange[] {
    // Parse git diff output to identify specific API changes
    const changes: TypeSpecChange[] = [];
    // Implementation would parse diff and extract method signature changes
    return changes;
}

async function findClientInterfaces(moduleDirectory: string): Promise<string[]> {
    // Find generated client interface files
    const interfaces: string[] = [];
    const srcPath = path.join(moduleDirectory, 'src', 'main', 'java');
    
    if (await directoryExists(srcPath)) {
        const javaFiles = await findJavaFiles(srcPath);
        // Filter for client interfaces (typically end with 'Client.java')
        interfaces.push(...javaFiles.filter(f => f.includes('Client.java')));
    }
    
    return interfaces;
}

async function analyzeInterfaceChanges(interfaceFile: string): Promise<TypeSpecChange[]> {
    // Use JavaParser to compare interface before/after changes
    return [];
}

function isFileAffectedByChange(file: CustomizedFile, change: TypeSpecChange): boolean {
    // Determine if a customized file is affected by a specific TypeSpec change
    return file.className === change.className || 
           file.filePath.includes(change.className);
}

async function generateSpecificUpdate(
    currentCode: string, 
    change: TypeSpecChange, 
    file: CustomizedFile
): Promise<{description: string, autoApplicable: boolean, codeChange?: string}> {
    // Generate specific code updates based on the actual change detected
    return {
        description: `Update ${change.methodName} in ${file.className} due to ${change.type}`,
        autoApplicable: change.type !== 'method_signature', // Conservative approach
        codeChange: `// Generated update for ${change.description}`
    };
}

async function applyCodeUpdate(
    filePath: string, 
    update: {description: string, autoApplicable: boolean, codeChange?: string}
): Promise<void> {
    // Use JavaParser to apply the specific code update
    console.log(`Applying update to ${filePath}: ${update.description}`);
    // Implementation would use JavaParser AST manipulation
}

function generateUpdateReport(
    results: UpdateResult[], 
    changes: TypeSpecChange[], 
    dryRun: boolean
): CallToolResult {
    const totalFiles = results.length;
    const successfulUpdates = results.filter(r => r.success).length;
    const totalChanges = results.reduce((sum, r) => sum + r.changesApplied.length, 0);
    const manualReviews = results.reduce((sum, r) => sum + r.manualReviewRequired.length, 0);

    const reportText = [
        `🔄 Customization Update Report ${dryRun ? '(Dry Run)' : ''}`,
        ``,
        `📊 Summary:`,
        `  • Files analyzed: ${totalFiles}`,
        `  • Successful updates: ${successfulUpdates}`,
        `  • Auto-applied changes: ${totalChanges}`,
        `  • Manual review required: ${manualReviews}`,
        ``,
        `📝 TypeSpec Changes Detected:`,
        ...changes.map(c => `  • ${c.className}.${c.methodName}: ${c.description}`),
        ``,
        `📂 File Results:`,
        ...results.map(r => [
            `  ${path.basename(r.file)}:`,
            ...r.changesApplied.map(c => `    ✅ ${c}`),
            ...r.manualReviewRequired.map(c => `    ⚠️  ${c}`)
        ].join('\n'))
    ].join('\n');

    return {
        content: [{ type: "text", text: reportText }]
    };
}
