import { promises as fs } from "fs";
import { join, dirname } from "path";
import { spawnAsync } from "./utils/process.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface CompilationIssue {
    type: "missing_class" | "missing_method" | "signature_change" | "package_moved" | "compilation_error";
    file: string;
    line?: number;
    column?: number;
    message: string;
    suggestedFix?: string;
    errorCode?: string;
}

export interface DetectCompilationIssuesInput {
    moduleDirectory: string;      // Absolute path to SDK module
    buildOutput?: string;         // Optional build log for analysis
    cleanFirst?: boolean;         // Whether to run clean before compile
}

/**
 * Detect compilation issues in Java SDK module after TypeSpec regeneration
 */
export async function detectCompilationIssues(
    input: DetectCompilationIssuesInput
): Promise<CallToolResult> {
    const { moduleDirectory, buildOutput, cleanFirst = true } = input;
    const startTime = Date.now();

    try {
        // Validate module directory
        const validationResult = await validateModuleDirectory(moduleDirectory);
        if (!validationResult.isValid) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Module validation failed:\n${validationResult.errors.join('\n')}`,
                    },
                ],
            };
        }

        // Run Maven compilation to detect issues
        console.log(`⏱️ Starting Maven compilation at ${new Date().toLocaleTimeString()}`);
        const compilationResult = await runMavenCompilation(moduleDirectory, cleanFirst);
        const compilationTime = Date.now() - startTime;
        console.log(`⏱️ Maven compilation completed in ${compilationTime}ms`);

        if (compilationResult.success) {
            return {
                content: [
                    {
                        type: "text",
                        text: `✅ **Compilation Successful** (${compilationTime}ms)\n\nNo compilation issues detected. The module compiles cleanly.`,
                    },
                ],
            };
        }

        console.log(`⏱️ Starting error parsing at ${new Date().toLocaleTimeString()}`);
        // Parse compilation errors from both stderr and stdout (Maven on Windows often uses both)
        const combinedOutput = compilationResult.stdout + '\n' + compilationResult.stderr;
        const issues = await parseCompilationErrors(combinedOutput, moduleDirectory);
        const totalTime = Date.now() - startTime;

        if (issues.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ **Compilation Failed** (${totalTime}ms) but no specific issues identified.\n\n**Raw Error Output:**\n\`\`\`\n${combinedOutput.substring(0, 2000)}${combinedOutput.length > 2000 ? '\n...(truncated)' : ''}\n\`\`\``,
                    },
                ],
            };
        }

        // Categorize issues
        const customizationIssues = issues.filter(issue =>
            issue.file.includes('Customizations.java') ||
            issue.file.includes('customization/')
        );

        const generatedCodeIssues = issues.filter(issue =>
            !customizationIssues.includes(issue)
        );

        // Format results
        let resultText = `🔍 **Compilation Issues Detected** (${totalTime}ms)\n\n`;

        if (customizationIssues.length > 0) {
            resultText += "## 🛠️ Customization Issues (Can be auto-fixed)\n\n";
            customizationIssues.forEach((issue, index) => {
                resultText += `**${index + 1}.** ${issue.type.replace('_', ' ').toUpperCase()}\n`;
                resultText += `   📁 File: \`${issue.file}\`\n`;
                if (issue.line) resultText += `   📍 Line: ${issue.line}\n`;
                resultText += `   💬 Message: ${issue.message}\n`;
                if (issue.suggestedFix) {
                    resultText += `   💡 Suggested Fix: ${issue.suggestedFix}\n`;
                }
                resultText += "\n";
            });

            resultText += `ℹ️ **Next Step:** Use \`update_customization_class\` tool to automatically fix these issues.\n\n`;
        }

        if (generatedCodeIssues.length > 0) {
            resultText += "## ⚠️ Generated Code Issues (Manual review needed)\n\n";
            generatedCodeIssues.forEach((issue, index) => {
                resultText += `**${index + 1}.** ${issue.type.replace('_', ' ').toUpperCase()}\n`;
                resultText += `   📁 File: \`${issue.file}\`\n`;
                if (issue.line) resultText += `   📍 Line: ${issue.line}\n`;
                resultText += `   💬 Message: ${issue.message}\n\n`;
            });
        }

        resultText += "## 📊 Summary\n\n";
        resultText += `- **Total Issues:** ${issues.length}\n`;
        resultText += `- **Customization Issues:** ${customizationIssues.length} (auto-fixable)\n`;
        resultText += `- **Generated Code Issues:** ${generatedCodeIssues.length} (manual review)\n`;

        if (customizationIssues.length > 0) {
            resultText += "\n💡 **Recommended Action:** Run `update_customization_class` to fix customization issues automatically.";
        }

        return {
            content: [
                {
                    type: "text",
                    text: resultText,
                },
            ],
        };

    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error detecting compilation issues: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
}

