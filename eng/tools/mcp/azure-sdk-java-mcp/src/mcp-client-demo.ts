/**
 * MCP Client for Testing TypeSpec Sync Tools
 *
 * This script demonstrates how to interact with the running MCP server
 * to use the TypeSpec synchronization tools in real-time.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

class TypeSpecSyncClient {
    private client: Client;
    private transport: StdioClientTransport | null = null;

    constructor() {
        this.client = new Client(
            {
                name: 'typespec-sync-client',
                version: '1.0.0'
            },
            {
                capabilities: {}
            }
        );
    }

    async connect() {
        console.log('🔌 Connecting to MCP server...');

        // Start the server process
        const serverProcess = spawn('npx', ['tsx', 'src/mcp-typespec-sync-server.ts'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'inherit']
        });

        // Create transport using the server process
        this.transport = new StdioClientTransport({
            readable: serverProcess.stdout!,
            writable: serverProcess.stdin!
        });

        // Connect to the server
        await this.client.connect(this.transport);
        console.log('✅ Connected to MCP server');
    }

    async listTools() {
        console.log('📋 Listing available tools...');
        try {
            const response = await this.client.request(
                { method: 'tools/list' },
                { method: 'tools/list' }
            );

            console.log('\n🔧 Available TypeSpec Sync Tools:');
            console.log('═'.repeat(50));

            if (response.tools) {
                response.tools.forEach((tool: any, index: number) => {
                    console.log(`\n${index + 1}. 🛠️  ${tool.name}`);
                    console.log(`   📝 ${tool.description.split('\n')[0]}`);
                });
            }

            return response.tools;
        } catch (error) {
            console.error('❌ Failed to list tools:', error);
            return [];
        }
    }

    async validateEnvironment(projectPath: string) {
        console.log(`\n🔍 Validating environment for: ${projectPath}`);
        try {
            const response = await this.client.request(
                { method: 'tools/call' },
                {
                    method: 'tools/call',
                    params: {
                        name: 'typespec_validate_environment',
                        arguments: { projectPath }
                    }
                }
            );

            const result = JSON.parse(response.content[0].text);
            console.log('📊 Environment Validation Result:');
            console.log(`   ✅ Success: ${result.success}`);
            console.log(`   💬 Message: ${result.message}`);

            return result;
        } catch (error) {
            console.error('❌ Environment validation failed:', error);
            return { success: false, message: 'Client error' };
        }
    }

    async analyzeTypeSpecConfig(projectPath: string) {
        console.log(`\n🔧 Analyzing TypeSpec configuration for: ${projectPath}`);
        try {
            const response = await this.client.request(
                { method: 'tools/call' },
                {
                    method: 'tools/call',
                    params: {
                        name: 'typespec_analyze_config',
                        arguments: { projectPath }
                    }
                }
            );

            const result = JSON.parse(response.content[0].text);
            console.log('📊 TypeSpec Configuration:');
            console.log(`   📍 Directory: ${result.directory}`);
            console.log(`   🏷️  Commit: ${result.currentCommit?.substring(0, 8)}...`);
            console.log(`   📚 Repository: ${result.repo}`);

            return result;
        } catch (error) {
            console.error('❌ TypeSpec config analysis failed:', error);
            return null;
        }
    }

    async analyzeCompilation(projectPath: string) {
        console.log(`\n🔨 Analyzing compilation for: ${projectPath}`);
        try {
            const response = await this.client.request(
                { method: 'tools/call' },
                {
                    method: 'tools/call',
                    params: {
                        name: 'typespec_analyze_compilation',
                        arguments: { projectPath }
                    }
                }
            );

            const result = JSON.parse(response.content[0].text);
            console.log('📊 Compilation Analysis Result:');
            console.log(`   📋 Errors Found: ${result.errors?.length || 0}`);
            console.log(`   📁 Affected Files: ${result.affectedFiles?.length || 0}`);
            console.log(`   🔧 Potential Fixes: ${result.potentialFixes?.length || 0}`);

            if (result.errors && result.errors.length > 0) {
                console.log('\n⚠️  Sample Errors:');
                result.errors.slice(0, 3).forEach((error: any, index: number) => {
                    console.log(`   ${index + 1}. ${error.filePath}:${error.lineNumber} - ${error.message}`);
                });
            }

            return result;
        } catch (error) {
            console.error('❌ Compilation analysis failed:', error);
            return null;
        }
    }

    async orchestrateSync(projectPath: string, dryRun: boolean = true, verbose: boolean = true) {
        console.log(`\n🚀 Orchestrating TypeSpec sync (dry run: ${dryRun})`);
        try {
            const response = await this.client.request(
                { method: 'tools/call' },
                {
                    method: 'tools/call',
                    params: {
                        name: 'typespec_sync_orchestrate',
                        arguments: { projectPath, dryRun, verbose }
                    }
                }
            );

            const result = JSON.parse(response.content[0].text);
            console.log('📊 Orchestration Result:');
            console.log(`   ✅ Success: ${result.success}`);
            console.log(`   📋 Stage: ${result.stage}`);
            console.log(`   💬 Message: ${result.message}`);
            console.log(`   📝 Summary: ${result.summary}`);

            if (result.fixes && result.fixes.length > 0) {
                console.log('\n🔧 Potential Fixes:');
                result.fixes.forEach((fix: any, index: number) => {
                    console.log(`   ${index + 1}. ${fix.file}`);
                    console.log(`      📝 ${fix.description}`);
                    console.log(`      ✅ Applied: ${fix.applied}`);
                });
            }

            return result;
        } catch (error) {
            console.error('❌ Orchestration failed:', error);
            return null;
        }
    }

    async parseCompilationErrors(mavenOutput: string) {
        console.log('\n📝 Parsing Maven compilation output...');
        try {
            const response = await this.client.request(
                { method: 'tools/call' },
                {
                    method: 'tools/call',
                    params: {
                        name: 'typespec_parse_compilation_errors',
                        arguments: { mavenOutput }
                    }
                }
            );

            const result = JSON.parse(response.content[0].text);
            console.log('📊 Parsed Error Analysis:');
            console.log(`   📋 Total Errors: ${result.errors?.length || 0}`);
            console.log(`   📁 Affected Files: ${result.affectedFiles?.length || 0}`);

            return result;
        } catch (error) {
            console.error('❌ Error parsing failed:', error);
            return null;
        }
    }

    async disconnect() {
        if (this.transport) {
            await this.client.close();
            console.log('🔌 Disconnected from MCP server');
        }
    }
}

/**
 * Interactive demo function
 */
