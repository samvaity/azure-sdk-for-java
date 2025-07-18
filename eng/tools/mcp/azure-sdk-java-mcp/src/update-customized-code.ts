import { CallToolResult } from "@modelcontextprotocol/sdk/types";
import fs from "fs/promises";
import path from "path";
import { execAsync, findModuleDirectory, checkFileExistence } from "./utils/index.js";
import {
    generateFixSuggestions,
    analyzeCustomizationPatterns,
    COMMON_API_CHANGES,
    REQUIRED_IMPORTS
} from "./customization-helpers.js";

/**
 * Check if a directory is a valid Java SDK module directory
 */
async function isValidModuleDirectory(moduleDirectory: string): Promise<boolean> {
    return (await checkFileExistence(path.join(moduleDirectory, "pom.xml"))) &&
           (await checkFileExistence(path.join(moduleDirectory, "src")));
}

interface CustomizationInfo {
    hasPartialUpdate: boolean;
    hasCustomizationClass: boolean;
    customizationClass?: string;
    tspConfigPath?: string;
}

interface CompilationError {
    file: string;
    line: number;
    error: string;
    type: 'missing_import' | 'missing_method' | 'type_mismatch' | 'other';
}

/**
 * Update customized code after SDK generation to fix compilation errors
 * and maintain compatibility with newly generated code.
 */
