# TypeSpec Sync Cookbook

## Overview

This cookbook provides step-by-step instructions for resolving compilation issues when TypeSpec updates break Azure SDK Java customizations. It follows the **MCP Orchestration** approach, using multiple specialized tools coordinated through AI inference.

## Prerequisites

Before starting the synchronization process, ensure you have:

1. **Maven** installed and available in PATH
2. **TypeSpec client tools** (`tsp-client`) installed
3. **Java 11+** for compilation
4. **Project structure** with autorest.java customizations
5. **TypeSpec configuration** (`tsp-location.yaml`) present

## Common Scenarios

### Scenario 1: Parameter Name Changes (analyzeDocumentOptions → analyzeDocumentRequest)

**Symptoms:**
- Compilation errors: `cannot find symbol: variable analyzeDocumentOptions`
- Errors in generated client files (DocumentIntelligenceAsyncClient.java, DocumentIntelligenceClient.java)

**Solution Steps:**

1. **Environment Validation**
   ```bash
   # Verify Maven is available
   mvn --version
   
   # Check project structure
   ls -la pom.xml customization/ tsp-location.yaml
   ```

2. **Analyze Current State**
   ```bash
   # Run compilation to identify errors
   mvn clean compile
   ```

3. **Apply Fixes**
   - Update customization files to replace `analyzeDocumentOptions` with `analyzeDocumentRequest`
   - Modify AST transformations in DocumentIntelligenceCustomizations.java
   - Ensure all method bodies are updated consistently

4. **Verification**
   ```bash
   # Verify fixes work
   mvn clean compile
   ```

### Scenario 2: Class Name Changes (Options → Request pattern)

**Symptoms:**
- Import errors for classes ending in "Options"
- Type mismatch errors in method signatures

**Solution Steps:**

1. **Identify Pattern**
   - Look for classes like `AnalyzeBatchDocumentsOptions` → `AnalyzeBatchDocumentsRequest`
   - Check import statements and type references

2. **Update References**
   - Update customization code to use new class names
   - Modify import statements
   - Update method parameter types

3. **Test Compilation**
   - Ensure all references are updated
   - Verify no breaking changes in public API

### Scenario 3: Method Signature Changes

**Symptoms:**
- Method override errors
- Parameter count mismatches
- Return type incompatibilities

**Solution Steps:**

1. **Compare Signatures**
   - Check generated base classes for method signature changes
   - Identify parameter additions, removals, or type changes

2. **Update Customizations**
   - Modify overridden method signatures to match
   - Update method implementations accordingly
   - Ensure backward compatibility where possible

## Automated Workflow

### Using MCP Tools

```typescript
// 1. Orchestrated synchronization
const result = await conductTypeSpecSync({
    projectPath: '/path/to/azure-sdk-project',
    dryRun: false,
    verbose: true
});

// 2. Manual step-by-step approach
const envCheck = await validateEnvironment(projectPath);
const analysis = await runCompilationAnalysis(projectPath);
const config = await analyzeTypeSpecConfig(projectPath);
```

### Tool Selection Guide

| Tool | When to Use | Input | Output |
|------|-------------|-------|--------|
| `conductTypeSpecSync` | Complete orchestration | Project path | Full sync result |
| `validateEnvironment` | Pre-flight checks | Project path | Validation status |
| `runCompilationAnalysis` | Error identification | Project path | Error analysis |
| `parseCompilationErrors` | Manual error parsing | Maven output | Structured errors |

## Fix Patterns

### Pattern 1: Simple Text Replacement

```java
// Before (in customization)
if (bodyStr.contains("analyzeDocumentOptions")) {
    bodyStr = bodyStr.replace("analyzeDocumentOptions", "analyzeDocumentRequest");
}
```

### Pattern 2: AST Transformation

