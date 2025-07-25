import { promises as fs } from "fs";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { detectCompilationIssues, CompilationIssue } from "./detect-compilation-issues.js";

export interface UpdateCustomizationClassInput {
    customizationFile: string;    // Path to customization class
    moduleDirectory: string;      // SDK module directory
}

/**
 * Cookbook-based customization class updater
 * Uses predefined patterns and AutoRest customization recipes
 */
export async function updateCustomizationClass(
    input: UpdateCustomizationClassInput
): Promise<CallToolResult> {
    const { customizationFile, moduleDirectory } = input;

    try {
        // Step 1: Get compilation issues
        const compilationResult = await detectCompilationIssues({
            moduleDirectory,
            cleanFirst: false,
        });

        const issues = parseCompilationIssues(compilationResult);
        if (issues.length === 0) {
            return {
                content: [{
                    type: "text",
                    text: "✅ **No Issues Found** - Customization compiles successfully"
                }]
            };
        }

        // Step 2: Apply cookbook fixes
        const fixes = generateCookbookFixes(issues);
        if (fixes.length === 0) {
            return {
                content: [{
                    type: "text",
                    text: `❌ **No Cookbook Fixes Available**\n\nFound ${issues.length} issues but no matching cookbook recipes.\n\n**Issues:**\n${issues.map(i => `- ${i.message.substring(0, 100)}...`).join('\n')}`
                }]
            };
        }

        // Step 3: Apply fixes to customization file
        const originalContent = await fs.readFile(customizationFile, 'utf8');
        const updatedContent = applyCookbookFixes(originalContent, fixes);

        await fs.writeFile(customizationFile, updatedContent, 'utf8');

        return {
            content: [{
                type: "text",
                text: formatResults(fixes, customizationFile)
            }]
        };

    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `❌ **Error:** ${error instanceof Error ? error.message : String(error)}`
            }]
        };
    }
}

interface CookbookFix {
    pattern: string;
    description: string;
    oldSymbol: string;
    newSymbol: string;
    autoRestCode: string;
}

/**
 * COOKBOOK: Predefined recipes for common compilation issues
 */
function generateCookbookFixes(issues: CompilationIssue[]): CookbookFix[] {
    const fixes: CookbookFix[] = [];

    for (const issue of issues) {
        const fix = matchCookbookPattern(issue);
        if (fix) {
            fixes.push(fix);
        }
    }

    return fixes;
}

function matchCookbookPattern(issue: CompilationIssue): CookbookFix | null {
    const message = issue.message.toLowerCase();

    // RECIPE 1: analyzeDocumentOptions -> analyzeDocumentRequest
    if (message.includes('cannot find symbol') && message.includes('variable: analyzedocumentoptions')) {
        return {
            pattern: 'parameter_name_mismatch',
            description: 'Fix analyzeDocumentOptions parameter name mismatch',
            oldSymbol: 'analyzeDocumentOptions',
            newSymbol: 'analyzeDocumentRequest',
            autoRestCode: generateParameterReplaceRecipe('analyzeDocumentOptions', 'analyzeDocumentRequest')
        };
    }

    // RECIPE 2: Generic Options -> Request pattern
    const optionsMatch = message.match(/variable: (\w*options)/i);
    if (optionsMatch) {
        const oldParam = optionsMatch[1];
        const newParam = oldParam.replace(/options$/i, 'Request');
        return {
            pattern: 'parameter_name_mismatch',
            description: `Fix ${oldParam} parameter name (Options -> Request pattern)`,
            oldSymbol: oldParam,
            newSymbol: newParam,
            autoRestCode: generateParameterReplaceRecipe(oldParam, newParam)
        };
    }

    // RECIPE 3: Missing class pattern
    const classMatch = message.match(/cannot find symbol.*class: (\w+)/i);
    if (classMatch) {
        const missingClass = classMatch[1];
        return {
            pattern: 'class_not_found',
            description: `Add missing class import: ${missingClass}`,
            oldSymbol: missingClass,
            newSymbol: missingClass,
            autoRestCode: generateClassImportRecipe(missingClass)
        };
    }

    // RECIPE 4: Method not found pattern
    const methodMatch = message.match(/cannot find symbol.*method: (\w+)/i);
    if (methodMatch) {
        const missingMethod = methodMatch[1];
        return {
            pattern: 'method_not_found',
            description: `Fix missing method: ${missingMethod}`,
            oldSymbol: missingMethod,
            newSymbol: missingMethod,
            autoRestCode: generateMethodFixRecipe(missingMethod)
        };
    }

    return null;
}

/**
 * COOKBOOK RECIPES: AutoRest customization code templates
 */

