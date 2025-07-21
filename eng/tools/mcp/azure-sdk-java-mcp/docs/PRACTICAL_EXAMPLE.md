# TypeSpec SDK Generation with Customizations - Practical Example

This example demonstrates how the `generate_with_customizations` tool solves the real-world problem described in the [GitHub gist](https://gist.github.com/samvaity/596bd1a69175aa236106a3ad0dc7fc02?permalink_comment_id=5679153#gistcomment-5679153).

## Scenario: Communication Messages SDK

Let's say you're working on the Azure Communication Messages SDK and have made manual customizations that need to be preserved during TypeSpec regeneration.

### Before: Manual Process (Error-Prone)

```bash
# Old workflow - customizations get lost
cd /sdk/communication/azure-communication-messages
tsp-client generate  # ❌ Overwrites customizations
mvn compile          # ❌ Build fails due to missing customizations
# Manual fix required: restore customizations and fix conflicts
```

### After: AI-Enhanced Workflow

```bash
# New workflow - customizations preserved and updated
generate_with_customizations \
  --moduleDirectory "/workspace/azure-sdk-for-java/sdk/communication/azure-communication-messages" \
  --scope "code-with-changelog" \
  --preserveCustomizations true \
  --validateBuild true \
  --interactiveMode true
```

## Step-by-Step Execution Example

### Input Directory Structure
```
azure-communication-messages/
├── TempTypeSpecFiles/           # TypeSpec source files
├── customization.json           # Manual customizations
├── src/main/java/              # Existing generated code
├── pom.xml                     # Maven configuration
└── CHANGELOG.md                # Version history
```

### Tool Execution Flow

#### Step 1: Pre-Generation Analysis
```
🔄 TypeSpec SDK Generation with Customizations

📁 Module Directory: /workspace/azure-sdk-for-java/sdk/communication/azure-communication-messages
🎯 Scope: code-with-changelog
🛡️ Preserve Customizations: true
✅ Validate Build: true
🔄 Interactive Mode: true

## Step 1: Pre-Generation Analysis

📋 Found customization file: customization.json
🔧 Existing customizations: 3
```

#### Step 2: Backup Customizations
```
## Step 2: Backup Customizations

💾 Customizations backed up successfully
```

The tool creates: `customization.json.backup.1642781234567`

#### Step 3: SDK Generation (Deterministic)
```
## Step 3: SDK Generation (Deterministic)

✅ tsp-client generate completed successfully
📊 Generation output:
[2025-01-21 10:30:15] Starting TypeSpec compilation...
[2025-01-21 10:30:18] Generating Java client files...
[2025-01-21 10:30:22] Writing output to src/main/java...
[2025-01-21 10:30:25] TypeSpec generation completed successfully
```

#### Step 4: Customization Analysis & Update (Interactive)
```
## Step 4: Customization Analysis & Update (Interactive)

🤖 **AI-Assisted Customization Analysis Required**

The following customizations were found and may need updates:
- MediaMessageContent.mediaUri → MediaMessageContent.mediaUrl
- WhatsAppMessageButton.payload → WhatsAppMessageButton.data  
- ChatMessage.timestamp → ChatMessage.sentOn

📁 Customization file: customization.json

🔍 **Analysis Needed:**
1. Compare generated code with previous version
2. Identify if customizations still apply
3. Update customization syntax if API changed
4. Add new customizations for new issues

💡 **Common Customization Updates After Regeneration:**
- Import statements changed
- Package names updated
- Method signatures modified
- Class names renamed
- New dependencies required
```

#### Step 5: Build Validation
```
## Step 5: Build Validation

🔧 Build validation found issues:
[ERROR] /src/main/java/com/azure/communication/messages/models/MediaMessageContent.java:[45,20] 
cannot find symbol: mediaUri()
[ERROR] /src/main/java/com/azure/communication/messages/models/WhatsAppMessageButton.java:[32,15]
cannot find symbol: getPayload()

🤖 **LLM Assistance Required**
Please analyze the build errors above and help update the customization file.
The errors typically indicate:
- Missing imports after regeneration
- Changed method signatures  
- Renamed or moved classes
- Updated package structures

Customization file location: customization.json
```

### AI-Assisted Customization Update

The LLM would analyze the errors and suggest updates to `customization.json`:

```json
{
  "modifications": [
    {
      "target": "MediaMessageContent", 
      "type": "rename-method",
      "from": "mediaUri",
      "to": "mediaUrl",
      "reason": "API renamed mediaUri to mediaUrl in latest TypeSpec"
    },
    {
      "target": "WhatsAppMessageButton",
      "type": "rename-method", 
      "from": "getPayload",
      "to": "getData",
      "reason": "Payload property renamed to data in TypeSpec update"
    },
    {
      "target": "ChatMessage",
      "type": "rename-property",
      "from": "timestamp", 
      "to": "sentOn",
      "reason": "Timestamp property standardized to sentOn across all message types"
    }
  ]
}
```

#### Step 6: Changelog Update
```
## Step 6: Changelog Update

📝 Changelog update is included in scope - use update_java_sdk_changelog tool after build succeeds
```

#### Step 7: Final Summary
```
## Step 7: Generation Contract Summary

📋 **Standardized Output Contract:**
- Scope: code-with-changelog
- Generated: Source code + changelog
- Customizations: Preserved & Updated
- Build Status: Validated
- Manual Steps Required: Yes (customization updates)

🎉 **Generation with customizations completed!**
```

## Cross-Language Consistency

The same workflow applies to other Azure SDK languages:

### .NET Example
```bash
generate_with_customizations \
  --moduleDirectory "/workspace/azure-sdk-for-net/sdk/communication/Azure.Communication.Messages" \
  --scope "code-with-changelog"
```

### Python Example  
```bash
generate_with_customizations \
  --moduleDirectory "/workspace/azure-sdk-for-python/sdk/communication/azure-communication-messages" \
  --scope "code-with-changelog"
```

### JavaScript Example
```bash
generate_with_customizations \
  --moduleDirectory "/workspace/azure-sdk-for-js/sdk/communication/communication-messages" \
  --scope "code-with-changelog"
```

## Benefits Demonstrated

1. **🛡️ No More Lost Customizations**: Systematic backup and restore prevents data loss
2. **🤖 AI-Assisted Updates**: LLM helps update customizations for API changes  
3. **✅ Build Validation**: Immediate feedback on customization conflicts
4. **📋 Consistent Contract**: Same behavior across all SDK languages
5. **🔄 Reproducible Process**: Can be automated in CI/CD pipelines

## Integration with Existing Tools

This tool complements the existing MCP tools:

```bash
# Complete SDK workflow
sync_typespec_source_files --remoteTspConfigUrl "..."
generate_with_customizations --moduleDirectory "..." --scope "code-with-changelog"  
build_java_sdk --moduleDirectory "..." --rootDirectory "..." --groupId "..." --artifactId "..."
update_java_sdk_changelog --jarPath "..." --groupId "..." --artifactId "..."
```

The `generate_with_customizations` tool is the missing piece that makes TypeSpec SDK generation reliable and customization-safe.
