#!/usr/bin/env node

// Test script to simulate MCP tool calls for Document Intelligence
import { detectCompilationIssues } from './dist/detect-compilation-issues.js';
import { updateCustomizationClass } from './dist/update-customization-class.js';

const DI_MODULE_PATH = "c:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence";
const DI_CUSTOMIZATION_FILE = "c:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence\\customization\\src\\main\\java\\DocumentIntelligenceCustomizations.java";

async function testMCPTools() {
    console.log("🧪 Testing Azure SDK Java MCP Tools with Document Intelligence");
    console.log("=".repeat(70));
    console.log(`📁 Module Path: ${DI_MODULE_PATH}`);
    console.log(`📄 Customization File: ${DI_CUSTOMIZATION_FILE}`);
    console.log("");

    try {
        // Step 1: Test detect_compilation_issues
        console.log("\n🔍 Step 1: Running detect_compilation_issues");
        console.log("-".repeat(50));

        const detectionResult = await detectCompilationIssues({
            moduleDirectory: DI_MODULE_PATH,
            cleanFirst: true  // Use clean compile to ensure fresh compilation
        });

        console.log("Detection Result:");
        console.log(detectionResult.content[0].text);

        // Step 2: Test update_customization_class in dry run mode
        console.log("\n🛠️ Step 2: Running update_customization_class (dry run)");
        console.log("-".repeat(50));

        const dryRunResult = await updateCustomizationClass({
            customizationFile: DI_CUSTOMIZATION_FILE,
            moduleDirectory: DI_MODULE_PATH,
            dryRun: true
        });

        console.log("Dry Run Result:");
        console.log(dryRunResult.content[0].text);

        // Step 3: Test update_customization_class (apply changes)
        console.log("\n✅ Step 3: Running update_customization_class (apply changes)");
        console.log("-".repeat(50));

        const applyResult = await updateCustomizationClass({
            customizationFile: DI_CUSTOMIZATION_FILE,
            moduleDirectory: DI_MODULE_PATH,
            dryRun: false
        });

        console.log("Apply Result:");
        console.log(applyResult.content[0].text);

        console.log("\n🎉 MCP Tools Test Complete!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

testMCPTools();