function generateParameterReplaceRecipe(oldParam: string, newParam: string): string {
    return `
        // COOKBOOK RECIPE: Replace ${oldParam} with ${newParam} in method bodies
        customization.getClass("com.azure.ai.documentintelligence", "DocumentIntelligenceAsyncClient")
            .customizeAst(ast -> ast.getClassByName("DocumentIntelligenceAsyncClient").ifPresent(clazz -> {
                clazz.getMethods().forEach(method -> {
                    method.getBody().ifPresent(body -> {
                        String bodyStr = body.toString();
                        if (bodyStr.contains("${oldParam}")) {
                            bodyStr = bodyStr.replace("${oldParam}", "${newParam}");
                            method.setBody(StaticJavaParser.parseBlock(bodyStr));
                        }
                    });
                });
            }));

        customization.getClass("com.azure.ai.documentintelligence", "DocumentIntelligenceClient")
            .customizeAst(ast -> ast.getClassByName("DocumentIntelligenceClient").ifPresent(clazz -> {
                clazz.getMethods().forEach(method -> {
                    method.getBody().ifPresent(body -> {
                        String bodyStr = body.toString();
                        if (bodyStr.contains("${oldParam}")) {
                            bodyStr = bodyStr.replace("${oldParam}", "${newParam}");
                            method.setBody(StaticJavaParser.parseBlock(bodyStr));
                        }
                    });
                });
            }));`;
}

function generateClassImportRecipe(className: string): string {
    return `
        // COOKBOOK RECIPE: Add missing class import for ${className}
        customization.getClass("com.azure.ai.documentintelligence", "DocumentIntelligenceClient")
            .customizeAst(ast -> {
                // Add import if missing
                CompilationUnit cu = ast.findRootNode();
                boolean hasImport = cu.getImports().stream()
                    .anyMatch(imp -> imp.getNameAsString().endsWith("${className}"));
                if (!hasImport) {
                    cu.addImport("com.azure.ai.documentintelligence.models.${className}");
                }
            });`;
}

function generateMethodFixRecipe(methodName: string): string {
    return `
        // COOKBOOK RECIPE: Add missing method ${methodName}
        customization.getClass("com.azure.ai.documentintelligence", "DocumentIntelligenceClient")
            .customizeAst(ast -> ast.getClassByName("DocumentIntelligenceClient").ifPresent(clazz -> {
                // Add method if it doesn't exist
                if (clazz.getMethodsByName("${methodName}").isEmpty()) {
                    MethodDeclaration method = clazz.addMethod("${methodName}", Keyword.PUBLIC);
                    method.setType("void");
                    method.getBody().get().addStatement("throw new UnsupportedOperationException(\"Method ${methodName} not implemented\");");
                }
            }));`;
}

function parseCompilationIssues(compilationResult: CallToolResult): CompilationIssue[] {
    const resultText = compilationResult.content[0]?.text;
    if (typeof resultText !== 'string') return [];

    const issues: CompilationIssue[] = [];
    const lines = resultText.split('\n');
    let currentIssue: Partial<CompilationIssue> = {};

    for (const line of lines) {
        if (line.includes('📁 File:')) {
            const fileMatch = line.match(/📁 File: (.+)/);
            if (fileMatch) {
                currentIssue = { file: fileMatch[1].trim() };
            }
        }
        if (line.includes('📍 Line:') && currentIssue.file) {
            const lineMatch = line.match(/📍 Line: (\d+)/);
            if (lineMatch) {
                currentIssue.line = parseInt(lineMatch[1]);
            }
        }
        if (line.includes('💬 Message:') && currentIssue.file) {
            const message = line.replace('💬 Message:', '').trim();
            currentIssue.message = message;
            currentIssue.type = 'compilation_error';
            issues.push(currentIssue as CompilationIssue);
            currentIssue = {};
        }
    }

    return issues;
}

function applyCookbookFixes(content: string, fixes: CookbookFix[]): string {
    // Find the customize method and add the AutoRest code
    const customizeMethodRegex = /(\s*public\s+void\s+customize\s*\([^)]+\)\s*\{)([\s\S]*?)(\s*\}\s*$)/m;
    const match = content.match(customizeMethodRegex);

    if (!match) {
        // If no customize method found, add one
        const classEndRegex = /(\n\s*}\s*)$/;
        const classMatch = content.match(classEndRegex);
        if (classMatch) {
            const newMethod = `
    public void customize(LibraryCustomization customization, RawClient rawClient) {
${fixes.map(fix => fix.autoRestCode).join('\n')}
    }
${classMatch[1]}`;
            return content.replace(classEndRegex, newMethod);
        }
        return content;
    }

    // Add fixes to existing customize method
    const [, methodStart, methodBody, methodEnd] = match;
    const newMethodBody = methodBody + '\n' + fixes.map(fix => fix.autoRestCode).join('\n');

    return content.replace(customizeMethodRegex, methodStart + newMethodBody + methodEnd);
}

function formatResults(fixes: CookbookFix[], customizationFile: string): string {
    let result = `✅ **Applied ${fixes.length} Cookbook Fixes**\n\n`;
    result += `📁 **File:** \`${customizationFile}\`\n\n`;

    fixes.forEach((fix, index) => {
        result += `**${index + 1}.** ${fix.description}\n`;
        result += `   - **Pattern:** ${fix.pattern}\n`;
        result += `   - **Fix:** ${fix.oldSymbol} → ${fix.newSymbol}\n\n`;
    });

    result += "\n💡 **Next Steps:**\n";
    result += "- Run `detect_compilation_issues` to verify fixes\n";
    result += "- Test the updated customization functionality";

    return result;
}
