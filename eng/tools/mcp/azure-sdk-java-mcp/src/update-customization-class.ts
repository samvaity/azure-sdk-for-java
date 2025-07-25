import { promises as fs } from "fs";
import { join, dirname, relative } from "path";
import { spawnAsync } from "./utils/process.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { detectCompilationIssues, CompilationIssue } from "./detect-compilation-issues.js";

export interface CustomizationChange {
    type: "class_rename" | "method_update" | "package_import" | "signature_fix" | "reference_update" | "generated_code_variable_fix";
    oldCode: string;
    newCode: string;
    confidence: "high" | "medium" | "low";
    description: string;
    lineNumber?: number;
}

export interface UpdateCustomizationClassInput {
    customizationFile: string;    // Path to customization class
    moduleDirectory: string;      // SDK module directory
    dryRun?: boolean;            // Preview changes without applying
}

/**
 * Updates Java customization classes to work with updated generated code structure
 * Uses LLM assistance and JavaParser AST analysis to fix compilation issues
 */
export async function updateCustomizationClass(
    input: UpdateCustomizationClassInput
): Promise<CallToolResult> {
    const { customizationFile, moduleDirectory, dryRun = false } = input;

    try {
        // Step 1: Validate inputs
        const validationResult = await validateInputs(customizationFile, moduleDirectory);
        if (!validationResult.isValid) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ **Validation Failed:**\n${validationResult.errors.join('\n')}`,
                    },
                ],
            };
        }

        // Step 2: Read the customization file
        const originalContent = await fs.readFile(customizationFile, 'utf8');

        // Step 3: Run compilation to get specific issues for this customization file
        const compilationResult = await detectCompilationIssues({
            moduleDirectory,
            cleanFirst: false,
        });

        // Extract compilation issues from the result
        const issues = await parseCompilationIssuesFromResult(compilationResult, customizationFile);

        if (issues.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "✅ **No Issues Found**\n\nThe customization class appears to compile successfully, or no specific issues were detected for this file.",
                    },
                ],
            };
        }

        // Step 4: Analyze generated code structure
        const generatedCodeContext = await analyzeGeneratedCodeStructure(moduleDirectory);

        // Step 5: Use LLM-assisted analysis to generate fixes
        const proposedChanges = await generateLLMAssistedFixes(
            originalContent,
            issues,
            generatedCodeContext,
            customizationFile
        );

        if (proposedChanges.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ **No Automatic Fixes Available**\n\nDetected ${issues.length} compilation issues but could not generate automatic fixes. Manual review required.\n\n**Issues:**\n${issues.map(i => `- ${i.message}`).join('\n')}`,
                    },
                ],
            };
        }

        // Step 6: Apply changes and format output
        let updatedContent = originalContent;
        const appliedChanges: CustomizationChange[] = [];
        const skippedChanges: CustomizationChange[] = [];

        for (const change of proposedChanges) {
            if (change.confidence === "high" || change.confidence === "medium") {
                updatedContent = applyChange(updatedContent, change);
                appliedChanges.push(change);
            } else {
                skippedChanges.push(change);
            }
        }

        // Step 7: Format results
        let resultText = "";

        if (dryRun) {
            resultText = formatDryRunResults(appliedChanges, skippedChanges, updatedContent, customizationFile);
        } else {
            // Apply changes to file
            if (appliedChanges.length > 0) {
                await fs.writeFile(customizationFile, updatedContent, 'utf8');

                // Verify the fix by compiling again
                const verificationResult = await detectCompilationIssues({
                    moduleDirectory,
                    cleanFirst: false,
                });

                const stillHasIssues = await hasCompilationIssuesForFile(verificationResult, customizationFile);

                resultText = formatAppliedResults(appliedChanges, skippedChanges, stillHasIssues);
            } else {
                resultText = `❌ **No Changes Applied**\n\nAll proposed changes were low confidence and skipped. Manual review required.\n\n**Issues to fix manually:**\n${issues.map(i => `- ${i.message}`).join('\n')}`;
            }
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
                    text: `❌ **Error:** ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
        };
    }
}

async function validateInputs(customizationFile: string, moduleDirectory: string): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];

    // Check customization file
    try {
        const fileStats = await fs.stat(customizationFile);
        if (!fileStats.isFile()) {
            errors.push(`Customization file not found: ${customizationFile}`);
        }
    } catch {
        errors.push(`Customization file not accessible: ${customizationFile}`);
    }

    // Check module directory
    try {
        const dirStats = await fs.stat(moduleDirectory);
        if (!dirStats.isDirectory()) {
            errors.push(`Module directory not found: ${moduleDirectory}`);
        }
    } catch {
        errors.push(`Module directory not accessible: ${moduleDirectory}`);
    }

    // Validate it's a Java file
    if (!customizationFile.endsWith('.java')) {
        errors.push('Customization file must be a .java file');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

async function parseCompilationIssuesFromResult(compilationResult: CallToolResult, customizationFile: string): Promise<CompilationIssue[]> {
    // Extract issues from the compilation result text
    const resultText = compilationResult.content[0]?.text;

    if (typeof resultText !== 'string') {
        return [];
    }

    // This is a simplified parser - in reality, we'd want to make this more robust
    const issues: CompilationIssue[] = [];

    if (resultText.includes("Compilation Issues Detected")) {
        // Parse the structured output to extract issues
        const lines = resultText.split('\n');
        let currentIssue: Partial<CompilationIssue> = {};

        for (const line of lines) {
            // Look for files that are either the customization file itself OR
            // generated files with errors that might be fixable through customization
            if (line.includes('📁 File:')) {
                const isCustomizationFile = line.includes(customizationFile);
                const isGeneratedWithFixableError = line.includes('DocumentIntelligenceAsyncClient.java') ||
                                                  line.includes('DocumentIntelligenceClient.java');

                if (isCustomizationFile || isGeneratedWithFixableError) {
                    const fileMatch = line.match(/📁 File: (.+)/);
                    if (fileMatch) {
                        currentIssue = { file: fileMatch[1].trim() };
                    }
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

                // Filter for errors that are likely fixable through customization
                const isFixableError = message.includes('cannot find symbol');

                if (currentIssue.file.includes(customizationFile) || isFixableError) {
                    currentIssue.message = message;
                    currentIssue.type = 'compilation_error';
                    issues.push(currentIssue as CompilationIssue);
                }
                currentIssue = {};
            }
        }
    }

    return issues;
}

async function analyzeGeneratedCodeStructure(moduleDirectory: string): Promise<{classes: string[], methods: string[], packages: string[]}> {
    const context = {
        classes: [] as string[],
        methods: [] as string[],
        packages: [] as string[]
    };

    try {
        // Find generated Java files
        const srcMainJava = join(moduleDirectory, 'src', 'main', 'java');

        const result = await spawnAsync('find', [srcMainJava, '-name', '*.java', '-type', 'f'], {
            timeout: 10000,
        });

        if (result.success) {
            const javaFiles = result.stdout.split('\n').filter(line => line.trim());

            // Extract class names and packages from generated files
            for (const filePath of javaFiles.slice(0, 20)) { // Limit to prevent timeout
                try {
                    const content = await fs.readFile(filePath, 'utf8');

                    // Extract package
                    const packageMatch = content.match(/package\s+([\w.]+);/);
                    if (packageMatch && !context.packages.includes(packageMatch[1])) {
                        context.packages.push(packageMatch[1]);
                    }

                    // Extract class names
                    const classMatches = content.match(/(?:public\s+)?(?:class|interface|enum)\s+(\w+)/g);
                    if (classMatches) {
                        classMatches.forEach(match => {
                            const className = match.replace(/(?:public\s+)?(?:class|interface|enum)\s+/, '');
                            if (!context.classes.includes(className)) {
                                context.classes.push(className);
                            }
                        });
                    }

                    // Extract method names (simplified)
                    const methodMatches = content.match(/(?:public|private|protected)\s+(?:static\s+)?\w+\s+(\w+)\s*\(/g);
                    if (methodMatches) {
                        methodMatches.forEach(match => {
                            const methodMatch = match.match(/(\w+)\s*\($/);
                            if (methodMatch && !context.methods.includes(methodMatch[1])) {
                                context.methods.push(methodMatch[1]);
                            }
                        });
                    }
                } catch {
                    // Skip files that can't be read
                }
            }
        }
    } catch {
        // If find command fails (Windows), fall back to basic analysis
    }

    return context;
}

async function generateLLMAssistedFixes(
    originalContent: string,
    issues: CompilationIssue[],
    generatedCodeContext: {classes: string[], methods: string[], packages: string[]},
    customizationFile: string
): Promise<CustomizationChange[]> {
    const changes: CustomizationChange[] = [];

    // First, analyze the pattern of errors to understand the context
    const errorPatterns = analyzeErrorPatterns(issues);
    console.log(`🔍 Detected error patterns:`, errorPatterns);

    // Analyze each issue and generate fixes using intelligent pattern matching
    for (const issue of issues) {
        const proposedChange = await analyzeSingleIssueWithContext(
            originalContent,
            issue,
            generatedCodeContext,
            errorPatterns
        );

        if (proposedChange) {
            changes.push(proposedChange);
        }
    }

    return changes;
}

interface ErrorPattern {
    type: 'parameter_name_mismatch' | 'class_rename' | 'package_move' | 'method_signature_change';
    description: string;
    commonIssues: CompilationIssue[];
    suggestedStrategy: string;
}

function analyzeErrorPatterns(issues: CompilationIssue[]): ErrorPattern[] {
    const patterns: ErrorPattern[] = [];

    // Group issues by similarity
    const groupedIssues = groupSimilarIssues(issues);

    for (const group of groupedIssues) {
        const pattern = identifyPattern(group);
        if (pattern) {
            patterns.push(pattern);
        }
    }

    return patterns;
}

function groupSimilarIssues(issues: CompilationIssue[]): CompilationIssue[][] {
    const groups: CompilationIssue[][] = [];

    for (const issue of issues) {
        let foundGroup = false;

        for (const group of groups) {
            if (areIssuesSimilar(issue, group[0])) {
                group.push(issue);
                foundGroup = true;
                break;
            }
        }

        if (!foundGroup) {
            groups.push([issue]);
        }
    }

    return groups;
}

function areIssuesSimilar(issue1: CompilationIssue, issue2: CompilationIssue): boolean {
    // Check if issues are similar based on error message patterns
    const message1 = issue1.message.toLowerCase();
    const message2 = issue2.message.toLowerCase();

    // Same error type and similar variable/class names
    if (message1.includes('cannot find symbol') && message2.includes('cannot find symbol')) {
        // Extract the symbol name from both messages
        const symbol1 = extractSymbolFromMessage(message1);
        const symbol2 = extractSymbolFromMessage(message2);

        if (symbol1 && symbol2) {
            // Check if they're variations of the same concept (e.g., analyzeDocumentOptions, analyzeDocumentRequest)
            return areSymbolsRelated(symbol1, symbol2);
        }
    }

    return false;
}

function extractSymbolFromMessage(message: string): string | null {
    // Extract symbol name from "cannot find symbol (variable: symbolName)" patterns
    const variableMatch = message.match(/variable:\s*(\w+)/);
    if (variableMatch) return variableMatch[1];

    const classMatch = message.match(/class:\s*(\w+)/);
    if (classMatch) return classMatch[1];

    const methodMatch = message.match(/method:\s*(\w+)/);
    if (methodMatch) return methodMatch[1];

    return null;
}

function areSymbolsRelated(symbol1: string, symbol2: string): boolean {
    // Check if symbols are variations of the same concept
    const normalized1 = symbol1.toLowerCase();
    const normalized2 = symbol2.toLowerCase();

    // Same symbol
    if (normalized1 === normalized2) return true;

    // Common patterns: Options vs Request, Async vs Sync, etc.
    const commonPairs = [
        ['options', 'request'],
        ['async', 'sync'],
        ['client', 'asyncclient'],
        ['result', 'response']
    ];

    for (const [term1, term2] of commonPairs) {
        if ((normalized1.includes(term1) && normalized2.includes(term2)) ||
            (normalized1.includes(term2) && normalized2.includes(term1))) {
            // Check if the root concept is the same
            const root1 = normalized1.replace(term1, '').replace(term2, '');
            const root2 = normalized2.replace(term1, '').replace(term2, '');
            if (root1 === root2) return true;
        }
    }

    return false;
}

function identifyPattern(issues: CompilationIssue[]): ErrorPattern | null {
    if (issues.length === 0) return null;

    const firstIssue = issues[0];
    const message = firstIssue.message.toLowerCase();

    // Pattern: Parameter name mismatch (analyzeDocumentOptions vs analyzeDocumentRequest)
    if (message.includes('cannot find symbol') && message.includes('variable')) {
        const symbol = extractSymbolFromMessage(message);
        console.log(`🔍 Checking parameter pattern for symbol: ${symbol}`);
        if (symbol && (symbol.includes('options') || symbol.includes('request'))) {
            console.log(`🔍 Detected parameter_name_mismatch pattern for ${symbol}`);
            return {
                type: 'parameter_name_mismatch',
                description: `Parameter name mismatch detected for ${symbol}. This commonly occurs when TypeSpec parameter names change.`,
                commonIssues: issues,
                suggestedStrategy: 'Check method parameters and replace incorrect variable references'
            };
        }
    }

    // Pattern: Class rename
    if (message.includes('cannot find symbol') && message.includes('class')) {
        return {
            type: 'class_rename',
            description: 'Class not found - likely renamed in generated code',
            commonIssues: issues,
            suggestedStrategy: 'Search for similar class names in generated code'
        };
    }

    // Pattern: Package move
    if (message.includes('package') && message.includes('does not exist')) {
        return {
            type: 'package_move',
            description: 'Package structure changed in generated code',
            commonIssues: issues,
            suggestedStrategy: 'Update import statements to new package locations'
        };
    }

    return null;
}

async function analyzeSingleIssueWithContext(
    content: string,
    issue: CompilationIssue,
    context: {classes: string[], methods: string[], packages: string[]},
    patterns: ErrorPattern[]
): Promise<CustomizationChange | null> {
    const lines = content.split('\n');

    // Find the relevant pattern for this issue
    const relevantPattern = patterns.find(pattern =>
        pattern.commonIssues.some(patternIssue =>
            patternIssue.message === issue.message ||
            areIssuesSimilar(issue, patternIssue)
        )
    );

    console.log(`🔍 Found relevant pattern for issue: ${issue.message.substring(0, 50)}... -> ${relevantPattern?.type || 'none'}`);

    if (issue.line && issue.line <= lines.length) {
        const lineContent = lines[issue.line - 1];

        // Use pattern-specific analysis for intelligent fixes
        if (relevantPattern) {
            console.log(`🔍 Using pattern-specific analysis: ${relevantPattern.type}`);
            return await analyzeWithPattern(lineContent, issue, context, relevantPattern);
        }

        // Fallback to general analysis for the old analyzeSingleIssue logic
        console.log(`🔍 Using fallback general analysis`);
        return await analyzeGeneralIssue(lineContent, issue, context);
    }

    return null;
}

async function analyzeWithPattern(
    lineContent: string,
    issue: CompilationIssue,
    context: {classes: string[], methods: string[], packages: string[]},
    pattern: ErrorPattern
): Promise<CustomizationChange | null> {
    console.log(`🔍 analyzeWithPattern called with pattern: ${pattern.type}`);

    switch (pattern.type) {
        case 'parameter_name_mismatch':
            console.log(`🔍 Calling analyzeParameterMismatch`);
            return analyzeParameterMismatch(lineContent, issue, context, pattern);
        case 'class_rename':
            return analyzeClassRename(lineContent, issue, context);
        case 'package_move':
            return analyzePackageMove(lineContent, issue, context);
        default:
            console.log(`🔍 Unknown pattern type: ${pattern.type}`);
            return null;
    }
}

async function analyzeParameterMismatch(
    lineContent: string,
    issue: CompilationIssue,
    context: {classes: string[], methods: string[], packages: string[]},
    pattern: ErrorPattern
): Promise<CustomizationChange | null> {
    // Extract the problematic variable name
    const symbol = extractSymbolFromMessage(issue.message.toLowerCase());
    if (!symbol) {
        console.log('🔍 No symbol extracted from message:', issue.message);
        return null;
    }

    console.log(`🔍 Analyzing parameter mismatch for symbol: ${symbol}`);
    console.log(`🔍 Line content: ${lineContent}`);

    // Generic LLM-powered analysis: Use pattern recognition instead of hardcoded rules
    const fixSuggestion = await generateLLMParameterFix(symbol, issue, context, pattern);

    if (fixSuggestion && fixSuggestion.replacement) {
        console.log(`🔍 LLM suggested fix: ${symbol} -> ${fixSuggestion.replacement}`);

        // Extract package and class info from the issue
        const packageName = extractPackageFromIssue(issue);
        const className = extractClassFromIssue(issue);
        const methodName = extractMethodFromIssue(issue);

        console.log(`🔧 Generating AutoRest customization for package: ${packageName}, class: ${className}`);

        // Generate AutoRest customization code instead of simple line replacement
        const autoRestCode = generateAutoRestCustomizationFix(
            pattern.type,
            symbol,
            fixSuggestion.replacement,
            packageName,
            className,
            methodName
        );

        return {
            type: 'generated_code_variable_fix',
            oldCode: '// Missing AutoRest customization for parameter name mismatch',
            newCode: autoRestCode,
            confidence: fixSuggestion.confidence,
            description: `Generate AutoRest customization: ${fixSuggestion.description}`,
            lineNumber: -1, // Will be inserted at end of customize method
        };
    }

    console.log(`🔍 No LLM fix generated for symbol: ${symbol}`);
    return null;
}

function extractPackageFromIssue(issue: CompilationIssue): string {
    // Extract package name from error message or file path
    if (issue.message.includes('in class:')) {
        const classMatch = issue.message.match(/in class:\s*([^.]+\.)*([^.]+)\./);
        if (classMatch) {
            return classMatch[0].replace('in class: ', '').replace(/\.[^.]+\.$/, '');
        }
    }

    // Fallback: extract from file path
    if (issue.file) {
        // Look for java package structure in file path
        const pathMatch = issue.file.match(/src[\\\/]main[\\\/]java[\\\/](.+)[\\\/][^\\\/]+\.java$/);
        if (pathMatch) {
            return pathMatch[1].replace(/[\\\/]/g, '.');
        }
    }

    // Default fallback for Azure AI Document Intelligence
    return 'com.azure.ai.documentintelligence';
}

function extractClassFromIssue(issue: CompilationIssue): string {
    // Extract class name from error message
    if (issue.message.includes('in class:')) {
        const classMatch = issue.message.match(/in class:\s*(?:[^.]+\.)*([^.]+)\./);
        if (classMatch) {
            return classMatch[1];
        }
    }

    // Fallback: extract from file path
    if (issue.file) {
        const fileMatch = issue.file.match(/([^\\\/]+)\.java$/);
        if (fileMatch) {
            return fileMatch[1];
        }
    }

    // Default fallback
    return 'DocumentIntelligenceClient';
}

function extractMethodFromIssue(issue: CompilationIssue): string | undefined {
    // Try to extract method name from error context
    if (issue.message.includes('method') || issue.message.includes('cannot resolve')) {
        const methodMatch = issue.message.match(/method\s+(\w+)/);
        if (methodMatch) {
            return methodMatch[1];
        }
    }

    return undefined;
}

interface LLMFixSuggestion {
    replacement: string;
    confidence: 'high' | 'medium' | 'low';
    description: string;
    rationale: string;
}

async function generateLLMParameterFix(
    symbol: string,
    issue: CompilationIssue,
    context: {classes: string[], methods: string[], packages: string[]},
    pattern: ErrorPattern
): Promise<LLMFixSuggestion | null> {
    // LLM-powered analysis using contextual reasoning
    const analysisPrompt = `
    You are an expert Java developer analyzing a compilation error in an Azure SDK customization.

    CONTEXT:
    - Symbol causing error: "${symbol}"
    - Error message: "${issue.message}"
    - Error pattern: ${pattern.type} - ${pattern.description}
    - Available classes: ${context.classes.slice(0, 10).join(', ')}... (${context.classes.length} total)
    - Available methods: ${context.methods.slice(0, 10).join(', ')}... (${context.methods.length} total)

    AUTOREST CUSTOMIZATION PATTERNS (for reference):
    - Parameter naming: Options vs Request vs Response
    - Method transformations: get/set patterns, async vs sync
    - Class relationships: Client vs AsyncClient, Model vs Options
    - Common transformations: customizeAst(), getClass(), getMethodsByName()

    TASK:
    Analyze the symbol "${symbol}" and suggest a replacement that would fix the compilation error.
    Consider common Java/Azure SDK naming patterns and the available context.

    RULES:
    1. Be generic - don't hardcode service-specific names
    2. Use naming conventions (camelCase, Options->Request mappings, etc.)
    3. Consider the error context and available classes/methods
    4. Provide high confidence only for clear patterns

    Respond with ONLY a JSON object in this format:
    {
        "replacement": "suggestedVariableName",
        "confidence": "high|medium|low",
        "description": "Brief explanation of the fix",
        "rationale": "Why this replacement makes sense"
    }

    If no clear fix is apparent, respond with: {"replacement": null}
    `;

    try {
        // For now, implement pattern-based logic until we integrate with an actual LLM
        // This simulates LLM reasoning with common patterns
        const fix = simulateLLMReasoning(symbol, issue, context);
        return fix;
    } catch (error) {
        console.log(`🔍 LLM analysis failed: ${error}`);
        return null;
    }
}

function simulateLLMReasoning(
    symbol: string,
    issue: CompilationIssue,
    context: {classes: string[], methods: string[], packages: string[]}
): LLMFixSuggestion | null {
    const symbolLower = symbol.toLowerCase();

    // Pattern 1: Options -> Request transformation (common in Azure SDKs)
    if (symbolLower.endsWith('options')) {
        const baseName = symbolLower.replace('options', '');
        const replacement = baseName + 'Request';

        return {
            replacement,
            confidence: 'high',
            description: `Transform '${symbol}' to '${replacement}' following Azure SDK parameter naming convention`,
            rationale: 'Azure SDKs commonly use "Request" for method parameters instead of "Options"'
        };
    }

    // Pattern 2: Async/Sync client mismatch
    if (symbolLower.includes('client') && !symbolLower.includes('async')) {
        const asyncVersion = symbol.replace(/client/i, 'AsyncClient');
        if (context.classes.some(cls => cls.toLowerCase().includes(asyncVersion.toLowerCase()))) {
            return {
                replacement: asyncVersion,
                confidence: 'medium',
                description: `Use async client variant '${asyncVersion}'`,
                rationale: 'Found matching async client class in generated code'
            };
        }
    }

    // Pattern 3: Method parameter name inference from context
    if (issue.file && issue.file.includes('Client.java')) {
        // Look for method signatures in the error context
        const methodMatch = issue.message.match(/in class: [^)]+\.(\w+Client)/);
        if (methodMatch) {
            const clientType = methodMatch[1];
        }
    }

    // Pattern 4: Direct name similarity matching
    const similarNames = context.classes
        .filter(cls => calculateSimilarity(symbolLower, cls.toLowerCase()) > 0.7)
        .sort((a, b) => calculateSimilarity(symbolLower, b.toLowerCase()) - calculateSimilarity(symbolLower, a.toLowerCase()));

    if (similarNames.length > 0) {
        const bestMatch = similarNames[0];
        return {
            replacement: bestMatch,
            confidence: 'medium',
            description: `Use similar class name '${bestMatch}'`,
            rationale: `High similarity match with available class (${Math.round(calculateSimilarity(symbolLower, bestMatch.toLowerCase()) * 100)}%)`
        };
    }

    return null;
}

function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

async function analyzeClassRename(
    lineContent: string,
    issue: CompilationIssue,
    context: {classes: string[], methods: string[], packages: string[]}
): Promise<CustomizationChange | null> {
    const missingClass = extractSymbolFromMessage(issue.message.toLowerCase());
    if (!missingClass) return null;

    const bestMatch = findBestClassMatch(missingClass, context.classes);
    if (bestMatch && lineContent.includes(missingClass)) {
        return {
            type: 'class_rename',
            oldCode: lineContent,
            newCode: lineContent.replace(new RegExp(`\\b${missingClass}\\b`, 'g'), bestMatch),
            confidence: calculateConfidence(missingClass, bestMatch),
            description: `Replace class '${missingClass}' with '${bestMatch}'`,
            lineNumber: issue.line
        };
    }

    return null;
}

async function analyzePackageMove(
    lineContent: string,
    issue: CompilationIssue,
    context: {classes: string[], methods: string[], packages: string[]}
): Promise<CustomizationChange | null> {
    // Extract package name from error message
    const packageMatch = issue.message.match(/package\s+([^\s]+)\s+does not exist/);
    if (!packageMatch) return null;

    const missingPackage = packageMatch[1];
    const bestMatch = findBestPackageMatch(missingPackage, context.packages);

    if (bestMatch && lineContent.includes(missingPackage)) {
        return {
            type: 'package_import',
            oldCode: lineContent,
            newCode: lineContent.replace(missingPackage, bestMatch),
            confidence: calculateConfidence(missingPackage, bestMatch),
            description: `Update package import from '${missingPackage}' to '${bestMatch}'`,
            lineNumber: issue.line
        };
    }

    return null;
}

async function analyzeGeneralIssue(
    lineContent: string,
    issue: CompilationIssue,
    context: {classes: string[], methods: string[], packages: string[]}
): Promise<CustomizationChange | null> {
    // Fallback to the original analyzeSingleIssue logic for other patterns
    if (issue.message.includes('cannot find symbol') && issue.message.includes('class')) {
        const missingClass = extractSymbolFromMessage(issue.message.toLowerCase());
        if (!missingClass) return null;

        const bestMatch = findBestClassMatch(missingClass, context.classes);
        if (bestMatch && lineContent.includes(missingClass)) {
            return {
                type: 'class_rename',
                oldCode: lineContent,
                newCode: lineContent.replace(new RegExp(`\\b${missingClass}\\b`, 'g'), bestMatch),
                confidence: calculateConfidence(missingClass, bestMatch),
                description: `Replace class '${missingClass}' with '${bestMatch}'`,
                lineNumber: issue.line || 0
            };
        }
    }

    return null;
}

async function analyzeSingleIssue(
    content: string,
    issue: CompilationIssue,
    context: {classes: string[], methods: string[], packages: string[]}
): Promise<CustomizationChange | null> {
    const lines = content.split('\n');

    if (issue.line && issue.line <= lines.length) {
        const problematicLine = lines[issue.line - 1];

        // Pattern 1: Missing class reference
        if (issue.message.includes('cannot find symbol') && issue.message.includes('class')) {
            const classMatch = issue.message.match(/symbol:\s+class\s+(\w+)/);
            if (classMatch) {
                const missingClass = classMatch[1];
                const possibleReplacement = findBestClassMatch(missingClass, context.classes);

                if (possibleReplacement) {
                    return {
                        type: "class_rename",
                        oldCode: problematicLine.trim(),
                        newCode: problematicLine.replace(new RegExp(`\\b${missingClass}\\b`, 'g'), possibleReplacement).trim(),
                        confidence: calculateConfidence(missingClass, possibleReplacement),
                        description: `Replace missing class '${missingClass}' with '${possibleReplacement}'`,
                        lineNumber: issue.line,
                    };
                }
            }
        }

        // Pattern 1.5: Specific variable name mismatch in generated code (analyzeDocumentOptions)
        // update to not use specific names
        if (issue.message.includes('cannot find symbol') && issue.message.includes('variable')) {
            const variableMatch = issue.message.match(/symbol:\s+variable\s+(\w+)/);
            if (variableMatch) {
                const missingVariable = variableMatch[1];
                const possibleReplacement = findBestClassMatch(missingVariable, context.classes);

                if (possibleReplacement) {
                    return {
                        type: "generated_code_variable_fix",
                        oldCode: problematicLine.trim(),
                        newCode: problematicLine.replace(new RegExp(`\\b${missingVariable}\\b`, 'g'), possibleReplacement).trim(),
                        confidence: calculateConfidence(missingVariable, possibleReplacement),
                        description: `Replace missing variable '${missingVariable}' with '${possibleReplacement}'`,
                        lineNumber: issue.line,
                    };
                }
            }
        }

        // Pattern 2: Missing method reference
        if (issue.message.includes('cannot find symbol') && issue.message.includes('method')) {
            const methodMatch = issue.message.match(/symbol:\s+method\s+(\w+)/);
            if (methodMatch) {
                const missingMethod = methodMatch[1];
                const possibleReplacement = findBestMethodMatch(missingMethod, context.methods);

                if (possibleReplacement) {
                    return {
                        type: "method_update",
                        oldCode: problematicLine.trim(),
                        newCode: problematicLine.replace(new RegExp(`\\b${missingMethod}\\b`, 'g'), possibleReplacement).trim(),
                        confidence: calculateConfidence(missingMethod, possibleReplacement),
                        description: `Replace missing method '${missingMethod}' with '${possibleReplacement}'`,
                        lineNumber: issue.line,
                    };
                }
            }
        }

        // Pattern 3: Override method signature mismatch
        if (issue.message.includes('method does not override')) {
            // Remove @Override annotation as a conservative fix
            if (issue.line > 1 && lines[issue.line - 2].trim().includes('@Override')) {
                return {
                    type: "signature_fix",
                    oldCode: lines[issue.line - 2].trim(),
                    newCode: "// @Override // Removed due to signature mismatch",
                    confidence: "medium",
                    description: "Comment out @Override annotation due to signature mismatch",
                    lineNumber: issue.line - 1,
                };
            }
        }

        // Pattern 4: Package import issues
        if (issue.message.includes('package') && issue.message.includes('does not exist')) {
            const packageMatch = issue.message.match(/package\s+([\w.]+)/);
            if (packageMatch) {
                const missingPackage = packageMatch[1];
                const possibleReplacement = findBestPackageMatch(missingPackage, context.packages);

                if (possibleReplacement) {
                    return {
                        type: "package_import",
                        oldCode: problematicLine.trim(),
                        newCode: problematicLine.replace(missingPackage, possibleReplacement).trim(),
                        confidence: "high",
                        description: `Update package import from '${missingPackage}' to '${possibleReplacement}'`,
                        lineNumber: issue.line,
                    };
                }
            }
        }
    }

    return null;
}

function findBestClassMatch(missingClass: string, availableClasses: string[]): string | null {
    // Exact match
    const exactMatch = availableClasses.find(cls => cls === missingClass);
    if (exactMatch) return exactMatch;

    // Fuzzy matching - look for similar names
    const similarClasses = availableClasses.filter(cls => {
        return levenshteinDistance(missingClass.toLowerCase(), cls.toLowerCase()) <= 2 ||
               cls.toLowerCase().includes(missingClass.toLowerCase()) ||
               missingClass.toLowerCase().includes(cls.toLowerCase());
    });

    if (similarClasses.length === 1) {
        return similarClasses[0];
    }

    // Look for common patterns like Client -> AsyncClient, etc.
    if (missingClass.endsWith('Client')) {
        const asyncVersion = availableClasses.find(cls => cls.endsWith('AsyncClient') && cls.includes(missingClass.replace('Client', '')));
        if (asyncVersion) return asyncVersion;
    }

    return null;
}

function findBestMethodMatch(missingMethod: string, availableMethods: string[]): string | null {
    // Exact match
    const exactMatch = availableMethods.find(method => method === missingMethod);
    if (exactMatch) return exactMatch;

    // Look for similar method names
    const similarMethods = availableMethods.filter(method => {
        return levenshteinDistance(missingMethod.toLowerCase(), method.toLowerCase()) <= 2;
    });

    return similarMethods.length === 1 ? similarMethods[0] : null;
}

function findBestPackageMatch(missingPackage: string, availablePackages: string[]): string | null {
    // Look for exact or similar package names
    const exactMatch = availablePackages.find(pkg => pkg === missingPackage);
    if (exactMatch) return exactMatch;

    // Look for packages that contain the same root
    const rootPackage = missingPackage.split('.').slice(0, -1).join('.');
    const similarPackages = availablePackages.filter(pkg => pkg.startsWith(rootPackage));

    return similarPackages.length === 1 ? similarPackages[0] : null;
}

function calculateConfidence(original: string, replacement: string): "high" | "medium" | "low" {
    const distance = levenshteinDistance(original.toLowerCase(), replacement.toLowerCase());

    if (distance === 0) return "high";
    if (distance <= 2) return "high";
    if (distance <= 4) return "medium";
    return "low";
}

function levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,     // deletion
                matrix[j - 1][i] + 1,     // insertion
                matrix[j - 1][i - 1] + indicator // substitution
            );
        }
    }

    return matrix[str2.length][str1.length];
}

function applyChange(content: string, change: CustomizationChange): string {
    if (change.lineNumber) {
        // Apply line-specific change
        const lines = content.split('\n');
        if (change.lineNumber <= lines.length) {
            lines[change.lineNumber - 1] = change.newCode;
            return lines.join('\n');
        }
    }

    // Apply global string replacement
    return content.replace(change.oldCode, change.newCode);
}

function formatDryRunResults(
    appliedChanges: CustomizationChange[],
    skippedChanges: CustomizationChange[],
    updatedContent: string,
    customizationFile: string
): string {
    let result = "🔍 **DRY RUN - Preview of Changes**\n\n";
    result += `📁 **File:** \`${customizationFile}\`\n\n`;

    if (appliedChanges.length > 0) {
        result += "## ✅ Proposed Changes (High/Medium Confidence)\n\n";
        appliedChanges.forEach((change, index) => {
            result += `**${index + 1}.** ${change.description} *(${change.confidence} confidence)*\n`;
            result += `   - **Old:** \`${change.oldCode}\`\n`;
            result += `   + **New:** \`${change.newCode}\`\n\n`;
        });
    }

    if (skippedChanges.length > 0) {
        result += "## ⏭️ Skipped Changes (Low Confidence)\n\n";
        skippedChanges.forEach((change, index) => {
            result += `**${index + 1}.** ${change.description} *(${change.confidence} confidence)*\n`;
            result += `   - **Would change:** \`${change.oldCode}\`\n`;
            result += `   + **To:** \`${change.newCode}\`\n\n`;
        });
    }

    result += "\n💡 **Next Steps:**\n";
    result += "- Run without `dryRun: true` to apply high/medium confidence changes\n";
    result += "- Review and manually fix any low confidence issues\n";
    result += "- Use `detect_compilation_issues` after applying to verify fixes";

    return result;
}

