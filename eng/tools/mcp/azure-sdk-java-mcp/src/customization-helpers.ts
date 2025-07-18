import { CallToolResult } from "@modelcontextprotocol/sdk/types";
import fs from "fs/promises";
import path from "path";

interface ApiMapping {
    oldSignature: string;
    newSignature: string;
    description: string;
    autoFixable: boolean;
}

/**
 * Common API changes between TypeSpec versions that affect customized code
 */
export const COMMON_API_CHANGES: ApiMapping[] = [
    // BinaryData migration patterns
    {
        oldSignature: "String",
        newSignature: "BinaryData",
        description: "String parameters replaced with BinaryData for request/response bodies",
        autoFixable: true
    },
    {
        oldSignature: "byte[]",
        newSignature: "BinaryData",
        description: "Byte array parameters replaced with BinaryData",
        autoFixable: true
    },
    {
        oldSignature: "Object",
        newSignature: "BinaryData",
        description: "Object parameters replaced with BinaryData for JSON content",
        autoFixable: true
    },

    // Response type changes
    {
        oldSignature: "Response<Void>",
        newSignature: "Response<BinaryData>",
        description: "Void responses now return BinaryData",
        autoFixable: true
    },
    {
        oldSignature: "PagedIterable<Object>",
        newSignature: "PagedIterable<BinaryData>",
        description: "Paged responses now use BinaryData",
        autoFixable: true
    },

    // Context parameter additions
    {
        oldSignature: "method(param)",
        newSignature: "method(param, Context context)",
        description: "Context parameter added to method signatures",
        autoFixable: false
    },

    // RequestOptions migration
    {
        oldSignature: "RequestOptions",
        newSignature: "RequestOptions",
        description: "RequestOptions API changes in newer versions",
        autoFixable: false
    }
];

/**
 * Required imports for Azure SDK data-plane customizations
 */
export const REQUIRED_IMPORTS: Map<string, string> = new Map([
    // Core utilities
    ['BinaryData', 'com.azure.core.util.BinaryData'],
    ['Context', 'com.azure.core.util.Context'],
    ['SerializerAdapter', 'com.azure.core.util.serializer.SerializerAdapter'],
    ['JacksonAdapter', 'com.azure.core.util.serializer.JacksonAdapter'],

    // HTTP and REST
    ['Response', 'com.azure.core.http.rest.Response'],
    ['PagedIterable', 'com.azure.core.http.rest.PagedIterable'],
    ['PagedFlux', 'com.azure.core.http.rest.PagedFlux'],
    ['RequestOptions', 'com.azure.core.http.RequestOptions'],
    ['HttpRequest', 'com.azure.core.http.HttpRequest'],
    ['HttpResponse', 'com.azure.core.http.HttpResponse'],

    // Polling
    ['PollerFlux', 'com.azure.core.util.polling.PollerFlux'],
    ['SyncPoller', 'com.azure.core.util.polling.SyncPoller'],
    ['PollResponse', 'com.azure.core.util.polling.PollResponse'],
    ['LongRunningOperationStatus', 'com.azure.core.util.polling.LongRunningOperationStatus'],

    // Exceptions
    ['HttpResponseException', 'com.azure.core.exception.HttpResponseException'],
    ['ClientAuthenticationException', 'com.azure.core.exception.ClientAuthenticationException'],
    ['ResourceNotFoundException', 'com.azure.core.exception.ResourceNotFoundException'],

    // JSON and serialization
    ['JsonReader', 'com.azure.json.JsonReader'],
    ['JsonSerializable', 'com.azure.json.JsonSerializable'],
    ['JsonToken', 'com.azure.json.JsonToken'],
    ['JsonWriter', 'com.azure.json.JsonWriter'],

    // Annotations
    ['Fluent', 'com.azure.core.annotation.Fluent'],
    ['Immutable', 'com.azure.core.annotation.Immutable'],
    ['ServiceClientBuilder', 'com.azure.core.annotation.ServiceClientBuilder'],
]);

/**
 * Generate code fix suggestions for common customization issues
 */
