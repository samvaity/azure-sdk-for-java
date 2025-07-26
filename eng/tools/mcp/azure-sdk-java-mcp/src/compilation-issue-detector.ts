/**
 * MCP Tool: Detects compilation issues after TypeSpec updates
 * This tool analyzes Maven compilation output to identify common issues
 * that occur when generated code changes but customizations are not updated.
 */

export interface CompilationError {
    filePath: string;
    lineNumber: number;
    columnNumber: number;
    errorType: string;
    symbol: string;
    message: string;
}

export interface CompilationAnalysis {
    errors: CompilationError[];
    affectedFiles: string[];
    potentialFixes: FixSuggestion[];
}

export interface FixSuggestion {
    type: 'variable_rename' | 'method_signature_mismatch' | 'import_missing' | 'type_change';
    description: string;
    filePath: string;
    oldValue: string;
    newValue: string;
    confidence: number;
}

/**
 * Parses Maven compilation output and extracts structured error information
 */
export function parseCompilationErrors(mavenOutput: string): CompilationAnalysis {
    const errors: CompilationError[] = [];
    const lines = mavenOutput.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match Maven compilation error pattern:
        // [ERROR] /path/to/file.java:[line,col] cannot find symbol
        const errorMatch = line.match(/\[ERROR\]\s+([^:]+):(\[(\d+),(\d+)\])\s+(.+)/);

        if (errorMatch) {
            const [, filePath, , lineStr, colStr, message] = errorMatch;

            // Look for symbol information in the next lines
            let symbolInfo = '';
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                if (lines[j].includes('symbol:')) {
                    symbolInfo = lines[j].replace(/.*symbol:\s+/, '').trim();
                    break;
                }
            }

            errors.push({
                filePath: filePath.replace(/\\/g, '/'),
                lineNumber: parseInt(lineStr),
                columnNumber: parseInt(colStr),
                errorType: message.includes('cannot find symbol') ? 'SYMBOL_NOT_FOUND' : 'COMPILATION_ERROR',
                symbol: symbolInfo,
                message: message.trim()
            });
        }
    }

    const affectedFiles = [...new Set(errors.map(e => e.filePath))];
    const potentialFixes = generateFixSuggestions(errors);

    return {
        errors,
        affectedFiles,
        potentialFixes
    };
}

/**
 * Generates potential fix suggestions based on compilation errors
 */
function generateFixSuggestions(errors: CompilationError[]): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    for (const error of errors) {
        if (error.errorType === 'SYMBOL_NOT_FOUND') {
            // Common pattern: analyzeDocumentOptions vs analyzeDocumentRequest
            if (error.symbol.includes('analyzeDocumentOptions')) {
                suggestions.push({
                    type: 'variable_rename',
                    description: 'Replace analyzeDocumentOptions with analyzeDocumentRequest parameter name mismatch',
                    filePath: error.filePath,
                    oldValue: 'analyzeDocumentOptions',
                    newValue: 'analyzeDocumentRequest',
                    confidence: 0.9
                });
            }

            // Pattern for other common mismatches
            if (error.symbol.includes('Options') && !error.symbol.includes('Request')) {
                const newSymbol = error.symbol.replace('Options', 'Request');
                suggestions.push({
                    type: 'variable_rename',
                    description: `Replace ${error.symbol} with ${newSymbol} due to parameter name change`,
                    filePath: error.filePath,
                    oldValue: error.symbol,
                    newValue: newSymbol,
                    confidence: 0.7
                });
            }
        }
    }

    return suggestions;
}

/**
 * MCP Tool function to detect compilation issues
 */
export async function detectCompilationIssues(projectPath: string): Promise<CompilationAnalysis> {
    // This would be called by the MCP framework
    // Implementation would run Maven compilation and parse output

    console.log(`Analyzing compilation issues in: ${projectPath}`);

    // Placeholder - in real implementation, this would:
    // 1. Run `mvn clean compile` in the project directory
    // 2. Capture the output
    // 3. Parse using parseCompilationErrors()

    return {
        errors: [],
        affectedFiles: [],
        potentialFixes: []
    };
}
