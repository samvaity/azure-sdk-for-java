# Practical Implementation Strategy: Customization Update Tool

## Key Insights from Your Feedback

### 1. **Build Error-Driven Approach** ✅
You're absolutely right - focusing on **actual compilation errors** is much more practical than trying to predict changes:

```bash
# Current Reality:
spec-gen-sdk → SDK generation → mvn compile → ERRORS → manual fixes → success

# Better Approach:
spec-gen-sdk → SDK generation → mvn compile → ERROR ANALYSIS → automated fixes → success
```

### 2. **Integration with Existing Infrastructure**
Based on `azure-rest-api-specs/eng/tools/spec-gen-sdk-runner`, we should:

**Option A: Extend existing `commands.ts`**
```typescript
// In spec-gen-sdk-runner/src/commands.ts
export async function generateSdkForSpecPr(): Promise<number> {
  // ... existing SDK generation ...
  
  // NEW: If Java SDK and compilation errors, try to fix customizations
  if (commandInput.sdkLanguage === "azure-sdk-for-java" && statusCode !== 0) {
    const fixResult = await fixJavaCustomizationErrors(stagedArtifactsFolder);
    if (fixResult.success) {
      statusCode = 0; // Reset success if fixes worked
    }
  }
  
  return statusCode;
}
```

**Option B: Post-SDK-generation hook** (Better for testing)
```typescript
// New module: java-customization-fixer.ts
export async function fixJavaCustomizationErrors(moduleDirectory: string) {
  // 1. Try to build
  const buildResult = await runMavenBuild(moduleDirectory);
  
  // 2. If errors, analyze them
  if (buildResult.hasErrors) {
    const fixes = await analyzeAndFixErrors(buildResult.errors);
    return fixes;
  }
  
  return { success: true, fixes: [] };
}
```

### 3. **Cookbook/Prompts vs JavaParser**

You're right to question JavaParser complexity. **Hybrid approach** is better:

**Phase 1: Build Error Analysis + Simple Fixes** (Immediate value)
- Parse Maven compilation errors
- Apply common fixes for known patterns
- Provide intelligent suggestions for complex cases

**Phase 2: Add JavaParser** (Future enhancement)
- Only for complex refactoring scenarios
- When simple pattern matching isn't sufficient

## Revised Architecture

### Build-Error-Driven Implementation

```typescript
interface CompilationError {
  file: string;
  line: number;
  message: string;
  type: 'missing_import' | 'missing_method' | 'type_mismatch' | 'unknown';
}

// Focus on real errors, not predicted changes
async function analyzeCompilationErrors(moduleDirectory: string): Promise<CompilationError[]> {
  const buildResult = await runCommand('mvn compile', { cwd: moduleDirectory });
  
  if (buildResult.success) {
    return []; // No errors to fix
  }
  
  return parseMavenErrors(buildResult.stderr);
}

// Apply fixes for common error patterns
async function applyAutomaticFixes(errors: CompilationError[]): Promise<FixResult[]> {
  const fixes: FixResult[] = [];
  
  for (const error of errors) {
    if (error.message.includes('cannot find symbol: class BinaryData')) {
      // Add import
      fixes.push(await addImport(error.file, 'com.azure.core.util.BinaryData'));
    }
    else if (error.message.includes('incompatible types: java.lang.String cannot be converted to BinaryData')) {
      // Suggest BinaryData.fromString() wrapper
      fixes.push(await suggestBinaryDataConversion(error));
    }
    // ... other common patterns
  }
  
  return fixes;
}
```

### Integration Strategy

**Extend existing `spec-gen-sdk-runner` in minimal way:**