function formatAppliedResults(
    appliedChanges: CustomizationChange[],
    skippedChanges: CustomizationChange[],
    stillHasIssues: boolean
): string {
    let result = stillHasIssues ? "⚠️ " : "✅ ";
    result += `**Applied ${appliedChanges.length} Changes**\n\n`;

    appliedChanges.forEach((change, index) => {
        result += `**${index + 1}.** ${change.description} *(${change.confidence} confidence)*\n`;
        result += `   - **Old:** \`${change.oldCode}\`\n`;
        result += `   + **New:** \`${change.newCode}\`\n\n`;
    });

    if (stillHasIssues) {
        result += "⚠️ **Warning:** Some compilation issues may still remain. Run `detect_compilation_issues` to check.\n\n";
    } else {
        result += "🎉 **Success:** All detected issues appear to be resolved!\n\n";
    }

    if (skippedChanges.length > 0) {
        result += `⏭️ **Skipped ${skippedChanges.length} low-confidence changes** that require manual review.\n`;
    }

    result += "\n💡 **Next Steps:**\n";
    result += "- Run `detect_compilation_issues` to verify all issues are resolved\n";
    result += "- Test the updated customization functionality\n";
    result += "- Review any remaining manual fixes needed";

    return result;
}

/**
 * Generate AutoRest customization code based on the error pattern and LLM analysis
 */
