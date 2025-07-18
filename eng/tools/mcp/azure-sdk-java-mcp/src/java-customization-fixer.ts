/**
 * Java Customization Error Fixer
 *
 * Build error-driven approach that integrates with existing spec-gen-sdk-runner
 * Focuses on fixing real compilation errors rather than predicting changes
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface CompilationError {
  file: string;
  line: number;
  column?: number;
  message: string;
  type: 'missing_import' | 'missing_method' | 'type_mismatch' | 'unknown';
  severity: 'error' | 'warning';
}

interface FixResult {
  success: boolean;
  description: string;
  filesModified: string[];
  errorFixed: string;
}

interface CustomizationFixSummary {
  resolved: boolean;
  fixCount: number;
  partialFixes: number;
  fixes: FixResult[];
  suggestions: string[];
}

/**
 * Main entry point for fixing Java customization errors
 * Called by spec-gen-sdk-runner when Java SDK build fails
 */
export async function fixJavaCustomizationErrors(
  moduleDirectory: string,
  executionReport?: any
): Promise<CustomizationFixSummary> {
  console.log(`🔧 Analyzing Java customization errors in: ${moduleDirectory}`);

  try {
    // 1. Run Maven compilation to get actual errors
    const compilationErrors = await getCompilationErrors(moduleDirectory);

    if (compilationErrors.length === 0) {
      return {
        resolved: true,
        fixCount: 0,
        partialFixes: 0,
        fixes: [],
        suggestions: []
      };
    }

    console.log(`Found ${compilationErrors.length} compilation errors`);

    // 2. Categorize errors by type
    const errorsByType = categorizeErrors(compilationErrors);

    // 3. Apply automatic fixes for known patterns
    const fixes: FixResult[] = [];

    // Fix missing imports (highest success rate)
    if (errorsByType.missing_import.length > 0) {
      const importFixes = await fixMissingImports(moduleDirectory, errorsByType.missing_import);
      fixes.push(...importFixes);
    }

    // Fix type mismatches (common BinaryData migrations)
    if (errorsByType.type_mismatch.length > 0) {
      const typeFixes = await fixTypeMismatches(moduleDirectory, errorsByType.type_mismatch);
      fixes.push(...typeFixes);
    }

    // Generate suggestions for complex issues
    const suggestions = generateSuggestions(errorsByType.missing_method, errorsByType.unknown);

    // 4. Verify fixes by re-running compilation
    let resolved = false;
    if (fixes.length > 0) {
      const remainingErrors = await getCompilationErrors(moduleDirectory);
      resolved = remainingErrors.length === 0;
    }

    return {
      resolved,
      fixCount: fixes.filter(f => f.success).length,
      partialFixes: fixes.length,
      fixes,
      suggestions
    };

  } catch (error) {
    console.error(`Error in customization fixer: ${error}`);
    return {
      resolved: false,
      fixCount: 0,
      partialFixes: 0,
      fixes: [],
      suggestions: [`Manual review required: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Run Maven compilation and parse errors
 */
async function getCompilationErrors(moduleDirectory: string): Promise<CompilationError[]> {
  try {
    // Run Maven compile and capture output
    execSync('mvn compile -q', {
      cwd: moduleDirectory,
      stdio: 'pipe',
      encoding: 'utf8'
    });

    // No errors if compilation succeeded
    return [];

  } catch (error: any) {
    // Parse Maven error output
    const errorOutput = (error.stdout || '') + (error.stderr || '');
    return parseMavenErrors(errorOutput);
  }
}

/**
 * Parse Maven compilation error output into structured format
 */
function parseMavenErrors(errorOutput: string): CompilationError[] {
  const errors: CompilationError[] = [];
  const lines = errorOutput.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Maven error format: [ERROR] /path/to/File.java:[line,column] error message
    const errorMatch = line.match(/\[ERROR\]\s+([^:]+):(\[(\d+),(\d+)\])?\s+(.+)/);
    if (errorMatch) {
      const [, filePath, , lineStr, colStr, message] = errorMatch;

      errors.push({
        file: filePath.trim(),
        line: parseInt(lineStr || '0', 10),
        column: parseInt(colStr || '0', 10),
        message: message.trim(),
        type: classifyError(message),
        severity: 'error'
      });
    }
  }

  return errors;
}

/**
 * Classify error type based on message content
 */
function classifyError(message: string): CompilationError['type'] {
  if (message.includes('cannot find symbol') && message.includes('class')) {
    return 'missing_import';
  }
  if (message.includes('method') && message.includes('cannot be applied')) {
    return 'missing_method';
  }
  if (message.includes('incompatible types') || message.includes('cannot be converted')) {
    return 'type_mismatch';
  }
  return 'unknown';
}

/**
 * Categorize errors by type for batch processing
 */
function categorizeErrors(errors: CompilationError[]): Record<string, CompilationError[]> {
  return errors.reduce((acc, error) => {
    if (!acc[error.type]) acc[error.type] = [];
    acc[error.type].push(error);
    return acc;
  }, {} as Record<string, CompilationError[]>);
}

/**
 * Fix missing import errors by adding required imports
 */
async function fixMissingImports(
  moduleDirectory: string,
  errors: CompilationError[]
): Promise<FixResult[]> {
  const fixes: FixResult[] = [];

  // Common Azure SDK imports
  const commonImports = new Map([
    ['BinaryData', 'com.azure.core.util.BinaryData'],
    ['Context', 'com.azure.core.util.Context'],
    ['Response', 'com.azure.core.http.rest.Response'],
    ['PagedIterable', 'com.azure.core.http.rest.PagedIterable'],
    ['RequestOptions', 'com.azure.core.http.RequestOptions'],
    ['HttpResponseException', 'com.azure.core.exception.HttpResponseException']
  ]);

  for (const error of errors) {
    const symbolMatch = error.message.match(/symbol:\s*(?:class\s+)?(\w+)/);
    if (symbolMatch) {
      const symbol = symbolMatch[1];
      const importPath = commonImports.get(symbol);

      if (importPath) {
        try {
          await addImportToFile(error.file, importPath);
          fixes.push({
            success: true,
            description: `Added import for ${symbol}`,
            filesModified: [error.file],
            errorFixed: error.message
          });
        } catch (err: any) {
          fixes.push({
            success: false,
            description: `Failed to add import for ${symbol}: ${err instanceof Error ? err.message : String(err)}`,
            filesModified: [],
            errorFixed: error.message
          });
        }
      }
    }
  }

  return fixes;
}

/**
 * Fix type mismatch errors with common patterns
 */
async function fixTypeMismatches(
  moduleDirectory: string,
  errors: CompilationError[]
): Promise<FixResult[]> {
  const fixes: FixResult[] = [];

  for (const error of errors) {
    // String to BinaryData conversion
    if (error.message.includes('String cannot be converted to BinaryData')) {
      const suggestion = `Consider using BinaryData.fromString() for the parameter`;
      fixes.push({
        success: false, // Requires manual intervention
        description: suggestion,
        filesModified: [],
        errorFixed: error.message
      });
    }

    // Object to BinaryData conversion
    if (error.message.includes('Object cannot be converted to BinaryData')) {
      const suggestion = `Consider using BinaryData.fromObject() for the parameter`;
      fixes.push({
        success: false, // Requires manual intervention
        description: suggestion,
        filesModified: [],
        errorFixed: error.message
      });
    }
  }

  return fixes;
}

/**
 * Generate suggestions for complex errors that can't be auto-fixed
 */
function generateSuggestions(methodErrors: CompilationError[], unknownErrors: CompilationError[]): string[] {
  const suggestions: string[] = [];

  if (methodErrors.length > 0) {
    suggestions.push('Method signature mismatches detected. Check if generated interfaces have changed.');
    suggestions.push('Consider reviewing the TypeSpec changes for breaking API modifications.');
  }

  if (unknownErrors.length > 0) {
    suggestions.push(`${unknownErrors.length} unrecognized errors need manual review.`);
    suggestions.push('See compilation output for detailed error messages.');
  }

  return suggestions;
}

/**
 * Add import statement to Java file
 */
async function addImportToFile(filePath: string, importStatement: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  // Check if import already exists
  if (content.includes(`import ${importStatement};`)) {
    return; // Already imported
  }

  // Find the right place to insert import (after package, before class)
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('package ')) {
      insertIndex = i + 1;
    } else if (lines[i].startsWith('import ')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      // Skip empty lines after imports
      continue;
    } else if (lines[i].startsWith('public class') || lines[i].startsWith('public interface')) {
      break;
    }
  }

  // Insert the import
  lines.splice(insertIndex, 0, `import ${importStatement};`);

  // Write back to file
  await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
}

/**
 * Integration point for spec-gen-sdk-runner
 * Returns simple success/failure for pipeline consumption
 */
export async function tryFixJavaCustomizations(options: {
  moduleDirectory: string;
  executionReport?: any;
}): Promise<{ resolved: boolean; fixCount: number; partialFixes: number }> {
  const result = await fixJavaCustomizationErrors(options.moduleDirectory, options.executionReport);

  // Log results for pipeline visibility
  if (result.fixCount > 0) {
    console.log(`✅ Fixed ${result.fixCount} customization issues automatically`);
  }

  if (result.suggestions.length > 0) {
    console.log(`💡 Suggestions for remaining issues:`);
    result.suggestions.forEach(s => console.log(`   • ${s}`));
  }

  return {
    resolved: result.resolved,
    fixCount: result.fixCount,
    partialFixes: result.partialFixes
  };
}
