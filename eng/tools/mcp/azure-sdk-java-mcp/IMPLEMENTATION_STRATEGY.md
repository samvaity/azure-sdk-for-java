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

## Team Architecture Feedback Analysis

**Key Insight from Weidong & Haoling**: We need to distinguish between:

1. **SDK Validation Pipeline** (deterministic, no agent/LLM)
2. **Dev Inner Loop** (agent-powered, LLM-enhanced)

**Critical Decision**: Should customization fixing be purely deterministic scripts OR leverage LLM capabilities?

### Option A: Pure Deterministic (Current Implementation)
```typescript
// spec-gen-sdk-runner integration - deterministic only
if (compilationErrors.length > 0) {
  const fixes = applyKnownPatterns(errors); // Fixed pattern matching
  return fixes;
}
```

### Option B: LLM-Enhanced (Agent-Powered)
```typescript
// MCP tool with LLM assistance
export async function fixJavaCustomizationErrors(moduleDirectory: string) {
  const errors = await getCompilationErrors(moduleDirectory);
  
  // Deterministic fixes first
  const automaticFixes = await applyKnownPatterns(errors);
  
  // LLM-enhanced for complex cases
  const complexErrors = errors.filter(e => !automaticFixes.includes(e));
  if (complexErrors.length > 0) {
    const llmSuggestions = await generateIntelligentFixes(complexErrors);
    return { automaticFixes, llmSuggestions };
  }
  
  return { automaticFixes };
}
```

**Haoling's Point**: Language-specific tasks like "update customized SDK", "generate runnable tests" can leverage LLM power that scripts cannot provide.

## Architectural Decision: Agent-Enhanced vs Pure Deterministic

Based on the team feedback, we have **two distinct scenarios**:

### Scenario 1: SDK Validation Pipeline (No Agent)
- Runs in CI/CD without human interaction
- Must be 100% deterministic and reliable
- **Recommendation**: Pure script-based fixes with known patterns

### Scenario 2: Dev Inner Loop (Agent-Powered)
- Developer working with AI assistant (Copilot, etc.)
- Can leverage LLM for complex reasoning
- **Recommendation**: MCP tools with LLM enhancement capabilities

## Recommended Hybrid Architecture

```typescript
// Core deterministic engine (shared by both scenarios)
export async function fixJavaCustomizationErrors(
  moduleDirectory: string, 
  options: { enableLLM?: boolean }
): Promise<FixResult> {
  
  // Always start with deterministic fixes
  const deterministicFixes = await applyKnownPatterns(errors);
  
  // For dev inner loop, enhance with LLM
  if (options.enableLLM && hasComplexErrors(errors)) {
    const llmEnhanced = await generateIntelligentSuggestions(errors);
    return { ...deterministicFixes, llmEnhanced };
  }
  
  return deterministicFixes;
}

// SDK Validation usage (deterministic only)
const pipelineResult = await fixJavaCustomizationErrors(moduleDir, { enableLLM: false });

// Dev Inner Loop usage (LLM-enhanced)
const devResult = await fixJavaCustomizationErrors(moduleDir, { enableLLM: true });
```

## Extended Contract: Modular Integration with spec-gen-sdk-runner

**Answer to Haoling's Question**: Here's how we can extend the contract between `spec-gen-sdk` and language-specific tools to support modular, composable steps:

### Current Contract (Basic)
```json
{
  "generateOptions": {
    "generateScript": {
      "path": "./eng/scripts/TypeSpec-Project-Generate.ps1"
    }
  }
}
```

### Extended Contract (Modular & Composable)
```json
{
  "initOptions": {
    "initScript": {
      "path": "./eng/scripts/TypeSpec-Project-Init.ps1",
      "description": "Initialize environment and dependencies"
    },
    "prepareEnvironment": {
      "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js",
      "args": ["prepare-environment", "--module-dir", "{moduleDirectory}"],
      "description": "Prepare development environment with MCP assistance"
    }
  },
  "generateOptions": {
    "generateScript": {
      "path": "./eng/scripts/TypeSpec-Project-Generate.ps1",
      "description": "Core SDK generation from TypeSpec"
    },
    "updateCustomizations": {
      "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js", 
      "args": ["fix-customizations", "--module-dir", "{moduleDirectory}"],
      "description": "Fix compilation errors in customized code",
      "runAfter": ["generateScript"],
      "optional": true
    },
    "updateChangeLog": {
      "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js",
      "args": ["update-changelog", "--module-dir", "{moduleDirectory}", "--jar-path", "{jarPath}"],
      "description": "Update CHANGELOG.md with API changes",
      "runAfter": ["generateScript"],
      "optional": true
    },
    "generateTests": {
      "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js",
      "args": ["generate-tests", "--module-dir", "{moduleDirectory}"],
      "description": "Generate runnable test cases with AI assistance",
      "runAfter": ["generateScript", "updateCustomizations"],
      "optional": true
    },
    "generateSamples": {
      "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js",
      "args": ["generate-samples", "--module-dir", "{moduleDirectory}"],
      "description": "Generate code samples and documentation",
      "runAfter": ["generateScript"],
      "optional": true
    }
  },
  "validateOptions": {
    "buildSdk": {
      "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js",
      "args": ["build-sdk", "--module-dir", "{moduleDirectory}"],
      "description": "Build and validate SDK compilation"
    },
    "runTests": {
      "path": "mvn",
      "args": ["test", "-f", "{moduleDirectory}/pom.xml"],
      "description": "Execute test suite"
    }
  }
}
```