export async function updateCustomizedCode(moduleDirectory: string): Promise<CallToolResult> {
    try {
        // 1. Analyze the module to understand customization setup
        const customizationInfo = await analyzeCustomizations(moduleDirectory);

        // 2. Check for compilation errors
        const compilationErrors = await checkCompilation(moduleDirectory);

        if (compilationErrors.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "✅ No compilation errors found. Customized code is up to date.",
                    },
                ],
            };
        }

        // 3. Attempt to fix compilation errors
        const fixResults = await fixCompilationErrors(moduleDirectory, compilationErrors, customizationInfo);

        // 4. Re-check compilation after fixes
        const remainingErrors = await checkCompilation(moduleDirectory);

        const result = {
            customizationInfo,
            errorsFixed: compilationErrors.length - remainingErrors.length,
            remainingErrors: remainingErrors.length,
            fixResults,
        };

        if (remainingErrors.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ Successfully updated customized code!\n\n` +
                              `🔧 Fixed ${result.errorsFixed} compilation errors\n` +
                              `📁 Module: ${path.basename(moduleDirectory)}\n` +
                              `🎯 Customization type: ${getCustomizationType(customizationInfo)}\n\n` +
                              `Summary of fixes:\n${fixResults.map(f => `  • ${f.description}`).join('\n')}`,
                    },
                ],
            };
        } else {
            return {
                content: [
                    {
                        type: "text",
                        text: `⚠️ Partially updated customized code\n\n` +
                              `🔧 Fixed ${result.errorsFixed} compilation errors\n` +
                              `❌ ${remainingErrors.length} errors still need manual attention\n` +
                              `📁 Module: ${path.basename(moduleDirectory)}\n` +
                              `🎯 Customization type: ${getCustomizationType(customizationInfo)}\n\n` +
                              `Remaining errors require manual review:\n` +
                              remainingErrors.map(e => `  • ${e.file}:${e.line} - ${e.error}`).join('\n'),
                    },
                ],
            };
        }

    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error updating customized code: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
}

async function analyzeCustomizations(moduleDirectory: string): Promise<CustomizationInfo> {
    const info: CustomizationInfo = {
        hasPartialUpdate: false,
        hasCustomizationClass: false,
    };

    // Use helper function for enhanced analysis
    const { patterns, recommendations } = await analyzeCustomizationPatterns(moduleDirectory);

    // Extract specific information for backward compatibility
    info.hasPartialUpdate = patterns.some(p => p.includes('partial-update'));
    info.hasCustomizationClass = patterns.some(p => p.includes('Customization class'));

    // Check for tsp-location.yaml to find the TypeSpec source
    const tspLocationPath = path.join(moduleDirectory, "tsp-location.yaml");
    if (await fileExists(tspLocationPath)) {
        const content = await fs.readFile(tspLocationPath, 'utf-8');
        // Extract TypeSpec source directory from tsp-location.yaml
        const sourceMatch = content.match(/directory:\s*(.+)/);
        if (sourceMatch) {
            const tspConfigPath = path.join(path.dirname(moduleDirectory), sourceMatch[1], "tspconfig.yaml");
            info.tspConfigPath = tspConfigPath;

            if (await fileExists(tspConfigPath)) {
                const tspConfig = await fs.readFile(tspConfigPath, 'utf-8');

                // Check for partial-update flag
                if (tspConfig.includes('partial-update: true')) {
                    info.hasPartialUpdate = true;
                }

                // Check for customization-class
                const customizationMatch = tspConfig.match(/customization-class:\s*(.+)/);
                if (customizationMatch) {
                    info.hasCustomizationClass = true;
                    info.customizationClass = customizationMatch[1].trim();
                }
            }
        }
    }

    return info;
}

async function checkCompilation(moduleDirectory: string): Promise<CompilationError[]> {
    const errors: CompilationError[] = [];

    try {
        // Run Maven compile to check for errors
        const { stdout, stderr } = await execAsync('mvn compile -q', {
            cwd: moduleDirectory,
            timeout: 60000 // 1 minute timeout
        });

        // If no errors, return empty array
        return errors;

    } catch (error: any) {
        // Parse compilation errors from Maven output
        const output = error.stdout + error.stderr;
        const errorLines = output.split('\n');

        for (const line of errorLines) {
            const errorMatch = line.match(/\[ERROR\]\s*(.+?):(\d+).*?error:\s*(.+)/);
            if (errorMatch) {
                const [, file, lineNum, errorMsg] = errorMatch;
                errors.push({
                    file: file,
                    line: parseInt(lineNum),
                    error: errorMsg.trim(),
                    type: categorizeError(errorMsg),
                });
            }
        }
    }

    return errors;
}

function categorizeError(errorMsg: string): CompilationError['type'] {
    if (errorMsg.includes('cannot find symbol') || errorMsg.includes('package does not exist')) {
        return 'missing_import';
    } else if (errorMsg.includes('cannot resolve method') || errorMsg.includes('method not found')) {
        return 'missing_method';
    } else if (errorMsg.includes('incompatible types') || errorMsg.includes('type mismatch')) {
        return 'type_mismatch';
    }
    return 'other';
}

async function fixCompilationErrors(
    moduleDirectory: string,
    errors: CompilationError[],
    customizationInfo: CustomizationInfo
): Promise<Array<{description: string, success: boolean}>> {
    const results: Array<{description: string, success: boolean}> = [];

    // Group errors by type for batch processing
    const errorsByType = errors.reduce((acc, error) => {
        if (!acc[error.type]) acc[error.type] = [];
        acc[error.type].push(error);
        return acc;
    }, {} as Record<string, CompilationError[]>);

    // Fix missing imports
    if (errorsByType.missing_import) {
        const importResult = await fixMissingImports(moduleDirectory, errorsByType.missing_import);
        results.push(...importResult);
    }

    // Fix missing methods by updating method signatures
    if (errorsByType.missing_method) {
        const methodResult = await fixMissingMethods(moduleDirectory, errorsByType.missing_method);
        results.push(...methodResult);
    }

    // Fix type mismatches
    if (errorsByType.type_mismatch) {
        const typeResult = await fixTypeMismatches(moduleDirectory, errorsByType.type_mismatch);
        results.push(...typeResult);
    }

    return results;
}

async function fixMissingImports(moduleDirectory: string, errors: CompilationError[]): Promise<Array<{description: string, success: boolean}>> {
    const results: Array<{description: string, success: boolean}> = [];

    // Common import mappings for Azure SDK
    const commonImports = new Map([
        ['BinaryData', 'com.azure.core.util.BinaryData'],
        ['Context', 'com.azure.core.util.Context'],
        ['Response', 'com.azure.core.http.rest.Response'],
        ['PagedIterable', 'com.azure.core.http.rest.PagedIterable'],
        ['PollerFlux', 'com.azure.core.util.polling.PollerFlux'],
        ['SyncPoller', 'com.azure.core.util.polling.SyncPoller'],
        ['RequestOptions', 'com.azure.core.http.RequestOptions'],
    ]);

    for (const error of errors) {
        try {
            const filePath = path.resolve(moduleDirectory, error.file);
            if (await fileExists(filePath)) {
                const content = await fs.readFile(filePath, 'utf-8');

                // Extract the missing symbol from error message
                const symbolMatch = error.error.match(/cannot find symbol.*?symbol:\s*(?:class\s+)?(\w+)/);
                if (symbolMatch) {
                    const symbol = symbolMatch[1];
                    const importStatement = commonImports.get(symbol);

                    if (importStatement && !content.includes(importStatement)) {
                        // Add the import statement
                        const lines = content.split('\n');
                        const packageIndex = lines.findIndex(line => line.startsWith('package '));
                        const importIndex = packageIndex + 1;

                        lines.splice(importIndex, 0, `import ${importStatement};`);
                        await fs.writeFile(filePath, lines.join('\n'));

                        results.push({
                            description: `Added missing import: ${importStatement}`,
                            success: true
                        });
                    }
                }
            }
        } catch (err) {
            results.push({
                description: `Failed to fix import in ${error.file}: ${err}`,
                success: false
            });
        }
    }

    return results;
}

async function fixMissingMethods(moduleDirectory: string, errors: CompilationError[]): Promise<Array<{description: string, success: boolean}>> {
    const results: Array<{description: string, success: boolean}> = [];

    // This is more complex and would require analyzing the generated code
    // to understand what method signatures have changed
    for (const error of errors) {
        results.push({
            description: `Method signature error in ${error.file}:${error.line} requires manual review`,
            success: false
        });
    }

    return results;
}

async function fixTypeMismatches(moduleDirectory: string, errors: CompilationError[]): Promise<Array<{description: string, success: boolean}>> {
    const results: Array<{description: string, success: boolean}> = [];

    // Common type mapping changes in Azure SDK
    const typeMappings = new Map([
        ['String', 'BinaryData'],
        ['Object', 'BinaryData'],
        ['byte[]', 'BinaryData'],
    ]);

    for (const error of errors) {
        try {
            const filePath = path.resolve(moduleDirectory, error.file);
            if (await fileExists(filePath)) {
                // This would require more sophisticated analysis of the actual type changes
                results.push({
                    description: `Type mismatch in ${error.file}:${error.line} requires manual review`,
                    success: false
                });
            }
        } catch (err) {
            results.push({
                description: `Failed to analyze type mismatch in ${error.file}: ${err}`,
                success: false
            });
        }
    }

    return results;
}

function getCustomizationType(info: CustomizationInfo): string {
    if (info.hasPartialUpdate && info.hasCustomizationClass) {
        return "Partial Update + Customization Class";
    } else if (info.hasPartialUpdate) {
        return "Partial Update";
    } else if (info.hasCustomizationClass) {
        return "Customization Class";
    }
    return "None detected";
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}
