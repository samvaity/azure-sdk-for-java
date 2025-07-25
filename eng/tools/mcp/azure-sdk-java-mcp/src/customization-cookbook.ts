/**
 * Customization Cookbook: Deterministic patterns for fixing common Java SDK customization issues
 * This provides guided examples and proven solutions for Azure SDK customization updates
 */

export interface CustomizationPattern {
    name: string;
    description: string;
    errorSignatures: string[];
    solution: {
        template: string;
        placeholders: Record<string, string>;
        confidence: 'high' | 'medium' | 'low';
    };
    examples: Array<{
        before: string;
        after: string;
        context: string;
    }>;
}

export const CUSTOMIZATION_COOKBOOK: CustomizationPattern[] = [
    {
        name: "generic_options_to_request_pattern",
        description: "TypeSpec generic pattern: *Options → *Request (variables, classes, parameters)",
        errorSignatures: [
            "cannot find symbol.*variable.*Options",
            "cannot find symbol.*class.*Options",
            "cannot find symbol.*method.*Options"
        ],
        solution: {
            template: `
        // LEARNED PATTERN: {oldSymbol} -> {newSymbol} (detected from compilation error)
        customization.getClass("{packageName}", "{className}")
            .customizeAst(ast -> {
                ast.getClassByName("{className}").ifPresent(clazz -> {
                    // Replace in method bodies
                    clazz.getMethods().forEach(method -> {
                        method.getBody().ifPresent(body -> {
                            String bodyStr = body.toString();
                            if (bodyStr.contains("{oldSymbol}")) {
                                bodyStr = bodyStr.replace("{oldSymbol}", "{newSymbol}");
                                method.setBody(StaticJavaParser.parseBlock(bodyStr));
                            }
                        });
                    });
                    
                    // Replace in variable declarations
                    ast.findAll(VariableDeclarator.class).forEach(var -> {
                        if ("{oldSymbol}".equals(var.getNameAsString())) {
                            var.setName("{newSymbol}");
                        }
                    });
                    
                    // Replace in type references
                    ast.findAll(ClassOrInterfaceType.class).forEach(type -> {
                        if ("{oldSymbol}".equals(type.getNameAsString())) {
                            type.setName("{newSymbol}");
                        }
                    });
                });
            });`,
            placeholders: {
                "oldSymbol": "Extracted from Maven error (e.g., analyzeDocumentOptions, AnalyzeDocumentOptions)",
                "newSymbol": "Intelligently inferred replacement (Options→Request pattern)",
                "packageName": "Extracted from error file path",
                "className": "Extracted from error file path"
            },
            confidence: 'high'
        },
        examples: [
            {
                before: "analyzeDocumentOptions.getPages()",
                after: "analyzeDocumentRequest.getPages()",
                context: "Variable reference in method body"
            },
            {
                before: "AnalyzeDocumentOptions options = new AnalyzeDocumentOptions()",
                after: "AnalyzeDocumentRequest request = new AnalyzeDocumentRequest()",
                context: "Class instantiation"
            },
            {
                before: "analyzeBatchDocumentOptions.setModelId()",
                after: "analyzeBatchDocumentRequest.setModelId()",
                context: "Method chaining"
            }
        ]
    },
    {
        name: "class_not_found_rename",
        description: "Generated class renamed in new TypeSpec version",
        errorSignatures: [
            "cannot find symbol (class: .*)",
            "package .* does not exist"
        ],
        solution: {
            template: `
        // Fix class reference: {oldClass} -> {newClass}
        customization.getClass("{packageName}", "{targetClass}")
            .customizeAst(ast -> {
                // Update all references to the old class name
                ast.findAll(NameExpr.class).forEach(nameExpr -> {
                    if ("{oldClass}".equals(nameExpr.getNameAsString())) {
                        nameExpr.setName("{newClass}");
                    }
                });
                ast.findAll(ClassOrInterfaceType.class).forEach(classType -> {
                    if ("{oldClass}".equals(classType.getNameAsString())) {
                        classType.setName("{newClass}");
                    }
                });
            });`,
            placeholders: {
                "oldClass": "The missing class name",
                "newClass": "The replacement class name",
                "packageName": "Target package name",
                "targetClass": "Class being customized"
            },
            confidence: 'medium'
        },
        examples: [
            {
                before: "AnalyzeDocumentOptions options = new AnalyzeDocumentOptions();",
                after: "AnalyzeDocumentRequest request = new AnalyzeDocumentRequest();",
                context: "Class rename in Document Intelligence SDK"
            }
        ]
    },
    {
        name: "method_signature_change",
        description: "Method signature changed in generated code",
        errorSignatures: [
            "method does not override",
            "incompatible types",
            "cannot find symbol (method: .*)"
        ],
        solution: {
            template: `
        // Fix method signature: {oldMethod} -> {newMethod}
        customization.getClass("{packageName}", "{className}")
            .customizeAst(ast -> ast.getClassByName("{className}").ifPresent(clazz -> {
                clazz.getMethodsByName("{oldMethod}").forEach(method -> {
                    // Update method name and parameters if needed
                    method.setName("{newMethod}");
                    // Add parameter updates if signature changed
                    {parameterUpdates}
                });
            }));`,
            placeholders: {
                "oldMethod": "The old method name",
                "newMethod": "The new method name",
                "packageName": "Package name",
                "className": "Class name",
                "parameterUpdates": "Additional parameter type updates"
            },
            confidence: 'medium'
        },
        examples: [
            {
                before: "public void analyzeDocument(AnalyzeDocumentOptions options)",
                after: "public void analyzeDocument(AnalyzeDocumentRequest request)",
                context: "Method signature update in client"
            }
        ]
    },
    {
        name: "package_import_update",
        description: "Package structure changed requiring import updates",
        errorSignatures: [
            "package .* does not exist",
            "cannot find symbol.*package"
        ],
        solution: {
            template: `
        // Fix package import: {oldPackage} -> {newPackage}
        customization.getClass("{targetPackage}", "{className}")
            .customizeAst(ast -> {
                // Update import statements
                ast.findAll(ImportDeclaration.class).forEach(importDecl -> {
                    String importName = importDecl.getNameAsString();
                    if (importName.startsWith("{oldPackage}")) {
                        String newImport = importName.replace("{oldPackage}", "{newPackage}");
                        importDecl.setName(newImport);
                    }
                });
            });`,
            placeholders: {
                "oldPackage": "The old package path",
                "newPackage": "The new package path",
                "targetPackage": "Target class package",
                "className": "Target class name"
            },
            confidence: 'high'
        },
        examples: [
            {
                before: "import com.azure.ai.documentintelligence.models.old.AnalyzeOptions;",
                after: "import com.azure.ai.documentintelligence.models.AnalyzeRequest;",
                context: "Package restructuring in generated models"
            }
        ]
    }
];