```typescript
// In azure-rest-api-specs/eng/tools/spec-gen-sdk-runner/src/commands.ts

async function generateSdkForSpecPr(): Promise<number> {
  // ... all existing logic unchanged ...
  
  // NEW: Only for Java SDK, only if there were issues
  if (commandInput.sdkLanguage === "azure-sdk-for-java" && statusCode !== 0) {
    console.log("Attempting to fix Java customization issues...");
    
    try {
      const fixResult = await import('./java-customization-fixer.js')
        .then(m => m.fixJavaCustomizationErrors(stagedArtifactsFolder));
      
      if (fixResult.success) {
        console.log(`Fixed ${fixResult.fixes.length} customization issues`);
        statusCode = 0; // Reset to success
      } else {
        console.log("Customization fixes applied, but manual review needed");
        // Keep original status code
      }
    } catch (error) {
      console.log(`Customization fixer failed: ${error.message}`);
      // Keep original status code, don't make things worse
    }
  }
  
  return statusCode;
}
```

### Progressive Implementation

**Week 1: Error Analysis Foundation**
```typescript
// java-customization-fixer.ts - Minimal viable version
export async function fixJavaCustomizationErrors(moduleDirectory: string) {
  // 1. Run mvn compile and capture errors
  // 2. Parse common error patterns
  // 3. Apply simple text-based fixes
  // 4. Return success/failure report
}
```

**Week 2: Common Fix Patterns**
```typescript
// Add specific fixes for:
// - Missing BinaryData imports
// - String → BinaryData conversions
// - Response<Void> → Response<BinaryData>
// - Context parameter additions
```

**Week 3: Intelligent Suggestions**
```typescript
// For complex cases:
// - Generate cookbook-style suggestions
// - Create diff patches for manual review
// - Integration with existing VSO logging
```

## Unified Tool Architecture

**Single Tool, Multiple Entry Points**: One codebase that serves all workflows:

```typescript
// Core logic in java-customization-fixer.ts
export async function fixJavaCustomizationErrors(moduleDirectory: string): Promise<FixResult> {
  // Common logic for both CI and local development
}

// CLI entry point (local development)
export async function runCli(args: CliArgs): Promise<void> {
  const result = await fixJavaCustomizationErrors(args.moduleDir);
  displayResults(result);
}

// Integration function (CI/CD pipeline)
export async function tryFixJavaCustomizations(options: IntegrationOptions): Promise<boolean> {
  const result = await fixJavaCustomizationErrors(options.moduleDirectory);
  return result.resolved;
}
```

**Entry Points by Use Case:**

1. **Local Development** → `npx java-customization-fixer --module-dir ./sdk/face/azure-ai-vision-face`
2. **CI/CD Pipeline** → `import { tryFixJavaCustomizations } from './java-customization-fixer.js'`
3. **MCP Server** → Exposed as MCP tool for AI assistants
4. **PowerShell Integration** → `./fix-customizations.ps1` wrapper script

## Benefits of This Approach

1. **Single Codebase**: No duplication, easier maintenance
2. **Immediate Value**: Fixes real, current problems
3. **Low Risk**: Only activates when builds already failing
4. **Minimal Integration**: Small addition to existing pipeline
5. **Iterative**: Can enhance sophistication over time
6. **Measurable**: Clear success metrics (build failures → successes)

## Local Development Workflow

### Daily Developer Scenarios

#### Scenario 1: TypeSpec Update in Local Development

```bash
# Developer workflow after pulling TypeSpec changes:
cd ./sdk/communication/azure-communication-messages

# 1. Regenerate SDK (existing workflow)
tsp compile

# 2. Try to build (will likely fail with customization errors)
mvn compile
# ERROR: cannot find symbol: class BinaryData
# ERROR: method createMessage(String) cannot be applied to createMessage(BinaryData)

# 3. Run our customization fixer locally
npx java-customization-fixer --module-dir .
# ✅ Fixed 3 missing imports
# ✅ Updated 2 method signatures  
# ⚠️ 1 complex change needs manual review

# 4. Build again to verify
mvn compile
# ✅ Build successful
```

#### Scenario 2: Quick Diagnosis

