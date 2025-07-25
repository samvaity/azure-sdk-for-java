#!/usr/bin/env node

// Test script for the new hybrid approach
import { updateCustomizationClassHybrid } from './dist/update-customization-class-hybrid.js';

const DI_CUSTOMIZATION_FILE = "c:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence\\customization\\src\\main\\java\\DocumentIntelligenceCustomizations.java";

async function testHybridApproach() {
    console.log("🚀 Testing Hybrid Approach: Cookbook Detection + LLM Generation");
    console.log("=".repeat(70));
    console.log(`📄 Customization File: ${DI_CUSTOMIZATION_FILE}`);
    console.log("");

    try {
        const result = await updateCustomizationClassHybrid({
            customizationFile: DI_CUSTOMIZATION_FILE,
            validateWorkflow: true  // Run full validation workflow
        });

        console.log("Result:");
        console.log(result.content[0].text);

        console.log("\n🎉 Hybrid Test Complete!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

testHybridApproach();
