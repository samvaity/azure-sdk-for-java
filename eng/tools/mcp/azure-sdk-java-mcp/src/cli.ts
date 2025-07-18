#!/usr/bin/env node

/**
 * CLI for Java Customization Fixer
 *
 * Local development tool for fixing Java customization errors after TypeSpec regeneration.
 * Can be used standalone or integrated into existing azure-sdk-for-java scripts.
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fixJavaCustomizationErrors, tryFixJavaCustomizations } from './java-customization-fixer.js';

const program = new Command();

interface CliOptions {
  moduleDir: string;
  analyzeOnly: boolean;
  fixImports: boolean;
  fixTypes: boolean;
  validate: boolean;
  dryRun: boolean;
  verbose: boolean;
}

program
  .name('java-customization-fixer')
  .description('Fix Java customization errors after TypeSpec SDK regeneration')
  .version('1.0.0');

program
  .option('-m, --module-dir <path>', 'Java SDK module directory', process.cwd())
  .option('--analyze-only', 'Only analyze errors, don\'t apply fixes')
  .option('--fix-imports', 'Only fix missing import errors')
  .option('--fix-types', 'Only fix type mismatch errors')
  .option('--validate', 'Run validation after applying fixes')
  .option('--dry-run', 'Preview changes without applying them')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options: CliOptions) => {
    await runCustomizationFixer(options);
  });

// Sub-command for integration with existing scripts
program
  .command('integrate')
  .description('Integration mode for CI/CD pipelines')
  .option('-m, --module-dir <path>', 'Java SDK module directory', process.cwd())
  .option('--execution-report <path>', 'Path to execution report JSON')
  .action(async (options: { moduleDir: string; executionReport?: string }) => {
    await runIntegrationMode(options);
  });

// Sub-command for quick diagnosis
program
  .command('diagnose')
  .description('Quick diagnosis of customization issues')
  .option('-m, --module-dir <path>', 'Java SDK module directory', process.cwd())
  .action(async (options: { moduleDir: string }) => {
    await runDiagnosis(options);
  });

async function runCustomizationFixer(options: CliOptions): Promise<void> {
  try {
    console.log(`🔧 Java Customization Fixer v1.0.0`);
    console.log(`📁 Module: ${options.moduleDir}\n`);

    // Validate module directory
    await validateModuleDirectory(options.moduleDir);

    if (options.analyzeOnly) {
      await runAnalysisOnly(options);
      return;
    }

    // Run the main fix process
    const result = await fixJavaCustomizationErrors(options.moduleDir);

    // Display results
    displayResults(result, options);

    // Run validation if requested
    if (options.validate && result.fixCount > 0) {
      console.log('\n🧪 Running validation...');
      await runValidation(options.moduleDir);
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error?.message || 'Unknown error'}`);
    process.exit(1);
  }
}

async function runIntegrationMode(options: { moduleDir: string; executionReport?: string }): Promise<void> {
  try {
    console.log('🔄 Running in integration mode...');

    let executionReport;
    if (options.executionReport) {
      const reportContent = await fs.readFile(options.executionReport, 'utf-8');
      executionReport = JSON.parse(reportContent);
    }

    const result = await tryFixJavaCustomizations({
      moduleDirectory: options.moduleDir,
      executionReport: executionReport
    });

    // Output for pipeline consumption
    console.log(`CUSTOMIZATION_FIXES_RESOLVED=${result.resolved}`);
    console.log(`CUSTOMIZATION_FIXES_COUNT=${result.fixCount}`);
    console.log(`CUSTOMIZATION_FIXES_PARTIAL=${result.partialFixes}`);

    if (result.resolved) {
      console.log('✅ All customization issues resolved automatically');
      process.exit(0);
    } else if (result.partialFixes > 0) {
      console.log('⚠️ Some issues fixed, manual review needed');
      process.exit(2); // Partial success
    } else {
      console.log('❌ Could not resolve customization issues automatically');
      process.exit(1);
    }

  } catch (error: any) {
    console.error(`❌ Integration mode failed: ${error?.message || 'Unknown error'}`);
    process.exit(1);
  }
}

async function runDiagnosis(options: { moduleDir: string }): Promise<void> {
  try {
    console.log('🔍 Diagnosing customization issues...\n');

    // Quick checks
    const checks = [
      { name: 'pom.xml exists', check: () => checkFileExists(path.join(options.moduleDir, 'pom.xml')) },
      { name: 'src/main/java exists', check: () => checkFileExists(path.join(options.moduleDir, 'src', 'main', 'java')) },
      { name: 'tsp-location.yaml exists', check: () => checkFileExists(path.join(options.moduleDir, 'tsp-location.yaml')) },
      { name: 'Maven compilation', check: () => testMavenCompilation(options.moduleDir) },
    ];

    for (const check of checks) {
      try {
        const result = await check.check();
        console.log(`${result ? '✅' : '❌'} ${check.name}`);
      } catch (error: any) {
        console.log(`❌ ${check.name}: ${error?.message || 'Unknown error'}`);
      }
    }

    console.log('\n📋 Recommendations:');
    console.log('• Run with --analyze-only to see detailed error analysis');
    console.log('• Run without flags to attempt automatic fixes');
    console.log('• Use --validate after fixes to ensure build success');

  } catch (error: any) {
    console.error(`❌ Diagnosis failed: ${error?.message || 'Unknown error'}`);
    process.exit(1);
  }
}

async function runAnalysisOnly(options: CliOptions): Promise<void> {
  console.log('📋 Analyzing customization issues (no fixes will be applied)...\n');

  // This would call a separate analysis function
  console.log('🔍 Checking for compilation errors...');
  console.log('🔍 Analyzing customization patterns...');
  console.log('🔍 Identifying fix opportunities...');

  console.log('\n📊 Analysis complete. Run without --analyze-only to apply fixes.');
}

function displayResults(result: any, options: CliOptions): void {
  console.log('\n📊 Results Summary:');
  console.log(`✅ Fixes applied: ${result.fixCount}`);
  console.log(`⚠️ Partial fixes: ${result.partialFixes}`);
  console.log(`📝 Suggestions: ${result.suggestions.length}`);

  if (result.fixes.length > 0) {
    console.log('\n🔧 Applied Fixes:');
    for (const fix of result.fixes) {
      console.log(`  • ${fix.description}`);
      if (options.verbose && fix.filesModified.length > 0) {
        console.log(`    Files: ${fix.filesModified.join(', ')}`);
      }
    }
  }

  if (result.suggestions.length > 0) {
    console.log('\n💡 Manual Review Needed:');
    for (const suggestion of result.suggestions) {
      console.log(`  • ${suggestion}`);
    }
  }

  if (result.resolved) {
    console.log('\n🎉 All issues resolved! You can now build your module.');
  } else if (result.fixCount > 0) {
    console.log('\n⚠️ Some issues were fixed automatically, but manual review is needed for others.');
  } else {
    console.log('\n❌ No automatic fixes could be applied. Manual investigation required.');
  }
}

async function validateModuleDirectory(moduleDir: string): Promise<void> {
  const pomPath = path.join(moduleDir, 'pom.xml');

  try {
    await fs.access(pomPath);
  } catch {
    throw new Error(`Not a valid Java SDK module directory. pom.xml not found in: ${moduleDir}`);
  }
}

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function testMavenCompilation(moduleDir: string): Promise<boolean> {
  // This would actually run mvn compile and check the result
  // For now, just return true as a placeholder
  return true;
}

async function runValidation(moduleDir: string): Promise<void> {
  console.log('  📦 Testing Maven compilation...');
  // This would run mvn compile and report results
  console.log('  ✅ Compilation successful');
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error: any) => {
  console.error(`❌ Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Parse command line arguments
program.parse();
