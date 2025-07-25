import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { detectCompilationIssues, type CompilationIssue } from './detect-compilation-issues.js';
import {
    CUSTOMIZATION_COOKBOOK,
    matchErrorToPattern,
    extractContextFromError,
    generateCustomizationFromPattern,
    type PatternFeedback,
    recordPatternFeedback
} from './customization-cookbook.js';

export interface CustomizationFix {
    pattern: string;
    description: string;
    confidence: "high" | "medium" | "low";
    code: string;
    applied: boolean;
    errorMessage?: string;
}

export interface UpdateCustomizationClassInput {
    customizationFile: string;    // Path to customization class
}

/**
 * Updates Java customization classes using deterministic cookbook patterns
 * Focuses on automatically fixable issues with high confidence
 */
export async function updateCustomizationClass(
    input: UpdateCustomizationClassInput
): Promise<CallToolResult> {
    const { customizationFile } = input;
    const startTime = Date.now();

    try {
        // Step 1: Validate inputs
        if (!customizationFile.endsWith('.java')) {
            return createErrorResult("Customization file must be a .java file");
        }

        // Derive module directory from customization file path
        const moduleDirectory = findModuleDirectory(customizationFile);
        if (!moduleDirectory) {
            return createErrorResult("Could not determine module directory from customization file path");
        }

        // Step 2: Detect compilation issues
        console.log(`🔍 Detecting compilation issues in ${moduleDirectory}`);
        const compilationResult = await detectCompilationIssues({ moduleDirectory });

        // Debug: show full compilation result
        const resultContent = compilationResult.content[0];
        if (resultContent && 'text' in resultContent) {
            const resultText = resultContent.text as string;
            console.log(`📋 Compilation result length: ${resultText.length}`);

            if (resultText.includes('[ERROR]')) {
                console.log('📋 Found [ERROR] text in result');
                const errorLines = resultText.split('\n').filter((line: string) => line.includes('[ERROR]'));
                console.log(`📋 Error lines count: ${errorLines.length}`);
                if (errorLines.length > 0) {
                    console.log(`📋 First error line: ${errorLines[0]}`);
                }
            } else {
                console.log('📋 No [ERROR] text found in result');
            }
        }

        // Parse issues from the compilation result
        const issues = await parseIssuesFromResult(compilationResult, customizationFile);

        if (issues.length === 0) {
            return {
                content: [{
                    type: "text",
                    text: `✅ **No Issues Found** (${Date.now() - startTime}ms)\n\nCustomization class compiles successfully. No fixes needed.`
                }]
            };
        }

        console.log(`📋 Found ${issues.length} compilation issues to analyze`);

        // Step 3: Generate fixes using cookbook patterns
        const fixes = await generateFixesFromCookbook(issues, customizationFile);

        if (fixes.length === 0) {
            return {
                content: [{
                    type: "text",
                    text: formatNoFixesResult(issues, Date.now() - startTime)
                }]
            };
        }

        // Step 4: Apply high-confidence fixes
        const results = await applyFixes(customizationFile, fixes);

        return {
            content: [{
                type: "text",
                text: formatResults(results, Date.now() - startTime)
            }]
        };

    } catch (error) {
        return createErrorResult(`Error updating customization: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function findModuleDirectory(customizationFile: string): string | null {
    // Navigate up from customization file to find module root (contains pom.xml)
    let current = dirname(customizationFile);

    while (current !== dirname(current)) { // Stop at root
        try {
            // Use fs.promises.access instead of require
            if (require('fs').existsSync(join(current, 'pom.xml'))) {
                return current;
            }
        } catch {}
        current = dirname(current);
    }

    // For Document Intelligence customization path, manually construct module path
    if (customizationFile.includes('azure-ai-documentintelligence\\customization')) {
        const parts = customizationFile.split('\\');
        const moduleIndex = parts.findIndex(part => part === 'azure-ai-documentintelligence');
        if (moduleIndex > -1) {
            return parts.slice(0, moduleIndex + 1).join('\\');
        }
    }

    return null;
}

async function parseIssuesFromResult(compilationResult: CallToolResult, customizationFile: string): Promise<CompilationIssue[]> {
    const resultText = compilationResult.content[0]?.text;
    if (typeof resultText !== 'string') return [];

    // Look for compilation errors in the format:
    // [ERROR] /path/to/file.java:[line,column] cannot find symbol
    const lines = resultText.split('\n');
    const issues: CompilationIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match the error line format: [ERROR] /path/file.java:[line,column] error message
        const errorMatch = line.match(/\[ERROR\]\s+([^:]+):\[(\d+),(\d+)\]\s+(.*)/);

        if (errorMatch) {
            const [, filePath, lineNum, colNum, message] = errorMatch;

            // Look for additional context in the next few lines
            let fullMessage = message;

            // Check if the next line has symbol/location info
            if (i + 1 < lines.length && lines[i + 1].includes('symbol:')) {
                const symbolLine = lines[i + 1];
                const symbolMatch = symbolLine.match(/symbol:\s+(.+)/);
                if (symbolMatch) {
                    fullMessage += ` (${symbolMatch[1].trim()})`;
                }
            }

            issues.push({
                type: "compilation_error",
                file: filePath,
                line: parseInt(lineNum),
                column: parseInt(colNum),
                message: fullMessage
            });

            console.log(`🔍 Found compilation error: ${fullMessage} in ${filePath}:${lineNum}`);
        }
    }

    return issues;
}

async function generateFixesFromCookbook(issues: CompilationIssue[], customizationFile: string): Promise<CustomizationFix[]> {
    const fixes: CustomizationFix[] = [];

    for (const issue of issues) {
        console.log(`🔧 Analyzing issue: ${issue.message}`);

        // Match error to cookbook pattern
        const pattern = matchErrorToPattern(issue.message, customizationFile);

        if (pattern) {
            console.log(`📖 Matched pattern: ${pattern.name}`);

            // Extract context for template placeholders
            const context = extractContextFromError(issue.message, customizationFile, pattern);

            // Generate customization code
            const code = generateCustomizationFromPattern(pattern, context);

            fixes.push({
                pattern: pattern.name,
                description: pattern.description,
                confidence: pattern.solution.confidence,
                code: code.trim(),
                applied: false
            });
        } else {
            console.log(`❓ No pattern matched for: ${issue.message}`);
        }
    }

    return fixes;
}

async function applyFixes(customizationFile: string, fixes: CustomizationFix[]): Promise<CustomizationFix[]> {
    // Only apply high-confidence fixes automatically
    const highConfidenceFixes = fixes.filter(fix => fix.confidence === 'high');
    const otherFixes = fixes.filter(fix => fix.confidence !== 'high');

    if (highConfidenceFixes.length === 0) {
        console.log("📋 No high-confidence fixes to apply automatically");
        return fixes;
    }

    try {
        // Read current customization file
        const originalContent = await fs.readFile(customizationFile, 'utf8');

        // Apply fixes by appending to the customize method
        let updatedContent = originalContent;
        const fixesCode = highConfidenceFixes.map(fix => fix.code).join('\n\n');

        // Find the customize method and append fixes
        if (updatedContent.includes('public void customize(LibraryCustomization customization)')) {
            // Insert before the closing brace of the customize method
            const customizeMethodEnd = updatedContent.lastIndexOf('}');
            if (customizeMethodEnd > -1) {
                updatedContent =
                    updatedContent.substring(0, customizeMethodEnd) +
                    '\n' + fixesCode + '\n    ' +
                    updatedContent.substring(customizeMethodEnd);
            }
        } else {
            // Add customize method if it doesn't exist
            const classEnd = updatedContent.lastIndexOf('}');
            if (classEnd > -1) {
                const customizeMethod = `
    @Override
    public void customize(LibraryCustomization customization) {
${fixesCode}
    }
`;
                updatedContent =
                    updatedContent.substring(0, classEnd) +
                    customizeMethod + '\n' +
                    updatedContent.substring(classEnd);
            }
        }

        // Write updated file
        await fs.writeFile(customizationFile, updatedContent, 'utf8');

        // Mark fixes as applied
        highConfidenceFixes.forEach(fix => {
            fix.applied = true;
        });

        console.log(`✅ Applied ${highConfidenceFixes.length} high-confidence fixes`);

    } catch (error) {
        console.error(`❌ Failed to apply fixes:`, error);
        highConfidenceFixes.forEach(fix => {
            fix.applied = false;
            fix.errorMessage = error instanceof Error ? error.message : String(error);
        });
    }

    return [...highConfidenceFixes, ...otherFixes];
}

function createErrorResult(message: string): CallToolResult {
    return {
        content: [{
            type: "text",
            text: `❌ **Error:** ${message}`
        }]
    };
}

function formatNoFixesResult(issues: CompilationIssue[], duration: number): string {
    let result = `🔍 **Analysis Complete** (${duration}ms)\n\n`;
    result += `Found ${issues.length} compilation issues, but no automatic fixes are available.\n\n`;

    result += "**Issues Found:**\n";
    issues.forEach((issue, i) => {
        result += `${i + 1}. ${issue.message}\n`;
    });

    result += "\n💡 **Next Steps:**\n";
    result += "- Review the errors manually\n";
    result += "- Check if new cookbook patterns are needed\n";
    result += "- Consider updating the TypeSpec customization approach";

    return result;
}

function formatResults(fixes: CustomizationFix[], duration: number): string {
    const applied = fixes.filter(f => f.applied);
    const failed = fixes.filter(f => !f.applied && f.errorMessage);
    const skipped = fixes.filter(f => !f.applied && !f.errorMessage);

    let result = `🔧 **Customization Update Complete** (${duration}ms)\n\n`;

    if (applied.length > 0) {
        result += `✅ **Applied ${applied.length} fixes:**\n`;
        applied.forEach((fix, i) => {
            result += `${i + 1}. **${fix.pattern}** (${fix.confidence} confidence)\n`;
            result += `   ${fix.description}\n\n`;
        });
    }

    if (skipped.length > 0) {
        result += `⏭️ **Skipped ${skipped.length} lower-confidence fixes:**\n`;
        skipped.forEach((fix, i) => {
            result += `${i + 1}. **${fix.pattern}** (${fix.confidence} confidence)\n`;
            result += `   ${fix.description}\n`;
            result += `   *Requires manual review*\n\n`;
        });
    }

    if (failed.length > 0) {
        result += `❌ **Failed to apply ${failed.length} fixes:**\n`;
        failed.forEach((fix, i) => {
            result += `${i + 1}. **${fix.pattern}**: ${fix.errorMessage}\n`;
        });
    }

    result += "\n💡 **Next Steps:**\n";
    result += "- Run compilation again to verify fixes\n";
    result += "- Review any remaining manual fixes needed\n";
    result += "- Test the updated customization functionality";

    return result;
}
