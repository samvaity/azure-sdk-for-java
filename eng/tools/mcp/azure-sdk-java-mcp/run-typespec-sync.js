#!/usr/bin/env node

import { conductTypeSpecSync } from './src/typespec-sync-conductor.js';

const projectPath = 'c:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence';
const commitSha = '74d0cc137b23cbaab58baa746f182876522e88a0';

console.log('=== MCP TypeSpec Sync Analysis ===');
console.log('Project:', projectPath);
console.log('TypeSpec Commit:', commitSha);
console.log('Starting analysis...\n');

try {
    const result = await conductTypeSpecSync({
        projectPath,
        commitSha,
        verbose: true,
        dryRun: false
    });
    
    console.log('\n=== RESULTS ===');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(0);
} catch (error) {
    console.error('Analysis failed:', error.message);
    console.error(error);
    process.exit(1);
}