async function validateModuleDirectory(moduleDirectory: string): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];

    try {
        const dirStats = await fs.stat(moduleDirectory);
        if (!dirStats.isDirectory()) {
            errors.push(`Path is not a directory: ${moduleDirectory}`);
        }
    } catch {
        errors.push(`Directory not accessible: ${moduleDirectory}`);
    }

    // Check for pom.xml (Maven project)
    try {
        await fs.access(join(moduleDirectory, 'pom.xml'));
    } catch {
        errors.push('No pom.xml found. This must be a Maven project directory.');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

async function runMavenCompilation(moduleDirectory: string, cleanFirst: boolean): Promise<{success: boolean, stdout: string, stderr: string}> {
    try {
        const commands = ['clean', 'compile'];

        // Try different Maven command names for cross-platform compatibility
        const mavenCmd = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';

        const result = await spawnAsync(mavenCmd, commands, {
            cwd: moduleDirectory,
            timeout: 120000, // 2 minutes timeout
            shell: true, // Use shell to inherit PATH
            env: process.env, // Inherit environment variables
        });

        console.log(`🔍 Maven result: success=${result.success}, stdout length=${result.stdout.length}, stderr length=${result.stderr.length}`);
        if (result.stderr) {
            console.log(`🔍 First 500 chars of stderr: ${result.stderr.substring(0, 500)}`);
        }
        if (result.stdout) {
            console.log(`🔍 First 500 chars of stdout: ${result.stdout.substring(0, 500)}`);
        }

        return {
            success: result.success,
            stdout: result.stdout,
            stderr: result.stderr,
        };
    } catch (error) {
        // Fallback to regular 'mvn' if 'mvn.cmd' fails
        if (process.platform === 'win32') {
            try {
                const result = await spawnAsync('mvn', ['clean', 'compile'], {
                    cwd: moduleDirectory,
                    timeout: 120000,
                    shell: true,
                    env: process.env,
                });

                return {
                    success: result.success,
                    stdout: result.stdout,
                    stderr: result.stderr,
                };
            } catch (fallbackError) {
                return {
                    success: false,
                    stdout: '',
                    stderr: `Maven execution failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
                };
            }
        }

        return {
            success: false,
            stdout: '',
            stderr: `Maven execution failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

async function parseCompilationErrors(combinedOutput: string, moduleDirectory: string): Promise<CompilationIssue[]> {
    const issues: CompilationIssue[] = [];
    const lines = combinedOutput.split('\n');

    console.log(`🔍 Parsing compilation errors from ${lines.length} lines of output`);

    // Find lines that contain [ERROR] and .java for debugging
    const errorLines = lines.filter(line => line.includes('[ERROR]') && line.includes('.java'));
    console.log(`🔍 Found ${errorLines.length} potential error lines:`);
    errorLines.slice(0, 5).forEach((line, i) => {
        console.log(`  ${i + 1}. ${line.substring(0, 150)}...`);
    });

    // Normalize module directory for consistent path matching
    const normalizedModuleDir = moduleDirectory.replace(/\\/g, '/');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip non-error lines
        if (!line.includes('[ERROR]')) continue;

        // Parse Maven compilation error format
        // Format: [ERROR] /c:/Users/... or [ERROR] /C:/Users/... or [ERROR] C:\Users\...
        // Note: Maven on Windows can use different path formats
        const errorMatch = line.match(/\[ERROR\]\s*(?:\/[a-zA-Z]:)?([^:]*\.java):\[(\d+),(\d+)\]\s*(.+)/);

        if (errorMatch) {
            const [, fullPath, lineNum, colNum, message] = errorMatch;

            // Normalize the path for comparison
            const normalizedPath = fullPath.replace(/\\/g, '/');

            // Convert to relative path from module directory
            let relativePath = normalizedPath.replace(normalizedModuleDir, '').replace(/^[\\\/]/, '');

            // If the path wasn't relative to module directory, use just the filename
            if (relativePath === normalizedPath || relativePath.length === 0) {
                // Extract just the filename with path within src/
                const srcMatch = relativePath.match(/src\/(.+)/);
                if (srcMatch) {
                    relativePath = srcMatch[1];
                } else {
                    relativePath = fullPath.split(/[\\\/]/).pop() || fullPath;
                }
            }

            console.log(`🔍 Parsed error: ${relativePath}:${lineNum}:${colNum} - ${message.substring(0, 50)}...`);

            const issue: CompilationIssue = {
                type: categorizeError(message),
                file: relativePath,
                line: parseInt(lineNum),
                column: parseInt(colNum),
                message: message.trim(),
                suggestedFix: generateSuggestedFix(message, relativePath),
            };

            issues.push(issue);
            continue;
        }

        // Also check for continued error messages that provide more context
        if (line.includes('symbol:') || line.includes('location:')) {
            // Add context to the last issue if available
            if (issues.length > 0) {
                const lastIssue = issues[issues.length - 1];
                lastIssue.message += ` ${line.replace(/^\[ERROR\]\s*/, '').trim()}`;
            }
        }
    }

    console.log(`🔍 Successfully parsed ${issues.length} compilation issues`);
    return issues;
}

function categorizeError(message: string): CompilationIssue['type'] {
    if (message.includes('cannot find symbol') && message.includes('class')) {
        return 'missing_class';
    }
    if (message.includes('cannot find symbol') && message.includes('method')) {
        return 'missing_method';
    }
    if (message.includes('method does not override') || message.includes('incompatible types')) {
        return 'signature_change';
    }
    if (message.includes('package') && message.includes('does not exist')) {
        return 'package_moved';
    }
    return 'compilation_error';
}

function generateSuggestedFix(message: string, filePath: string): string | undefined {
    if (message.includes('cannot find symbol')) {
        if (message.includes('class')) {
            return 'Check if class name changed in generated code and update reference';
        }
        if (message.includes('method')) {
            return 'Check if method signature changed in generated code and update call';
        }
    }

    if (message.includes('method does not override')) {
        return 'Remove @Override annotation or update method signature to match parent class';
    }

    if (message.includes('package') && message.includes('does not exist')) {
        return 'Update import statement to use correct package path';
    }

    if (filePath.includes('Customizations.java')) {
        return 'Use update_customization_class tool to automatically fix this issue';
    }

    return undefined;
}

function extractFileFromErrorContext(lines: string[], currentIndex: number): string | null {
    // Look backwards for file context
    for (let i = currentIndex - 1; i >= Math.max(0, currentIndex - 5); i--) {
        const line = lines[i];
        const fileMatch = line.match(/\[ERROR\]\s*(.+\.java):/);
        if (fileMatch) {
            return fileMatch[1];
        }
    }
    return null;
}
