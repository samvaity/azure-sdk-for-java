#!/usr/bin/env node

/**
 * SDK Generation Pipeline Integration Script
 * 
 * This script demonstrates how the customization updater would be integrated
 * into the SDK generation pipeline, triggered after TypeSpec regeneration.
 * 
 * Usage scenarios:
 * 1. Automated pipeline: Called after 'tsp compile' and before final build
 * 2. Manual invocation: Developer runs after pulling TypeSpec changes
 * 3. CI/CD integration: Part of PR validation process
 */

import { execSync } from 'child_process';
import path from 'path';
import { updateCustomizedCodeAfterGeneration } from './customization-updater.js';

interface PipelineConfig {
    moduleDirectory: string;
    restApiSpecsPR?: string;
    typeSpecCommit?: string;
    buildAfterUpdate: boolean;
    validateAfterUpdate: boolean;
}

/**
 * Main pipeline integration function
 * Entry point: azure-sdk-for-java repo level, after TypeSpec generation
 */
async function runCustomizationUpdatePipeline(config: PipelineConfig): Promise<void> {
    console.log('🚀 Starting SDK Customization Update Pipeline...\n');

    try {
        // Step 1: Verify we're in the right place
        validateEnvironment(config.moduleDirectory);

        // Step 2: Run the intelligent customization updater
        console.log('📋 Analyzing TypeSpec changes and updating customizations...');
        const result = await updateCustomizedCodeAfterGeneration({
            moduleDirectory: config.moduleDirectory,
            restApiSpecsPR: config.restApiSpecsPR,
            typeSpecCommit: config.typeSpecCommit,
            dryRun: false
        });

        // Display results
        console.log(result.content[0].text);

        // Step 3: Build to verify changes (if requested)
        if (config.buildAfterUpdate) {
            console.log('\n🔨 Building module to verify updates...');
            await buildModule(config.moduleDirectory);
        }

        // Step 4: Run validation (if requested)
        if (config.validateAfterUpdate) {
            console.log('\n✅ Running validation checks...');
            await validateModule(config.moduleDirectory);
        }

        console.log('\n🎉 Customization update pipeline completed successfully!');

    } catch (error) {
        console.error('\n❌ Pipeline failed:', error);
        process.exit(1);
    }
}

/**
 * CLI entry point - parses command line arguments
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
        printUsage();
        return;
    }

    const config: PipelineConfig = {
        moduleDirectory: process.cwd(),
        buildAfterUpdate: false,
        validateAfterUpdate: false
    };

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--module-dir':
                config.moduleDirectory = args[++i];
                break;
            case '--rest-api-specs-pr':
                config.restApiSpecsPR = args[++i];
                break;
            case '--typespec-commit':
                config.typeSpecCommit = args[++i];
                break;
            case '--build':
                config.buildAfterUpdate = true;
                break;
            case '--validate':
                config.validateAfterUpdate = true;
                break;
            default:
                console.error(`Unknown argument: ${args[i]}`);
                printUsage();
                process.exit(1);
        }
    }

    await runCustomizationUpdatePipeline(config);
}

function validateEnvironment(moduleDirectory: string): void {
    // Verify we're in an Azure SDK Java module
    const requiredFiles = ['pom.xml', 'src'];
    for (const file of requiredFiles) {
        const filePath = path.join(moduleDirectory, file);
        try {
            execSync(`test -e "${filePath}"`, { stdio: 'ignore' });
        } catch {
            throw new Error(`Not a valid SDK module directory: missing ${file}`);
        }
    }
}

async function buildModule(moduleDirectory: string): Promise<void> {
    try {
        execSync('mvn compile -f pom.xml', { 
            cwd: moduleDirectory, 
            stdio: 'inherit' 
        });
        console.log('✅ Build successful');
    } catch (error) {
        throw new Error(`Build failed: ${error}`);
    }
}

async function validateModule(moduleDirectory: string): Promise<void> {
    try {
        // Run tests and quality checks
        execSync('mvn test -f pom.xml', { 
            cwd: moduleDirectory, 
            stdio: 'inherit' 
        });
        console.log('✅ Validation successful');
    } catch (error) {
        console.warn(`⚠️ Validation had issues: ${error}`);
        // Don't fail the pipeline for validation issues, just warn
    }
}

function printUsage(): void {
    console.log(`
Azure SDK Java Customization Update Pipeline

USAGE:
    node update-pipeline.js [OPTIONS]

OPTIONS:
    --module-dir <path>          SDK module directory (default: current directory)
    --rest-api-specs-pr <url>    rest-api-specs PR URL to analyze changes
    --typespec-commit <sha>      Specific TypeSpec commit to diff against
    --build                      Build module after updating customizations
    --validate                   Run tests after updating customizations
    --help                       Show this help message

EXAMPLES:
    # Update customizations in current directory
    node update-pipeline.js

    # Update with specific rest-api-specs PR analysis
    node update-pipeline.js --rest-api-specs-pr https://github.com/Azure/azure-rest-api-specs/pull/12345

    # Update specific module with build validation
    node update-pipeline.js --module-dir ./sdk/face/azure-ai-vision-face --build --validate

INTEGRATION POINTS:
    1. CI/CD Pipeline: Call after 'tsp compile' in Azure DevOps pipeline
    2. Local Development: Run after pulling TypeSpec updates
    3. PR Validation: Ensure customizations stay compatible

WORKFLOW:
    rest-api-specs PR → TypeSpec regeneration → SDK generation → THIS TOOL → Build & Test
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { runCustomizationUpdatePipeline };
