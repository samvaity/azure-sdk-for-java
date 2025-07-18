#Requires -Version 7.0

<#
.SYNOPSIS
    Fix Java customization errors after TypeSpec SDK regeneration

.DESCRIPTION
    This script integrates with the existing azure-sdk-for-java repository scripts
    to automatically fix common customization errors that occur after TypeSpec regeneration.

.PARAMETER ModuleDirectory
    The path to the Java SDK module directory containing pom.xml and tsp-location.yaml

.PARAMETER AnalyzeOnly
    Only analyze errors without applying fixes

.PARAMETER Validate
    Run Maven compilation after applying fixes to validate success

.PARAMETER Verbose
    Enable verbose output

.EXAMPLE
    ./fix-customizations.ps1 -ModuleDirectory ./sdk/face/azure-ai-vision-face

.EXAMPLE
    ./fix-customizations.ps1 -ModuleDirectory ./sdk/communication/azure-communication-messages -Validate -Verbose

.EXAMPLE
    ./fix-customizations.ps1 -ModuleDirectory ./sdk/devcenter/azure-resourcemanager-devcenter -AnalyzeOnly
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({
        if (-not (Test-Path $_ -PathType Container)) {
            throw "Directory '$_' does not exist"
        }
        if (-not (Test-Path (Join-Path $_ "pom.xml"))) {
            throw "Directory '$_' does not contain pom.xml - not a valid Java SDK module"
        }
        return $true
    })]
    [string]$ModuleDirectory,

    [switch]$AnalyzeOnly,
    [switch]$Validate,
    [switch]$Verbose
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = "Stop"

# Script configuration
$ScriptDir = $PSScriptRoot
$McpToolsDir = Join-Path $ScriptDir "mcp" "azure-sdk-java-mcp"
$NodeExe = Get-Command node -ErrorAction SilentlyContinue

function Write-Header {
    Write-Host "🔧 Azure SDK Java Customization Fixer" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Gray
}

function Write-Status {
    param([string]$Message)
    Write-Host "🔄 $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-Prerequisites {
    Write-Status "Checking prerequisites..."

    # Check if Node.js is available
    if (-not $NodeExe) {
        Write-Error "Node.js is not installed or not in PATH"
        Write-Host "Please install Node.js 20+ from https://nodejs.org" -ForegroundColor Yellow
        exit 1
    }

    $NodeVersion = & $NodeExe --version
    Write-Verbose "Node.js version: $NodeVersion"

    # Check if MCP tools are available
    if (-not (Test-Path $McpToolsDir)) {
        Write-Error "MCP tools directory not found: $McpToolsDir"
        Write-Host "Please ensure you're running this script from the azure-sdk-for-java/eng/scripts directory" -ForegroundColor Yellow
        exit 1
    }

    # Check if Maven is available
    $MavenExe = Get-Command mvn -ErrorAction SilentlyContinue
    if (-not $MavenExe) {
        Write-Warning "Maven (mvn) not found in PATH. Some validation features may not work."
    }

    Write-Success "Prerequisites check completed"
}

function Test-ModuleStructure {
    param([string]$ModulePath)

    Write-Status "Validating module structure..."

    $RequiredPaths = @(
        @{ Path = "pom.xml"; Description = "Maven POM file" }
        @{ Path = "src\main\java"; Description = "Java source directory" }
    )

    $OptionalPaths = @(
        @{ Path = "tsp-location.yaml"; Description = "TypeSpec location file" }
        @{ Path = "customization"; Description = "Customization directory" }
    )

    foreach ($item in $RequiredPaths) {
        $fullPath = Join-Path $ModulePath $item.Path
        if (-not (Test-Path $fullPath)) {
            Write-Error "$($item.Description) not found: $fullPath"
            exit 1
        }
        Write-Verbose "✓ Found $($item.Description)"
    }

    foreach ($item in $OptionalPaths) {
        $fullPath = Join-Path $ModulePath $item.Path
        if (Test-Path $fullPath) {
            Write-Verbose "✓ Found $($item.Description)"
        } else {
            Write-Verbose "○ Optional $($item.Description) not found"
        }
    }

    Write-Success "Module structure is valid"
}