```bash
# Just want to see what's wrong without fixing
npx java-customization-fixer --diagnose --module-dir ./sdk/face/azure-ai-vision-face

# Output:
# 📋 Customization Analysis:
# ❌ 5 compilation errors found
# 🔧 3 can be fixed automatically
# ⚠️ 2 require manual review
# 📝 Suggestions available
```

#### Scenario 3: Integration with Existing Scripts

```bash
# Existing azure-sdk-for-java repo scripts can call our tool
./eng/scripts/TypeSpec-Project-Generate.ps1 MyService
# After generation, automatically runs: 
# .\eng\tools\mcp\azure-sdk-java-mcp\fix-customizations.ps1 -ModuleDirectory $ModuleDir
```

### Integration with azure-sdk-for-java Repository

The tool integrates seamlessly with existing repository workflows:

#### Package.json bin entry

```json
{
  "bin": {
    "java-customization-fixer": "dist/cli.js"
  }
}
```

#### PowerShell wrapper

```powershell
# fix-customizations.ps1 - Integrates with existing PS1 scripts
./fix-customizations.ps1 -ModuleDirectory ./sdk/face/azure-ai-vision-face -Validate
```

#### Existing eng/ scripts

```powershell
# Could be added to TypeSpec-Project-Generate.ps1
if (Test-Path "$ModuleDirectory/customization" -or $HasCustomizations) {
    Write-Host "🔧 Checking for customization issues..."
    & npx java-customization-fixer --module-dir $ModuleDirectory --validate
}
```

This approach:

- ✅ **Single tool** serves all use cases
- ✅ **Zero duplication** between CI and local workflows  
- ✅ **Familiar integration** with existing azure-sdk-for-java patterns
- ✅ **Progressive adoption** - can be added to existing scripts gradually
- ✅ **Consistent behavior** across all environments

**Key Result**: Single unified codebase that works seamlessly across all development scenarios - no need for separate CI vs local tools!

# Apply fixes step by step:
npx @azure/java-customization-fixer --module-dir . --fix-imports
npx @azure/java-customization-fixer --module-dir . --fix-types
npx @azure/java-customization-fixer --module-dir . --validate
```

### Integration Points for Local Development

#### Option A: Standalone NPM Package

```json
// Package could be published as standalone tool
{
  "name": "@azure/java-customization-fixer",
  "bin": {
    "java-customization-fixer": "./dist/cli.js"
  }
}
```

#### Option B: Integration with azure-sdk-for-java Scripts

```bash
# Add to existing eng/scripts/
./eng/scripts/fix-customizations.ps1 -ModuleDirectory ./sdk/face/azure-ai-vision-face
```

#### Option C: VS Code Extension Integration

```typescript
// Command palette: "Azure SDK: Fix Customization Errors"
// Automatically detects current Java module and applies fixes
```

## Sample Integration with Existing Code

Looking at the `spec-gen-sdk-runner` structure, the integration point would be:

```typescript
// In commands.ts, after line 166 where execution report is processed:

try {
  executionReport = getExecutionReport(commandInput);
  currentExecutionResult = executionReport.executionResult;
  
  // NEW: Java-specific customization fixing
  if (commandInput.sdkLanguage === "azure-sdk-for-java" && 
      currentExecutionResult === "failed") {
    
    const customizationFixes = await tryFixJavaCustomizations({
      moduleDirectory: stagedArtifactsFolder,
      executionReport: executionReport
    });
    
    if (customizationFixes.resolved) {
      currentExecutionResult = "succeeded";
      logMessage(`Fixed ${customizationFixes.fixCount} customization issues automatically`);
    } else if (customizationFixes.partialFixes > 0) {
      logMessage(`Applied ${customizationFixes.partialFixes} fixes, manual review needed`);
    }
  }
  
  // ... continue with existing logic
}
```

This approach:

- ✅ Focuses on real compilation errors (not predictions)
- ✅ Integrates with existing infrastructure minimally  
- ✅ Provides immediate value for the most common pain points
- ✅ Can evolve to more sophisticated analysis over time
- ✅ Low risk (only helps, doesn't hurt existing workflow)