async function runInteractiveDemo() {
    const client = new TypeSpecSyncClient();

    try {
        await client.connect();

        // List available tools
        await client.listTools();

        // Use the Document Intelligence project path
        const projectPath = 'C:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence';

        console.log('\n🎯 Running Real-Time TypeSpec Sync Demo');
        console.log('═'.repeat(60));

        // Step 1: Validate environment
        const envResult = await client.validateEnvironment(projectPath);

        if (envResult.success) {
            // Step 2: Analyze TypeSpec configuration
            await client.analyzeTypeSpecConfig(projectPath);

            // Step 3: Analyze compilation state
            await client.analyzeCompilation(projectPath);

            // Step 4: Run orchestrated sync (dry run)
            await client.orchestrateSync(projectPath, true, true);

            console.log('\n✅ Real-time MCP demo completed successfully!');
        } else {
            console.log('\n⚠️  Environment validation failed, skipping other steps');
        }

    } catch (error) {
        console.error('❌ Demo failed:', error);
    } finally {
        await client.disconnect();
    }
}

/**
 * Example of parsing compilation errors from file
 */
async function testCompilationErrorParsing() {
    const client = new TypeSpecSyncClient();

    try {
        await client.connect();

        // Read the example compilation output
        const fs = await import('fs');
        const path = await import('path');

        const examplePath = path.join(process.cwd(), 'src', 'utils', 'compile-error-example.txt');

        if (fs.existsSync(examplePath)) {
            const mavenOutput = fs.readFileSync(examplePath, 'utf8');
            console.log('\n🧪 Testing compilation error parsing...');
            await client.parseCompilationErrors(mavenOutput);
        } else {
            console.log('⚠️  Example compilation output file not found');
        }

    } catch (error) {
        console.error('❌ Compilation error parsing test failed:', error);
    } finally {
        await client.disconnect();
    }
}

// Allow running specific functions
const args = process.argv.slice(2);
if (args.includes('--parse-errors')) {
    testCompilationErrorParsing();
} else {
    runInteractiveDemo();
}

export { TypeSpecSyncClient };
