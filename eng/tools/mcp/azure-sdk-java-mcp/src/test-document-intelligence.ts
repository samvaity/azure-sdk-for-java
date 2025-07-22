/**
 * SIMPLE POC: Test azure-sdk-mcp CLI integration with Document Intelligence
 *
 * This POC demonstrates:
 * 1. Calling azure-sdk-mcp CLI for TypeSpec operations
 * 2. Java MCP handling Java-specific operations on a real project
 */

import { generateJavaSdk } from "./generate-java-sdk";

async function testDocumentIntelligence() {
    console.log("🧪 Testing Azure SDK MCP with Document Intelligence Project");
    console.log("===========================================================\n");

    const documentIntelligenceDir = "C:\\Users\\savaity\\IdeaProjects\\azure-sdk-for-java\\sdk\\documentintelligence\\azure-ai-documentintelligence";

    console.log(`📁 Testing with: ${documentIntelligenceDir}`);
    console.log(`📋 Project has: tsp-location.yaml, pom.xml, existing Java source\n`);

    try {
        console.log("🚀 Running POC...\n");

        const result = await generateJavaSdk(documentIntelligenceDir, true);

        console.log("📊 POC Results:");
        console.log("===============");

        if (result.content && result.content[0] && result.content[0].text) {
            console.log(result.content[0].text);
        } else {
            console.log("❌ No content returned");
        }

    } catch (error) {
        console.error("❌ POC failed:", error);
    }
}

// Run the test
console.log("🎯 Azure SDK MCP POC - Document Intelligence");
console.log("===========================================");

testDocumentIntelligence().then(() => {
    console.log("\n✅ POC completed");
}).catch((error) => {
    console.error("❌ POC error:", error);
});
