import { conductTypeSpecSync } from './src/typespec-sync-conductor.js';

const projectPath = 'c:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence';
const commitSha = '74d0cc137b23cbaab58baa746f182876522e88a0';

console.log('🔍 Starting TypeSpec Sync Analysis...');
console.log('Project:', projectPath);
console.log('TypeSpec Commit:', commitSha);
console.log('');

// Set a timeout to prevent hanging
const timeoutId = setTimeout(() => {
    console.log('⏰ Operation timed out after 25 seconds');
    process.exit(2);
}, 25000);

conductTypeSpecSync({
    projectPath,
    commitSha,
    verbose: true,
    dryRun: false
}).then(result => {
    clearTimeout(timeoutId);
    
    console.log('\n📋 ANALYSIS COMPLETE');
    console.log('Success:', result.success);
    console.log('Stage:', result.stage);
    console.log('Message:', result.message);
    
    if (result.fixes) {
        console.log('\n🔧 FIXES APPLIED:');
        result.fixes.forEach(fix => {
            console.log(`✅ ${fix.description} - Applied: ${fix.applied}`);
        });
    }
    
    if (result.nextActions) {
        console.log('\n📝 NEXT ACTIONS:');
        result.nextActions.forEach(action => console.log(`- ${action}`));
    }
    
    console.log('\n📊 SUMMARY:', result.summary);
    process.exit(0);
}).catch(err => {
    clearTimeout(timeoutId);
    console.error('❌ Analysis failed:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
});