/**
 * Match compilation error to cookbook patterns
 */
export function matchErrorToPattern(errorMessage: string, filePath: string): CustomizationPattern | null {
    const errorLower = errorMessage.toLowerCase();
    
    for (const pattern of CUSTOMIZATION_COOKBOOK) {
        for (const signature of pattern.errorSignatures) {
            const signatureLower = signature.toLowerCase();
            
            // Simple string matching for now - could be enhanced with regex
            if (errorLower.includes(signatureLower.replace('.*', '')) || 
                new RegExp(signature, 'i').test(errorMessage)) {
                return pattern;
            }
        }
    }
    
    return null;
}

/**
 * Extract context values for template placeholders with intelligent pattern learning
 */
export function extractContextFromError(errorMessage: string, filePath: string, pattern: CustomizationPattern): Record<string, string> {
    const context: Record<string, string> = {};
    
    // Extract package name from file path
    const packageMatch = filePath.match(/src[/\\]main[/\\]java[/\\](.*)[/\\]/);
    if (packageMatch) {
        context.packageName = packageMatch[1].replace(/[/\\]/g, '.');
    }
    
    // Extract class name from file path
    const classMatch = filePath.match(/([^/\\]+)\.java$/);
    if (classMatch) {
        context.className = classMatch[1];
    }
    
    // INTELLIGENT PATTERN LEARNING from Maven compilation errors
    if (pattern.name === 'generic_options_to_request_pattern') {
        // Extract the symbol that "cannot find"
        const symbolMatches = [
            errorMessage.match(/symbol:\s*variable:\s*(\w+)/),
            errorMessage.match(/symbol:\s*class:\s*(\w+)/),
            errorMessage.match(/symbol:\s*method:\s*(\w+)/),
            errorMessage.match(/cannot find symbol.*?(\w*Options\w*)/i)
        ];
        
        for (const match of symbolMatches) {
            if (match && match[1]) {
                const oldSymbol = match[1];
                context.oldSymbol = oldSymbol;
                
                // LEARNED TRANSFORMATION RULES from TypeSpec patterns:
                if (oldSymbol.includes('Options')) {
                    // Pattern 1: *Options -> *Request (most common)
                    context.newSymbol = oldSymbol.replace(/Options/g, 'Request');
                } else if (oldSymbol.includes('Option')) {
                    // Pattern 2: *Option -> *Request (singular)
                    context.newSymbol = oldSymbol.replace(/Option/g, 'Request');
                } else if (oldSymbol.endsWith('Opts')) {
                    // Pattern 3: *Opts -> *Request (abbreviated)
                    context.newSymbol = oldSymbol.replace(/Opts$/g, 'Request');
                } else {
                    // Fallback: try to infer from context
                    context.newSymbol = oldSymbol + 'Request';
                }
                
                console.log(`🧠 LEARNED PATTERN: ${context.oldSymbol} → ${context.newSymbol}`);
                break;
            }
        }
    }
    
    // Pattern-specific extractions for other patterns
    switch (pattern.name) {
        case 'class_not_found_rename':
            const classNotFoundMatch = errorMessage.match(/class:\s*(\w+)/);
            if (classNotFoundMatch) {
                context.oldClass = classNotFoundMatch[1];
                // Apply same transformation rules
                if (classNotFoundMatch[1].includes('Options')) {
                    context.newClass = classNotFoundMatch[1].replace(/Options/g, 'Request');
                }
            }
            break;
            
        case 'method_signature_change':
            const methodMatch = errorMessage.match(/method:\s*(\w+)/);
            if (methodMatch) {
                context.oldMethod = methodMatch[1];
                if (methodMatch[1].includes('Options')) {
                    context.newMethod = methodMatch[1].replace(/Options/g, 'Request');
                }
            }
            break;
    }
    
    return context;
}

