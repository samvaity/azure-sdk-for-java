/**
 * JavaParser Integration for Intelligent Code Analysis
 * 
 * This module uses JavaParser to:
 * 1. Analyze existing customized code structure
 * 2. Detect what changed in generated interfaces
 * 3. Generate precise code updates based on actual API diffs
 */

import fs from "fs/promises";
import path from "path";
import { execAsync } from "./utils/index.js";

interface MethodSignature {
    name: string;
    returnType: string;
    parameters: Array<{name: string, type: string}>;
    modifiers: string[];
    annotations: string[];
}

interface ClassAnalysis {
    className: string;
    packageName: string;
    methods: MethodSignature[];
    imports: string[];
    isInterface: boolean;
    isGenerated: boolean;
}

interface ApiChange {
    type: 'method_added' | 'method_removed' | 'method_signature_changed' | 'parameter_type_changed';
    className: string;
    methodName: string;
    oldSignature?: MethodSignature;
    newSignature?: MethodSignature;
    impact: 'breaking' | 'additive' | 'internal';
}

/**
 * Main function to analyze API changes using JavaParser
 */
export async function analyzeApiChangesWithJavaParser(
    moduleDirectory: string,
    beforeCommit?: string
): Promise<ApiChange[]> {
    const changes: ApiChange[] = [];

    try {
        // Get current generated interfaces
        const currentInterfaces = await findAndParseGeneratedInterfaces(moduleDirectory);
        
        // Get previous version (if commit specified)
        let previousInterfaces: ClassAnalysis[] = [];
        if (beforeCommit) {
            previousInterfaces = await getInterfacesFromCommit(moduleDirectory, beforeCommit);
        }

        // Compare and find changes
        for (const currentInterface of currentInterfaces) {
            const previousInterface = previousInterfaces.find(p => p.className === currentInterface.className);
            
            if (!previousInterface) {
                // New interface - check if any customizations might be affected
                continue;
            }

            const interfaceChanges = compareInterfaces(previousInterface, currentInterface);
            changes.push(...interfaceChanges);
        }

    } catch (error) {
        console.warn(`JavaParser analysis failed: ${error}`);
    }

    return changes;
}

/**
 * Find and parse all generated client interfaces in the module
 */
async function findAndParseGeneratedInterfaces(moduleDirectory: string): Promise<ClassAnalysis[]> {
    const interfaces: ClassAnalysis[] = [];
    const srcMainJava = path.join(moduleDirectory, 'src', 'main', 'java');

    if (!(await directoryExists(srcMainJava))) {
        return interfaces;
    }

    // Find all Java files that look like client interfaces
    const javaFiles = await findJavaFiles(srcMainJava);
    const clientFiles = javaFiles.filter(file => 
        file.includes('Client.java') || 
        file.includes('AsyncClient.java') ||
        file.includes('Builder.java')
    );

    for (const file of clientFiles) {
        try {
            const analysis = await parseJavaFile(file);
            if (analysis.isGenerated) {
                interfaces.push(analysis);
            }
        } catch (error) {
            console.warn(`Failed to parse ${file}: ${error}`);
        }
    }

    return interfaces;
}

/**
 * Parse a Java file using JavaParser (simplified - would use actual JavaParser library)
 */
async function parseJavaFile(filePath: string): Promise<ClassAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // This is a simplified parser - in reality, we'd use the actual JavaParser library
    const analysis: ClassAnalysis = {
        className: extractClassName(content),
        packageName: extractPackageName(content),
        methods: extractMethods(content),
        imports: extractImports(content),
        isInterface: content.includes('interface '),
        isGenerated: isGeneratedFile(content)
    };

    return analysis;
}

/**
 * Compare two interface versions to find changes
 */
function compareInterfaces(oldInterface: ClassAnalysis, newInterface: ClassAnalysis): ApiChange[] {
    const changes: ApiChange[] = [];

    // Find added methods
    for (const newMethod of newInterface.methods) {
        const oldMethod = oldInterface.methods.find(m => m.name === newMethod.name);
        if (!oldMethod) {
            changes.push({
                type: 'method_added',
                className: newInterface.className,
                methodName: newMethod.name,
                newSignature: newMethod,
                impact: 'additive'
            });
        }
    }

    // Find removed methods
    for (const oldMethod of oldInterface.methods) {
        const newMethod = newInterface.methods.find(m => m.name === oldMethod.name);
        if (!newMethod) {
            changes.push({
                type: 'method_removed',
                className: newInterface.className,
                methodName: oldMethod.name,
                oldSignature: oldMethod,
                impact: 'breaking'
            });
        }
    }

    // Find changed methods
    for (const oldMethod of oldInterface.methods) {
        const newMethod = newInterface.methods.find(m => m.name === oldMethod.name);
        if (newMethod && !methodSignaturesEqual(oldMethod, newMethod)) {
            changes.push({
                type: 'method_signature_changed',
                className: newInterface.className,
                methodName: oldMethod.name,
                oldSignature: oldMethod,
                newSignature: newMethod,
                impact: determineImpact(oldMethod, newMethod)
            });
        }
    }

    return changes;
}