export async function generateFixSuggestions(
    moduleDirectory: string,
    errorMessage: string,
    fileName: string,
    lineNumber: number
): Promise<CallToolResult> {
    const suggestions: string[] = [];

    // Analyze the error and provide specific suggestions
    if (errorMessage.includes('cannot find symbol')) {
        const symbolMatch = errorMessage.match(/symbol:\s*(?:class\s+)?(\w+)/);
        if (symbolMatch) {
            const symbol = symbolMatch[1];
            const importSuggestion = REQUIRED_IMPORTS.get(symbol);
            if (importSuggestion) {
                suggestions.push(`Add import: import ${importSuggestion};`);
            }
        }
    }

    if (errorMessage.includes('method not found') || errorMessage.includes('cannot resolve method')) {
        suggestions.push('Check if method signature has changed in the generated code');
        suggestions.push('Review the generated client interface for updated method parameters');
    }

    if (errorMessage.includes('incompatible types')) {
        suggestions.push('Consider migrating from String/Object to BinaryData for request/response bodies');
        suggestions.push('Update return type handling for paged operations');
    }

    // Check for common patterns in the file
    try {
        const filePath = path.join(moduleDirectory, fileName);
        const fileContent = await fs.readFile(filePath, 'utf-8');

        // Analyze file content for specific patterns
        if (fileContent.includes('String requestBody') || fileContent.includes('Object requestBody')) {
            suggestions.push('Replace String/Object request bodies with BinaryData.fromString() or BinaryData.fromObject()');
        }

        if (fileContent.includes('Response<Void>')) {
            suggestions.push('Update Response<Void> to Response<BinaryData> and handle the response accordingly');
        }

        if (fileContent.includes('.toString()') && fileContent.includes('BinaryData')) {
            suggestions.push('Use BinaryData.toString() instead of Object.toString() for response parsing');
        }

    } catch (error) {
        // File might not exist or be readable, continue with general suggestions
    }

    const suggestionText = suggestions.length > 0
        ? suggestions.map(s => `  • ${s}`).join('\n')
        : '  • Review the generated code for API changes\n  • Check the TypeSpec changes for breaking modifications';

    return {
        content: [
            {
                type: "text",
                text: `🔧 Fix suggestions for ${fileName}:${lineNumber}\n\n` +
                      `Error: ${errorMessage}\n\n` +
                      `Suggested fixes:\n${suggestionText}\n\n` +
                      `📚 For more guidance, see: https://github.com/Azure/autorest.java/tree/main/customization-base/README.md`,
            },
        ],
    };
}

/**
 * Analyze customization patterns in the codebase
 */
export async function analyzeCustomizationPatterns(moduleDirectory: string): Promise<{
    patterns: string[];
    recommendations: string[];
}> {
    const patterns: string[] = [];
    const recommendations: string[] = [];

    try {
        // Look for customization directory
        const customizationDir = path.join(moduleDirectory, 'customization');

        try {
            await fs.access(customizationDir);
            patterns.push('Has customization directory with Java customization class');

            // Analyze customization files
            const customizationFiles = await fs.readdir(customizationDir, { recursive: true });
            const javaFiles = customizationFiles.filter(f => f.toString().endsWith('.java'));

            for (const file of javaFiles) {
                const filePath = path.join(customizationDir, file.toString());
                const content = await fs.readFile(filePath, 'utf-8');

                if (content.includes('ClassCustomization') || content.includes('MethodCustomization')) {
                    patterns.push(`Customization class: ${file}`);
                }

                if (content.includes('BinaryData') || content.includes('RequestOptions')) {
                    patterns.push(`Modern Azure SDK patterns in: ${file}`);
                } else if (content.includes('String') && content.includes('response')) {
                    recommendations.push(`Consider migrating ${file} to use BinaryData instead of String for responses`);
                }
            }

        } catch {
            // No customization directory
        }

        // Check for partial-update usage
        const tspLocationPath = path.join(moduleDirectory, 'tsp-location.yaml');
        if (await fileExists(tspLocationPath)) {
            const content = await fs.readFile(tspLocationPath, 'utf-8');
            const sourceMatch = content.match(/directory:\s*(.+)/);
            if (sourceMatch) {
                const tspConfigPath = path.join(path.dirname(moduleDirectory), sourceMatch[1], 'tspconfig.yaml');
                if (await fileExists(tspConfigPath)) {
                    const tspConfig = await fs.readFile(tspConfigPath, 'utf-8');
                    if (tspConfig.includes('partial-update: true')) {
                        patterns.push('Uses partial-update for preserving manual code changes');
                    }
                }
            }
        }

    } catch (error) {
        // Analysis failed, provide general recommendations
        recommendations.push('Ensure customized code follows Azure SDK patterns');
        recommendations.push('Review breaking changes in TypeSpec updates');
    }

    return { patterns, recommendations };
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}