/**
 * Generate customization code from pattern and context
 */
export function generateCustomizationFromPattern(pattern: CustomizationPattern, context: Record<string, string>): string {
    let code = pattern.solution.template;
    
    // Replace all placeholders with context values
    for (const [placeholder, value] of Object.entries(context)) {
        code = code.replace(new RegExp(`{${placeholder}}`, 'g'), value);
    }
    
    return code;
}

/**
 * Interactive feedback system for improving patterns with pattern learning
 */
export interface PatternFeedback {
    patternName: string;
    success: boolean;
    errorMessage?: string;
    suggestedImprovement?: string;
    userContext: Record<string, string>;
    learnedTransformation?: {
        oldSymbol: string;
        newSymbol: string;
        transformationType: 'Options→Request' | 'Option→Request' | 'Opts→Request' | 'Custom';
    };
}

export function recordPatternFeedback(feedback: PatternFeedback): void {
    // This could log to a file or database for pattern improvement
    console.log(`📝 Pattern feedback for ${feedback.patternName}:`, feedback);
    
    if (!feedback.success && feedback.suggestedImprovement) {
        console.log(`💡 Suggested improvement: ${feedback.suggestedImprovement}`);
    }
    
    // Learn from successful transformations
    if (feedback.success && feedback.learnedTransformation) {
        console.log(`🎓 LEARNED: ${feedback.learnedTransformation.oldSymbol} → ${feedback.learnedTransformation.newSymbol} (${feedback.learnedTransformation.transformationType})`);
        // Could save to a learning database here
    }
}

/**
 * Analyze Maven compilation errors to discover transformation patterns
 */