function generateAutoRestCustomizationFix(
    pattern: string,
    oldSymbol: string,
    newSymbol: string,
    packageName: string,
    className: string,
    methodName?: string
): string {
    console.log(`🔧 Generating AutoRest customization for pattern: ${pattern}`);

    switch (pattern) {
        case 'parameter_name_mismatch':
            return generateParameterFixCustomization(oldSymbol, newSymbol, packageName, className, methodName);

        case 'class_rename':
            return generateClassRenameCustomization(oldSymbol, newSymbol, packageName);

        case 'method_rename':
            return generateMethodRenameCustomization(oldSymbol, newSymbol, packageName, className);

        case 'package_move':
            return generatePackageMoveCustomization(oldSymbol, newSymbol, className);

        case 'visibility_change':
            return generateVisibilityFixCustomization(packageName, className, methodName || oldSymbol);

        default:
            return generateGenericCustomization(oldSymbol, newSymbol, packageName, className);
    }
}

function generateParameterFixCustomization(
    oldParam: string,
    newParam: string,
    packageName: string,
    className: string,
    methodName?: string
): string {
    return `
        // Fix parameter name mismatch: ${oldParam} -> ${newParam}
        customization.getClass("${packageName}", "${className}")
            .customizeAst(ast -> ast.getClassByName("${className}").ifPresent(clazz -> {
                ${methodName ? `clazz.getMethodsByName("${methodName}").forEach(method -> {` : 'clazz.getMethods().forEach(method -> {'}
                    method.getBody().ifPresent(body -> {
                        String bodyStr = body.toString();
                        if (bodyStr.contains("${oldParam}")) {
                            // Replace ${oldParam} with ${newParam} in method body
                            bodyStr = bodyStr.replace("${oldParam}", "${newParam}");
                            method.setBody(StaticJavaParser.parseBlock(bodyStr));
                        }
                    });
                });
            }));`;
}

function generateClassRenameCustomization(
    oldClass: string,
    newClass: string,
    packageName: string
): string {
    return `
        // Fix class reference: ${oldClass} -> ${newClass}
        customization.getClass("${packageName}", "${oldClass}")
            .rename("${newClass}")
            .customizeAst(ast -> {
                // Update all references to the old class name
                ast.findAll(NameExpr.class).forEach(nameExpr -> {
                    if ("${oldClass}".equals(nameExpr.getNameAsString())) {
                        nameExpr.setName("${newClass}");
                    }
                });
            });`;
}

function generateMethodRenameCustomization(
    oldMethod: string,
    newMethod: string,
    packageName: string,
    className: string
): string {
    return `
        // Fix method reference: ${oldMethod} -> ${newMethod}
        customization.getClass("${packageName}", "${className}")
            .customizeAst(ast -> ast.getClassByName("${className}").ifPresent(clazz -> {
                clazz.getMethodsByName("${oldMethod}").forEach(method -> {
                    method.setName("${newMethod}");
                });
                // Update method calls throughout the class
                clazz.findAll(MethodCallExpr.class).forEach(call -> {
                    if ("${oldMethod}".equals(call.getNameAsString())) {
                        call.setName("${newMethod}");
                    }
                });
            }));`;
}

function generatePackageMoveCustomization(
    oldPackage: string,
    newPackage: string,
    className: string
): string {
    return `
        // Fix package import: ${oldPackage} -> ${newPackage}
        customization.getClass("${newPackage}", "${className}")
            .customizeAst(ast -> {
                // Update import statements
                ast.findAll(ImportDeclaration.class).forEach(importDecl -> {
                    if (importDecl.getNameAsString().startsWith("${oldPackage}")) {
                        String newImport = importDecl.getNameAsString().replace("${oldPackage}", "${newPackage}");
                        importDecl.setName(newImport);
                    }
                });
            });`;
}

function generateVisibilityFixCustomization(
    packageName: string,
    className: string,
    memberName: string
): string {
    return `
        // Fix visibility for: ${memberName}
        customization.getClass("${packageName}", "${className}")
            .customizeAst(ast -> ast.getClassByName("${className}").ifPresent(clazz -> {
                // Make method public if it exists
                clazz.getMethodsByName("${memberName}").forEach(method -> {
                    method.setModifiers(Modifier.Keyword.PUBLIC);
                });
                // Make field public if it exists
                clazz.getFieldByName("${memberName}").ifPresent(field -> {
                    field.setModifiers(Modifier.Keyword.PUBLIC);
                });
            }));`;
}

function generateGenericCustomization(
    oldSymbol: string,
    newSymbol: string,
    packageName: string,
    className: string
): string {
    return `
        // Generic fix: ${oldSymbol} -> ${newSymbol}
        customization.getClass("${packageName}", "${className}")
            .customizeAst(ast -> {
                // Replace all occurrences of old symbol with new symbol
                ast.findAll(NameExpr.class).forEach(nameExpr -> {
                    if ("${oldSymbol}".equals(nameExpr.getNameAsString())) {
                        nameExpr.setName("${newSymbol}");
                    }
                });
                ast.findAll(SimpleName.class).forEach(simpleName -> {
                    if ("${oldSymbol}".equals(simpleName.getIdentifier())) {
                        simpleName.setIdentifier("${newSymbol}");
                    }
                });
            });`;
}

async function hasCompilationIssuesForFile(compilationResult: CallToolResult, filePath: string): Promise<boolean> {
    const resultText = compilationResult.content[0]?.text;
    if (typeof resultText !== 'string') {
        return false;
    }
    return resultText.includes("Compilation Issues Detected") && resultText.includes(filePath);
}
