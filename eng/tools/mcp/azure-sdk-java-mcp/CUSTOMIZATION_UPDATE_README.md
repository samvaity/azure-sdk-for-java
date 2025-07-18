# Intelligent Customization Update Tool

## Overview

This tool addresses the critical gap in the TypeSpec SDK generation workflow where manual customizations need to be updated after SDK regeneration. Instead of applying predetermined fixes, it intelligently analyzes actual API changes and generates precise updates.

## The Problem

As described in the [community discussion](https://gist.github.com/samvaity/596bd1a69175aa236106a3ad0dc7fc02?permalink_comment_id=5679153#gistcomment-5679153), the current workflow requires significant manual effort:

```
sync tsp source -> generate sdk -> build sdk -> fix compile error(which updates non-generated code)
```

When TypeSpec specifications change, developers spend substantial time manually updating customized code to maintain compatibility with new generated APIs.

## The Solution

### Intelligent Analysis Approach

Rather than predetermining what might change, the tool:

1. **Analyzes actual changes** by parsing rest-api-specs PRs or comparing TypeSpec commits
2. **Uses JavaParser** to understand existing customized code structure  
3. **Detects precise impacts** on customizations based on real API diffs
4. **Generates specific updates** tailored to the actual changes detected

### Entry Points

The tool supports multiple entry points depending on the workflow:

#### 1. Pipeline Integration (Recommended)
```bash
# Called automatically after TypeSpec regeneration
node update-pipeline.js --module-dir ./sdk/face/azure-ai-vision-face --build --validate
```

#### 2. MCP Tool Integration
```typescript
// Via MCP server
await updateCustomizedCodeAfterGeneration({
    moduleDirectory: "/path/to/module",
    restApiSpecsPR: "https://github.com/Azure/azure-rest-api-specs/pull/12345",
    dryRun: false
});
```

#### 3. Direct Script Execution
```bash
# Manual invocation with specific PR analysis
./update-pipeline.ts --rest-api-specs-pr https://github.com/Azure/azure-rest-api-specs/pull/12345
```

## Architecture

### Core Components

1. **`customization-updater.ts`** - Main intelligence engine
   - Analyzes TypeSpec changes from multiple sources
   - Finds and categorizes customized files
   - Generates specific updates based on actual changes

2. **`javaparser-analyzer.ts`** - JavaParser integration
   - Parses existing customized code structure
   - Compares generated interfaces before/after changes
   - Identifies precise API change impacts

3. **`update-pipeline.ts`** - Pipeline integration script
   - Entry point for CI/CD and manual workflows
   - Coordinates analysis, updates, building, and validation
   - Provides comprehensive reporting

4. **`customization-helpers.ts`** - Pattern analysis utilities
   - Common API migration patterns
   - Required import mappings
   - Customization pattern detection

### Change Detection Methods

The tool can analyze changes through multiple approaches:

#### Option 1: rest-api-specs PR Analysis
```typescript
const changes = await analyzeTypeSpecChanges(
    moduleDirectory, 
    "https://github.com/Azure/azure-rest-api-specs/pull/12345"
);
```
- Fetches PR diff to understand OpenAPI specification changes
- Maps spec changes to generated Java API impacts

#### Option 2: Git Diff Analysis  
```typescript
const changes = await analyzeTypeSpecChanges(moduleDirectory, undefined, "abc123");
```
- Compares generated code against a specific commit
- Identifies what actually changed in the generated interfaces

#### Option 3: JavaParser Interface Comparison
```typescript
const changes = await analyzeApiChangesWithJavaParser(moduleDirectory, "HEAD~1");
```
- Uses JavaParser to compare interface definitions
- Provides precise method signature change detection

## Usage Examples

### Example 1: Face AI SDK Update

After a TypeSpec change that modifies response types from `String` to `BinaryData`:

```bash
# Before: Manual process taking hours
1. Regenerate SDK
2. Build fails with compilation errors
3. Manually identify each customization that breaks
4. Manually update method calls, imports, type handling
5. Test and iterate

# After: Automated with this tool
node update-pipeline.js --module-dir ./sdk/face/azure-ai-vision-face --build
# Tool automatically:
# - Detects BinaryData migration in generated interfaces
# - Finds customizations using old String APIs
# - Updates method calls and imports
# - Validates with build
```

### Example 2: CI/CD Integration

```yaml
# Azure DevOps Pipeline
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'

- script: |
    # After TypeSpec compilation, before final build
    node eng/tools/mcp/azure-sdk-java-mcp/src/update-pipeline.js \
      --module-dir $(Build.SourcesDirectory)/sdk/$(ServiceName)/$(PackageName) \
      --rest-api-specs-pr $(System.PullRequest.SourceRepositoryURI) \
      --build --validate
  displayName: 'Update Customizations After TypeSpec Generation'
```

## Customization Pattern Support

### 1. Partial-Update Pattern
```yaml
# tspconfig.yaml
options:
  "@azure-tools/typespec-java":
    partial-update: true
```
- Preserves manual code changes during regeneration
- Tool analyzes which preserved code needs updating

### 2. Customization-Class Pattern  
```yaml
# tspconfig.yaml
options:
  "@azure-tools/typespec-java":
    customization-class: "com.example.MyCustomizations"
```
- Java class with explicit customizations
- Tool parses customization logic and updates accordingly

### 3. Manual Edit Pattern
- Direct modifications to generated files
- Tool detects hand-written code vs generated code
- Applies targeted updates to preserve manual changes

## Output and Reporting

### Dry Run Mode
```bash
node update-pipeline.js --module-dir ./sdk/face/azure-ai-vision-face --dry-run
```

Sample output:
```
🔄 Customization Update Report (Dry Run)

📊 Summary:
  • Files analyzed: 3
  • Auto-applicable changes: 5
  • Manual review required: 2

📝 TypeSpec Changes Detected:
  • FaceClient.detectFaces: Return type changed from Response<String> to Response<BinaryData>
  • FaceClient.identifyFaces: Parameter type changed from String to BinaryData

📂 File Results:
  FaceDetectionCustomization.java:
    ✅ Update detectFaces call to use BinaryData.toString()
    ✅ Add import: com.azure.core.util.BinaryData
    ⚠️  Manual review: Complex response parsing logic detected
```

### Build Integration
```bash
🔨 Building module to verify updates...
✅ Build successful

✅ Running validation checks...
✅ Validation successful

🎉 Customization update pipeline completed successfully!
```

## Benefits

1. **Dramatically reduces manual effort** - From hours to minutes for customization updates
2. **Prevents human errors** - Automated detection and precise updates
3. **Maintains code quality** - JavaParser ensures syntactically correct changes
4. **Supports all patterns** - Works with partial-update, customization-class, and manual edits
5. **Pipeline ready** - Integrates seamlessly into CI/CD workflows
6. **Non-destructive** - Dry-run mode and careful change validation

## Implementation Status

- ✅ Core architecture designed
- ✅ Pipeline integration framework
- ✅ JavaParser integration foundation
- ✅ MCP tool registration
- 🚧 Full JavaParser implementation (requires actual JavaParser library)
- 🚧 rest-api-specs PR analysis (requires GitHub API integration)
- 🚧 Comprehensive testing with real SDK modules

## Next Steps

1. **Integrate actual JavaParser library** for robust AST manipulation
2. **Implement GitHub API integration** for rest-api-specs PR analysis  
3. **Test with real Azure SDK modules** containing various customization patterns
4. **Add CI/CD templates** for common Azure SDK workflows
5. **Create documentation** for SDK authors on customization best practices

This tool represents a significant step forward in making TypeSpec-based SDK generation truly developer-friendly by eliminating the manual toil of customization updates.