export function analyzeCompilationErrorsForPatterns(compilationErrors: string[]): Array<{
    pattern: string;
    confidence: number;
    examples: Array<{old: string, new: string}>;
}> {
    const patterns: Map<string, {count: number, examples: Array<{old: string, new: string}>}> = new Map();
    
    console.log(`🔍 Starting pattern analysis on ${compilationErrors.length} errors...`);
    
    for (const error of compilationErrors) {
        console.log(`  📋 Analyzing error: "${error.substring(0, 150)}..."`);
        
        // Look for symbol information in different formats
        let oldSymbol: string | null = null;
        
        // Pattern 1: "symbol: variable XXXX" (most detailed)
        let symbolMatch = error.match(/symbol:\s*variable\s+(\w+)/i);
        if (symbolMatch) {
            oldSymbol = symbolMatch[1];
            console.log(`    🎯 Found symbol (variable pattern): "${oldSymbol}"`);
        } else {
            // Pattern 2: "cannot find symbol: variable XXXX"
            symbolMatch = error.match(/cannot find symbol.*?variable\s+(\w+)/i);
            if (symbolMatch) {
                oldSymbol = symbolMatch[1];
                console.log(`    🎯 Found symbol (cannot find variable pattern): "${oldSymbol}"`);
            } else {
                // Pattern 3: Look for any "Options" words in the error
                symbolMatch = error.match(/(\w*Options\w*)/i);
                if (symbolMatch) {
                    oldSymbol = symbolMatch[1];
                    console.log(`    🎯 Found symbol (options pattern): "${oldSymbol}"`);
                } else {
                    console.log(`    ❌ No symbol match found in error`);
                }
            }
        }
        
        if (oldSymbol) {
            let newSymbol = '';
            
            // Detect transformation pattern
            if (oldSymbol.includes('Options')) {
                newSymbol = oldSymbol.replace(/Options/g, 'Request');
                console.log(`    ✅ Options→Request: ${oldSymbol} -> ${newSymbol}`);
            } else if (oldSymbol.includes('Option')) {
                newSymbol = oldSymbol.replace(/Option/g, 'Request');
                console.log(`    ✅ Option→Request: ${oldSymbol} -> ${newSymbol}`);
            } else {
                console.log(`    ❌ No recognized pattern for: ${oldSymbol}`);
            }
            
            if (newSymbol) {
                const patternKey = oldSymbol.includes('Options') ? 'Options→Request' : 'Option→Request';
                if (!patterns.has(patternKey)) {
                    patterns.set(patternKey, {count: 0, examples: []});
                }
                
                const pattern = patterns.get(patternKey)!;
                pattern.count++;
                pattern.examples.push({old: oldSymbol, new: newSymbol});
                console.log(`    📊 Pattern "${patternKey}" now has ${pattern.count} examples`);
            }
        }
    }
    
    console.log(`🎓 Final pattern analysis: Found ${patterns.size} unique patterns`);
    patterns.forEach((data, key) => {
        console.log(`  📋 ${key}: ${data.count} occurrences, ${data.examples.length} examples`);
        data.examples.slice(0, 3).forEach(ex => console.log(`    - ${ex.old} → ${ex.new}`));
    });
    
    // Convert to result format with confidence scores
    return Array.from(patterns.entries()).map(([pattern, data]) => ({
        pattern,
        confidence: Math.min(data.count / 10, 1.0), // Higher confidence with more examples
        examples: data.examples.slice(0, 5) // Top 5 examples
    }));
}

/**
 * Generate new cookbook patterns from learned transformations
 */
export function generateLearnedPattern(
    transformationType: string,
    examples: Array<{old: string, new: string}>,
    confidence: number
): CustomizationPattern {
    return {
        name: `learned_${transformationType.toLowerCase().replace('→', '_to_')}_pattern`,
        description: `Learned pattern: ${transformationType} transformation`,
        errorSignatures: [
            `cannot find symbol.*variable.*${transformationType.split('→')[0]}`,
            `cannot find symbol.*class.*${transformationType.split('→')[0]}`
        ],
        solution: {
            template: `
        // LEARNED PATTERN: {oldSymbol} -> {newSymbol} (${transformationType})
        customization.getClass("{packageName}", "{className}")
            .customizeAst(ast -> {
                ast.getClassByName("{className}").ifPresent(clazz -> {
                    // Apply learned transformation across all references
                    clazz.accept(new VoidVisitorAdapter<Void>() {
                        @Override
                        public void visit(NameExpr n, Void arg) {
                            if ("{oldSymbol}".equals(n.getNameAsString())) {
                                n.setName("{newSymbol}");
                            }
                            super.visit(n, arg);
                        }
                        
                        @Override
                        public void visit(ClassOrInterfaceType n, Void arg) {
                            if ("{oldSymbol}".equals(n.getNameAsString())) {
                                n.setName("{newSymbol}");
                            }
                            super.visit(n, arg);
                        }
                    }, null);
                });
            });`,
            placeholders: {
                "oldSymbol": `Original symbol with ${transformationType.split('→')[0]} pattern`,
                "newSymbol": `Transformed symbol with ${transformationType.split('→')[1]} pattern`,
                "packageName": "Target package",
                "className": "Target class"
            },
            confidence: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low'
        },
        examples: examples.map(ex => ({
            before: ex.old,
            after: ex.new,
            context: `Learned from compilation errors`
        }))
    };
}