## Implementation in spec-gen-sdk-runner

### Enhanced Commands.ts Integration
```typescript
// In azure-rest-api-specs/eng/tools/spec-gen-sdk-runner/src/commands.ts

interface ExtendedGenerateOptions {
  generateScript?: ScriptConfig;
  updateCustomizations?: ScriptConfig;
  updateChangeLog?: ScriptConfig;
  generateTests?: ScriptConfig;
  generateSamples?: ScriptConfig;
}

interface ScriptConfig {
  path: string;
  args?: string[];
  description?: string;
  runAfter?: string[];
  optional?: boolean;
}

async function executeModularGeneration(
  language: string, 
  moduleDirectory: string,
  selectedSteps?: string[]
): Promise<ExecutionResult> {
  
  const config = getLanguageConfig(language); // Loads the JSON config above
  const executionPlan = buildExecutionPlan(config, selectedSteps);
  
  const results: StepResult[] = [];
  
  for (const step of executionPlan) {
    console.log(`🔄 Executing: ${step.description}`);
    
    try {
      const result = await executeStep(step, moduleDirectory);
      results.push({ step: step.name, success: true, result });
      
      // If optional step fails, continue
      if (!result.success && step.optional) {
        console.log(`⚠️ Optional step ${step.name} failed, continuing...`);
        continue;
      }
      
      // If required step fails, stop
      if (!result.success) {
        throw new Error(`Required step ${step.name} failed`);
      }
      
    } catch (error) {
      if (step.optional) {
        console.log(`⚠️ Optional step ${step.name} failed: ${error.message}`);
        results.push({ step: step.name, success: false, error: error.message });
      } else {
        throw error;
      }
    }
  }
  
  return { success: true, steps: results };
}

function buildExecutionPlan(config: any, selectedSteps?: string[]): StepConfig[] {
  const allSteps = { ...config.initOptions, ...config.generateOptions };
  
  // If specific steps selected, filter to those
  const stepsToRun = selectedSteps ? 
    Object.entries(allSteps).filter(([name]) => selectedSteps.includes(name)) :
    Object.entries(allSteps);
  
  // Sort by dependencies (runAfter)
  return topologicalSort(stepsToRun);
}

async function executeStep(step: StepConfig, moduleDirectory: string): Promise<StepResult> {
  // Replace template variables in args
  const resolvedArgs = step.args?.map(arg => 
    arg.replace('{moduleDirectory}', moduleDirectory)
       .replace('{jarPath}', findJarPath(moduleDirectory))
  ) || [];
  
  // Execute the script/command
  const result = await runCommand(step.path, resolvedArgs, { cwd: moduleDirectory });
  
  return {
    success: result.exitCode === 0,
    output: result.stdout,
    error: result.stderr
  };
}
```

## Benefits of This Modular Approach

### 1. **Addresses Haoling's Integration Concern**
- `prepareEnvironment` step can leverage MCP/LLM capabilities
- Individual steps can be agent-enhanced while maintaining script compatibility
- Existing PowerShell scripts work alongside new MCP tools

### 2. **Flexible Composition**
```bash
# Run full generation pipeline
spec-gen-sdk --language java --steps=all

# Run only specific steps  
spec-gen-sdk --language java --steps=generateScript,updateCustomizations

# Run for development workflow
spec-gen-sdk --language java --steps=generateScript,generateTests,generateSamples
```

### 3. **Incremental Adoption**
- Start with existing `generateScript` (no changes needed)
- Add new steps one by one as MCP tools are developed  
- Maintain backward compatibility

### 4. **Agent Integration Points**
Each step can internally decide whether to use:
- Pure deterministic scripts (pipeline mode)
- LLM-enhanced processing (agent mode)