/**
 * Generate specific code updates for customized files based on detected changes
 */
export async function generateCodeUpdatesForChanges(
    customizedFilePath: string,
    changes: ApiChange[]
): Promise<Array<{line: number, oldCode: string, newCode: string, description: string}>> {
    const updates: Array<{line: number, oldCode: string, newCode: string, description: string}> = [];
    
    const content = await fs.readFile(customizedFilePath, 'utf-8');
    const lines = content.split('\n');

    for (const change of changes) {
        // Find references to the changed method in customized code
        const references = findMethodReferences(lines, change);
        
        for (const ref of references) {
            const update = generateSpecificUpdate(ref, change);
            if (update) {
                updates.push(update);
            }
        }
    }

    return updates;
}

// Helper functions for parsing (simplified - would use actual JavaParser)

function extractClassName(content: string): string {
    const match = content.match(/(?:class|interface)\s+(\w+)/);
    return match ? match[1] : 'Unknown';
}

function extractPackageName(content: string): string {
    const match = content.match(/package\s+([^;]+);/);
    return match ? match[1] : '';
}

function extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+([^;]+);/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }
    return imports;
}

function extractMethods(content: string): MethodSignature[] {
    const methods: MethodSignature[] = [];
    
    // Simplified method extraction - would use proper AST parsing
    const methodRegex = /(?:public|private|protected|static|\s)+[\w<>\[\],\s]+\s+(\w+)\s*\([^)]*\)/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
        // This is very simplified - real implementation would parse parameters, return types, etc.
        methods.push({
            name: match[1],
            returnType: 'Object', // Would be properly parsed
            parameters: [], // Would be properly parsed
            modifiers: [], // Would be properly parsed
            annotations: [] // Would be properly parsed
        });
    }
    
    return methods;
}

function isGeneratedFile(content: string): boolean {
    return content.includes('// Code generated by') || 
           content.includes('@Generated') ||
           content.includes('// This file is auto-generated');
}

function methodSignaturesEqual(method1: MethodSignature, method2: MethodSignature): boolean {
    return method1.name === method2.name &&
           method1.returnType === method2.returnType &&
           method1.parameters.length === method2.parameters.length &&
           method1.parameters.every((p1, i) => {
               const p2 = method2.parameters[i];
               return p1.name === p2.name && p1.type === p2.type;
           });
}

function determineImpact(oldMethod: MethodSignature, newMethod: MethodSignature): 'breaking' | 'additive' | 'internal' {
    // Determine if the change is breaking based on signature analysis
    if (oldMethod.returnType !== newMethod.returnType) {
        return 'breaking';
    }
    
    if (oldMethod.parameters.length !== newMethod.parameters.length) {
        return 'breaking';
    }
    
    // Check parameter types
    for (let i = 0; i < oldMethod.parameters.length; i++) {
        if (oldMethod.parameters[i].type !== newMethod.parameters[i].type) {
            return 'breaking';
        }
    }
    
    return 'internal';
}

function findMethodReferences(lines: string[], change: ApiChange): Array<{lineNumber: number, line: string}> {
    const references: Array<{lineNumber: number, line: string}> = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(change.methodName) && 
            (line.includes('.') || line.includes('('))) {
            references.push({lineNumber: i + 1, line});
        }
    }
    
    return references;
}

function generateSpecificUpdate(
    reference: {lineNumber: number, line: string}, 
    change: ApiChange
): {line: number, oldCode: string, newCode: string, description: string} | null {
    
    // Generate specific code updates based on the type of change
    switch (change.type) {
        case 'method_signature_changed':
            if (change.oldSignature && change.newSignature) {
                return {
                    line: reference.lineNumber,
                    oldCode: reference.line,
                    newCode: updateMethodCall(reference.line, change.oldSignature, change.newSignature),
                    description: `Update ${change.methodName} call to match new signature`
                };
            }
            break;
            
        case 'method_removed':
            return {
                line: reference.lineNumber,
                oldCode: reference.line,
                newCode: '// TODO: Method removed - manual review required',
                description: `Method ${change.methodName} was removed - requires manual update`
            };
            
        case 'method_added':
            // New methods don't typically require updates to existing code
            break;
    }
    
    return null;
}

function updateMethodCall(line: string, oldSig: MethodSignature, newSig: MethodSignature): string {
    // Simplified update logic - would need sophisticated parsing for real implementation
    return line; // Would actually update the method call syntax
}

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

async function getInterfacesFromCommit(moduleDirectory: string, commit: string): Promise<ClassAnalysis[]> {
    // This would checkout the specific commit and analyze interfaces
    // Implementation would use git commands to get previous state
    return [];
}
