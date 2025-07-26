/**
 * Simple test script to interact with the MCP server
 * Uses stdio communication to test the running server
 */

import { spawn } from 'child_process';
import * as readline from 'readline';

class SimpleTestClient {
    private serverProcess: any = null;

    async startServer() {
        console.log('🚀 Starting MCP TypeSpec Sync Server...');

        this.serverProcess = spawn('npx', ['tsx', 'src/mcp-typespec-sync-server.ts'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        console.log('✅ Server started with PID:', this.serverProcess.pid);

        // Handle server output
        this.serverProcess.stdout.on('data', (data: Buffer) => {
            const output = data.toString().trim();
            if (output) {
                console.log('📤 Server response:', output);
            }
        });

        this.serverProcess.stderr.on('data', (data: Buffer) => {
            const error = data.toString().trim();
            if (error && !error.includes('running on stdio')) {
                console.log('⚠️  Server stderr:', error);
            } else if (error.includes('running on stdio')) {
                console.log('✅', error);
            }
        });

        // Wait a moment for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    async sendRequest(request: any) {
        if (!this.serverProcess) {
            throw new Error('Server not started');
        }

        console.log('📥 Sending request:', JSON.stringify(request, null, 2));

        const jsonRequest = JSON.stringify(request) + '\n';
        this.serverProcess.stdin.write(jsonRequest);
    }

    async listTools() {
        await this.sendRequest({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {}
        });
    }

    async testEnvironmentValidation(projectPath: string) {
        await this.sendRequest({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'typespec_validate_environment',
                arguments: { projectPath }
            }
        });
    }

    async testCompilationAnalysis(projectPath: string) {
        await this.sendRequest({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
                name: 'typespec_analyze_compilation',
                arguments: { projectPath }
            }
        });
    }

    async testTypeSpecConfig(projectPath: string) {
        await this.sendRequest({
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
                name: 'typespec_analyze_config',
                arguments: { projectPath }
            }
        });
    }

    async testOrchestration(projectPath: string) {
        await this.sendRequest({
            jsonrpc: '2.0',
            id: 5,
            method: 'tools/call',
            params: {
                name: 'typespec_sync_orchestrate',
                arguments: {
                    projectPath,
                    dryRun: true,
                    verbose: true
                }
            }
        });
    }

    async shutdown() {
        if (this.serverProcess) {
            console.log('🛑 Shutting down server...');
            this.serverProcess.kill();
        }
    }
}

async function runRealTimeTest() {
    const client = new SimpleTestClient();
    const projectPath = 'C:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence';

    try {
        await client.startServer();

        console.log('\n🎯 Real-Time MCP Server Test');
        console.log('═'.repeat(50));

        // Test 1: List available tools
        console.log('\n1️⃣  Testing tool listing...');
        await client.listTools();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 2: Environment validation
        console.log('\n2️⃣  Testing environment validation...');
        await client.testEnvironmentValidation(projectPath);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 3: TypeSpec configuration analysis
        console.log('\n3️⃣  Testing TypeSpec config analysis...');
        await client.testTypeSpecConfig(projectPath);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 4: Compilation analysis
        console.log('\n4️⃣  Testing compilation analysis...');
        await client.testCompilationAnalysis(projectPath);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 5: Full orchestration (dry run)
        console.log('\n5️⃣  Testing orchestrated sync...');
        await client.testOrchestration(projectPath);
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('\n✅ All tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Keep server running for manual testing
        console.log('\n🎛️  Server is still running for interactive testing...');
        console.log('   Press Ctrl+C to stop the server');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            await client.shutdown();
            process.exit(0);
        });
    }
}

// Interactive mode for manual testing
async function interactiveMode() {
    const client = new SimpleTestClient();
    await client.startServer();

    console.log('\n🎛️  Interactive MCP Server Mode');
    console.log('═'.repeat(50));
    console.log('Available commands:');
    console.log('  list - List all tools');
    console.log('  env - Test environment validation');
    console.log('  config - Test TypeSpec config analysis');
    console.log('  compile - Test compilation analysis');
    console.log('  sync - Test orchestrated sync');
    console.log('  quit - Exit');
    console.log();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const projectPath = 'C:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence';

    const handleCommand = async (command: string) => {
        try {
            switch (command.trim().toLowerCase()) {
                case 'list':
                    await client.listTools();
                    break;
                case 'env':
                    await client.testEnvironmentValidation(projectPath);
                    break;
                case 'config':
                    await client.testTypeSpecConfig(projectPath);
                    break;
                case 'compile':
                    await client.testCompilationAnalysis(projectPath);
                    break;
                case 'sync':
                    await client.testOrchestration(projectPath);
                    break;
                case 'quit':
                case 'exit':
                    await client.shutdown();
                    rl.close();
                    process.exit(0);
                    break;
                default:
                    console.log('❓ Unknown command. Try: list, env, config, compile, sync, quit');
            }
        } catch (error) {
            console.error('❌ Command failed:', error);
        }
    };

    rl.on('line', handleCommand);
    rl.prompt();
    rl.setPrompt('mcp> ');
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--interactive')) {
    interactiveMode();
} else {
    runRealTimeTest();
}