Based on execution context and available capabilities.

## Specific Example: Addressing Team Integration Concerns

### How This Solves Haoling's "prepare-environment" Integration Question

**Current Challenge**: How does the existing `prepare-environment.ts` MCP tool integrate with spec-gen-sdk-runner scripts?

**Solution with Extended Contract**:

```typescript
// In prepare-environment.ts (existing MCP tool)
export async function prepareEnvironment(moduleDirectory: string, options: PrepareOptions) {
  // Existing logic that leverages LLM for intelligent environment setup
  // ... complex analysis, dependency resolution, etc.
  
  // Return structured result for spec-gen-sdk-runner consumption
  return {
    success: true,
    environmentReady: true,
    dependenciesInstalled: ['@azure/core', '@azure/identity'],
    recommendations: ['Consider upgrading TypeScript to 5.x'],
    nextSteps: ['Ready for SDK generation']
  };
}

// CLI wrapper for spec-gen-sdk-runner integration
export async function prepareEnvironmentCli(args: string[]) {
  const moduleDir = args[args.indexOf('--module-dir') + 1];
  const result = await prepareEnvironment(moduleDir, { enableLLM: true });
  
  // Output in format expected by spec-gen-sdk-runner
  if (result.success) {
    console.log('✅ Environment preparation completed');
    process.exit(0);
  } else {
    console.error('❌ Environment preparation failed');
    process.exit(1);
  }
}
```

**Integration in spec-gen-sdk-runner**:
```typescript
// spec-gen-sdk-runner automatically calls our tool based on config
const stepResult = await executeStep({
  name: 'prepareEnvironment',
  path: './eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js',
  args: ['prepare-environment', '--module-dir', moduleDirectory],
  description: 'Prepare development environment with MCP assistance'
}, moduleDirectory);

// Result is seamlessly integrated into overall workflow
if (stepResult.success) {
  console.log('✅ Environment ready, proceeding to SDK generation...');
}
```

### Complete Workflow Example

```bash
# Developer runs: 
spec-gen-sdk --language java --module ./sdk/face/azure-ai-vision-face --steps=all

# spec-gen-sdk-runner executes in order:
# 1. prepareEnvironment (MCP + LLM)
# 2. generateScript (existing PowerShell)  
# 3. updateCustomizations (MCP + build error analysis)
# 4. generateTests (MCP + LLM)
# 5. updateChangeLog (MCP + existing logic)

# Each step reports success/failure
# Pipeline stops on required step failure
# Optional steps can fail without breaking workflow
```

## Benefits Summary

1. **No Breaking Changes**: Existing `generateScript` continues to work
2. **Incremental Enhancement**: Add MCP tools one step at a time
3. **Agent Integration**: Each step internally chooses deterministic vs LLM-enhanced mode
4. **Composable Workflows**: Developers can run subsets of steps as needed
5. **Error Isolation**: Step failures don't break entire pipeline if marked optional

This directly addresses the team's concern about **how to integrate MCP tools with existing spec-gen-sdk infrastructure** while maintaining backward compatibility and providing a clear path for agent enhancement.
```

### Extended Contract (Modular & Composable)
```json
{
  "initOptions": {
    "initScript": {
      "path": "./eng/scripts/TypeSpec-Project-Initialize.ps1",
      "supportsAgentMode": true
    }
  },
  "generateOptions": {
    "generateScript": {
      "path": "./eng/scripts/TypeSpec-Project-Generate.ps1",
      "supportsAgentMode": false
    },
    "prepareEnvironment": {
      "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js",
      "command": "prepare-environment",
      "supportsAgentMode": true,
      "mcpTool": true
    },
    "updateCustomizations": {
      "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js", 
      "command": "fix-customizations",
      "supportsAgentMode": true,
      "mcpTool": true,
      "runAfterGeneration": true
    },
    "updateChangeLog": {
      "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js",
      "command": "update-changelog", 
      "supportsAgentMode": true,
      "mcpTool": true
    },
    "generateTests": {
      "path": "./eng/scripts/Generate-Tests.ps1",
      "supportsAgentMode": true,
      "experimental": true
    },
    "generateSamples": {
      "path": "./eng/scripts/Generate-Samples.ps1", 
      "supportsAgentMode": true,
      "experimental": true
    }
  },
  "releaseOptions": {
    "prepareReleaseScript": {
      "path": "./eng/scripts/Prepare-Release.ps1",
      "dependencies": ["updateChangeLog", "generateTests", "generateSamples"]
    }
  }
}
```

### How This Enables Modular Execution

#### Individual Step Execution
```bash
# spec-gen-sdk-runner can call individual steps
spec-gen-sdk --language java --step prepareEnvironment --module ./sdk/face/azure-ai-vision-face
spec-gen-sdk --language java --step updateCustomizations --module ./sdk/face/azure-ai-vision-face  
spec-gen-sdk --language java --step generateTests --module ./sdk/face/azure-ai-vision-face
```

#### Composed Execution
```bash
# Compose multiple steps together
spec-gen-sdk --language java --steps generateScript,updateCustomizations,updateChangeLog
```

#### Agent-Enhanced Mode
```bash
# Enable agent mode for steps that support it
spec-gen-sdk --language java --step prepareEnvironment --agent-mode --module ./sdk/face/azure-ai-vision-face
```

### Implementation in spec-gen-sdk-runner

This extends the existing `commands.ts` to support modular execution:

```typescript
// In azure-rest-api-specs/eng/tools/spec-gen-sdk-runner/src/commands.ts

