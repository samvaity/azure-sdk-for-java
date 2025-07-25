#!/usr/bin/env node

// Simple test for the new cookbook-based customization updater
import { updateCustomizationClass } from './dist/update-customization-class-v2.js';

const DI_CUSTOMIZATION_FILE = "c:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence\\customization\\src\\main\\java\\DocumentIntelligenceCustomizations.java";

async function testCookbookApproach() {
    console.log("🧪 Testing Cookbook-Based Customization Updater");
    console.log("=".repeat(70));
    console.log(`📄 Customization File: ${DI_CUSTOMIZATION_FILE}`);
    console.log("");

    try {
        const result = await updateCustomizationClass({
            customizationFile: DI_CUSTOMIZATION_FILE
        });

        console.log("Result:");
        console.log(result.content[0].text);

        console.log("\n🎉 Cookbook Test Complete!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

testCookbookApproach();