function Invoke-CustomizationFixer {
    param(
        [string]$ModulePath,
        [bool]$AnalyzeOnly,
        [bool]$VerboseOutput
    )

    Write-Status "Running customization fixer..."

    # Build command arguments
    $CliPath = Join-Path $McpToolsDir "dist" "cli.js"
    $Arguments = @(
        $CliPath
        "--module-dir", $ModulePath
    )

    if ($AnalyzeOnly) {
        $Arguments += "--analyze-only"
    }

    if ($VerboseOutput) {
        $Arguments += "--verbose"
    }

    Write-Verbose "Command: node $($Arguments -join ' ')"

    try {
        # Ensure the MCP tools are built
        $BuildResult = Invoke-BuildMcpTools
        if (-not $BuildResult) {
            Write-Error "Failed to build MCP tools"
            exit 1
        }

        # Run the customization fixer
        $Process = Start-Process -FilePath $NodeExe.Source -ArgumentList $Arguments -Wait -PassThru -NoNewWindow

        if ($Process.ExitCode -eq 0) {
            Write-Success "Customization fixer completed successfully"
            return $true
        } elseif ($Process.ExitCode -eq 2) {
            Write-Warning "Customization fixer completed with partial success"
            return $true
        } else {
            Write-Error "Customization fixer failed with exit code: $($Process.ExitCode)"
            return $false
        }

    } catch {
        Write-Error "Failed to run customization fixer: $_"
        return $false
    }
}

function Invoke-BuildMcpTools {
    Write-Verbose "Building MCP tools..."

    try {
        Push-Location $McpToolsDir

        # Check if already built
        $DistPath = Join-Path $McpToolsDir "dist" "cli.js"
        if (Test-Path $DistPath) {
            Write-Verbose "MCP tools already built"
            return $true
        }

        # Install dependencies
        Write-Verbose "Installing dependencies..."
        $InstallResult = Start-Process -FilePath $NodeExe.Source -ArgumentList @("npm", "install") -Wait -PassThru -NoNewWindow

        if ($InstallResult.ExitCode -ne 0) {
            Write-Error "Failed to install npm dependencies"
            return $false
        }

        # Build
        Write-Verbose "Building TypeScript..."
        $BuildResult = Start-Process -FilePath $NodeExe.Source -ArgumentList @("npm", "run", "build") -Wait -PassThru -NoNewWindow

        if ($BuildResult.ExitCode -ne 0) {
            Write-Error "Failed to build MCP tools"
            return $false
        }

        Write-Verbose "MCP tools built successfully"
        return $true

    } catch {
        Write-Error "Error building MCP tools: $_"
        return $false
    } finally {
        Pop-Location
    }
}

function Invoke-Validation {
    param([string]$ModulePath)

    Write-Status "Running validation..."

    try {
        Push-Location $ModulePath

        # Run Maven compilation
        Write-Verbose "Running Maven compilation..."
        $MavenResult = Start-Process -FilePath "mvn" -ArgumentList @("compile", "-q") -Wait -PassThru -NoNewWindow

        if ($MavenResult.ExitCode -eq 0) {
            Write-Success "Maven compilation successful"
            return $true
        } else {
            Write-Error "Maven compilation failed"
            Write-Host "Run 'mvn compile' manually to see detailed error output" -ForegroundColor Yellow
            return $false
        }

    } catch {
        Write-Error "Failed to run validation: $_"
        return $false
    } finally {
        Pop-Location
    }
}

# Main execution
try {
    Write-Header

    # Convert relative path to absolute
    $ModuleDirectory = Resolve-Path $ModuleDirectory -ErrorAction Stop

    Write-Host "📁 Module: $ModuleDirectory" -ForegroundColor Cyan
    Write-Host ""

    # Run prerequisite checks
    Test-Prerequisites

    # Validate module structure
    Test-ModuleStructure -ModulePath $ModuleDirectory

    # Run the customization fixer
    $FixerSuccess = Invoke-CustomizationFixer -ModulePath $ModuleDirectory -AnalyzeOnly:$AnalyzeOnly -VerboseOutput:$Verbose

    # Run validation if requested and fixes were applied
    if ($Validate -and $FixerSuccess -and -not $AnalyzeOnly) {
        $ValidationSuccess = Invoke-Validation -ModulePath $ModuleDirectory

        if (-not $ValidationSuccess) {
            Write-Warning "Validation failed. Some manual fixes may still be needed."
        }
    }

    Write-Host ""
    if ($FixerSuccess) {
        Write-Success "Script completed successfully"

        if (-not $AnalyzeOnly) {
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "• Run 'mvn compile' to verify your changes" -ForegroundColor Yellow
            Write-Host "• Review any remaining manual fix suggestions" -ForegroundColor Yellow
            Write-Host "• Test your customizations with 'mvn test'" -ForegroundColor Yellow
        }
    } else {
        Write-Error "Script completed with errors"
        exit 1
    }

} catch {
    Write-Error "Script failed: $_"
    exit 1
}