interface LanguageConfig {
  initOptions?: { [stepName: string]: StepConfig };
  generateOptions: { [stepName: string]: StepConfig };
  releaseOptions?: { [stepName: string]: StepConfig };
}

interface StepConfig {
  path: string;
  command?: string;
  supportsAgentMode?: boolean;
  mcpTool?: boolean;
  runAfterGeneration?: boolean;
  dependencies?: string[];
}

async function executeStep(
  stepName: string, 
  stepConfig: StepConfig, 
  context: ExecutionContext
): Promise<StepResult> {
  
  if (stepConfig.mcpTool) {
    // Execute as MCP tool (supports agent mode)
    return await executeMcpTool(stepConfig, context);
  } else {
    // Execute as traditional script
    return await executeScript(stepConfig, context);
  }
}

async function executeMcpTool(
  stepConfig: StepConfig, 
  context: ExecutionContext
): Promise<StepResult> {
  
  const args = [
    stepConfig.path,
    stepConfig.command,
    '--module-dir', context.moduleDirectory
  ];
  
  // Enable agent mode if supported and requested
  if (stepConfig.supportsAgentMode && context.agentMode) {
    args.push('--agent-mode');
  }
  
  return await executeCommand('node', args);
}
```

### How This Solves Haoling's Concerns

#### 1. **Prepare Environment Integration**

```typescript
// Instead of hardcoded script call:
await executeScript('./eng/scripts/TypeSpec-Project-Generate.ps1');

// Now modular:
await executeStep('prepareEnvironment', languageConfig.generateOptions.prepareEnvironment, context);
```

#### 2. **Agent-Enhanced Steps**

```json
{
  "prepareEnvironment": {
    "path": "./eng/tools/mcp/azure-sdk-java-mcp/dist/cli.js",
    "command": "prepare-environment", 
    "supportsAgentMode": true,
    "mcpTool": true
  }
}
```

The `prepare-environment` tool can now:
- Run deterministically in pipeline mode
- Leverage LLM for complex environment setup in agent mode
- Be called individually or as part of larger workflows

#### 3. **Composable Workflows**

```typescript
// High-level workflow that composes individual steps
async function generateCompleteSDK(context: ExecutionContext): Promise<void> {
  await executeStep('prepareEnvironment', config.generateOptions.prepareEnvironment, context);
  await executeStep('generateScript', config.generateOptions.generateScript, context);
  await executeStep('updateCustomizations', config.generateOptions.updateCustomizations, context);
  await executeStep('updateChangeLog', config.generateOptions.updateChangeLog, context);
}
```

### Benefits of This Approach

1. **✅ Addresses Haoling's Concerns**: Language-specific tools can be MCP-enabled while maintaining script compatibility
2. **✅ Maintains Deterministic Pipeline**: Steps can run in script mode for CI/CD reliability  
3. **✅ Enables Agent Enhancement**: Same steps can leverage LLM in developer inner loop
4. **✅ Modular & Reusable**: Individual steps can be composed into different workflows
5. **✅ Backward Compatible**: Existing scripts continue to work unchanged
6. **✅ Progressive Adoption**: Can migrate steps to MCP tools incrementally
```

## What This Means for Our Implementation

**Immediate Focus**: Build the deterministic foundation that works in **both** scenarios:
- Maven error parsing ✅ 
- Common pattern fixes ✅
- Integration with spec-gen-sdk-runner ✅

**Future Enhancement**: Add LLM capabilities for dev inner loop:
- Intelligent code analysis using context
- Custom fix generation for complex cases  
- Integration with MCP/agent workflows

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