```java
// Before (using JavaParser)
method.getBody().ifPresent(body -> {
    String bodyStr = body.toString();
    if (bodyStr.contains("analyzeDocumentOptions")) {
        bodyStr = bodyStr.replace("analyzeDocumentOptions", "analyzeDocumentRequest");
        method.setBody(StaticJavaParser.parseBlock(bodyStr));
    }
});
```

### Pattern 3: Semantic Code Transformation (Future Enhancement)

```java
// Using OpenRewrite for semantic transformations
// This would handle more complex refactoring scenarios
Recipe recipe = new ReplaceParameterNames()
    .withOldName("analyzeDocumentOptions")
    .withNewName("analyzeDocumentRequest");
```

## Troubleshooting Guide

### Common Issues

1. **Environment Issues**
   - Maven not found: Install Maven and add to PATH
   - TypeSpec tools missing: Install `@azure-tools/typespec-client-generator-cli`
   - Java version: Ensure Java 11+ is available

2. **Project Structure Issues**
   - Missing customization directory: Verify autorest.java setup
   - Invalid tsp-location.yaml: Check TypeSpec configuration
   - Incorrect project path: Ensure pointing to correct directory

3. **Compilation Issues**
   - Persistent errors after fixes: Check for missed references
   - Import issues: Verify package structure matches
   - Method signature mismatches: Compare with generated base classes

### Debugging Steps

1. **Enable Verbose Logging**
   ```typescript
   const result = await conductTypeSpecSync({
       projectPath,
       verbose: true
   });
   ```

2. **Run Dry Run First**
   ```typescript
   const result = await conductTypeSpecSync({
       projectPath,
       dryRun: true
   });
   ```

3. **Manual Error Analysis**
   ```bash
   mvn clean compile > compilation-output.log 2>&1
   # Then analyze compilation-output.log
   ```

## Best Practices

### Before Making Changes

1. **Backup your customizations**
   ```bash
   git stash push -m "Pre-typespec-sync backup"
   ```

2. **Understand the changes**
   - Review TypeSpec commit differences
   - Check for breaking changes in the spec
   - Understand impact on public API

3. **Test incrementally**
   - Apply fixes one pattern at a time
   - Test compilation after each change
   - Verify functionality with unit tests

### After Applying Fixes

1. **Full verification**
   ```bash
   mvn clean compile test
   ```

2. **API compatibility check**
   - Ensure public API remains compatible
   - Check for any unintended changes
   - Validate examples and documentation

3. **Integration testing**
   - Test with actual service calls
   - Verify client behavior matches expectations
   - Check for any runtime issues

## Integration with OpenRewrite (Future Enhancement)

For more sophisticated code transformations, consider integrating with OpenRewrite:

```xml
<plugin>
    <groupId>org.openrewrite.maven</groupId>
    <artifactId>rewrite-maven-plugin</artifactId>
    <version>5.3.0</version>
    <configuration>
        <activeRecipes>
            <recipe>com.azure.sdk.java.RenameParameterNames</recipe>
        </activeRecipes>
    </configuration>
</plugin>
```

This would enable:
- Semantic-aware refactoring
- Type-safe transformations  
- Complex code restructuring
- Automated API evolution

## Examples

### Document Intelligence Specific

The example in this workspace demonstrates:
- SHA update: `74d0cc137b23cbaab58baa746f182876522e88a0`
- Parameter name change: `analyzeDocumentOptions` → `analyzeDocumentRequest`
- 20+ compilation errors resolved automatically
- Customization file updates applied seamlessly

### Usage Command

```bash
# Run the orchestrated synchronization
npm run typespec:sync

# Or use the demo script
npm run demo:typespec-sync
```

## Support

For issues not covered by this cookbook:

1. Check project documentation
2. Review TypeSpec specification changes
3. Analyze generated code differences
4. Consider manual intervention for complex cases
5. Consult with Azure SDK engineering team

## Contributing

To improve this cookbook:

1. Document new error patterns discovered
2. Add fix strategies for additional scenarios
3. Enhance automation capabilities
4. Share lessons learned from real-world usage
