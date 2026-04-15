#!/usr/bin/env python3
"""Validate that code references in a package skill still exist in the codebase.

Extracts file paths, method names, and class names from SKILL.md and
references/*.md, then verifies each anchor resolves against the actual
source tree. Catches the most common staleness pattern: code renamed or
deleted but skill still references old names.

Stdlib only — zero pip dependencies. Runs on Python 3.8+.

Usage:
    python eng/common/scripts/validate_skill_anchors.py <skill_dir>

    skill_dir: Path to the skill directory containing SKILL.md
               e.g., sdk/search/azure-search-documents/.github/skills/search-documents

Exit 0 if all anchors resolve, exit 1 if any are stale.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# (status, anchor_type, anchor_value, detail)
CheckResult = Tuple[str, str, str, str]

# Patterns to extract from markdown
# 1. File paths: backtick-quoted names ending in known extensions
FILE_EXTENSIONS = {".java", ".xml", ".yaml", ".yml", ".json", ".md", ".properties", ".py"}
FILE_PATTERN = re.compile(r"`([^`]*?(\.\w+))`")

# 2. Method names: word followed by () in backticks
METHOD_PATTERN = re.compile(r"`(\w+)\(\)`")

# 3. Class names: PascalCase words in backticks (at least 2 uppercase letters)
CLASS_PATTERN = re.compile(r"`([A-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)+)`")

# Names to skip (common markdown/code terms, not actual anchors)
SKIP_NAMES = {
    # Generic terms
    "TODO", "STOP", "IMPORTANT", "NOTE", "GENERATED",
    # Markdown formatting
    "SKILL", "WHEN", "README",
    # Common Java terms that aren't specific class references
    "Override", "Generated", "Deprecated",
    # JavaParser API (referenced as examples, not as codebase anchors)
    "CompilationUnit", "ClassOrInterfaceDeclaration", "MethodDeclaration",
    "EnumConstantDeclaration", "FieldDeclaration", "VariableDeclarator",
    "StringLiteralExpr", "StaticJavaParser", "NodeList", "BlockStmt",
    "PackageCustomization", "ClassCustomization", "LibraryCustomization",
    "Customization",
    # Azure SDK core types (not package-specific)
    "BinaryData", "BearerTokenAuthenticationPolicy", "ServiceVersion",
    # Azure SDK test types (from azure-core-test, not package-specific)
    "TestProxyTestBase",
    # Placeholder names used in examples/templates
    "NewModel", "OldModel", "SomeEnum", "WithResponse",
}

# File names to skip (generic references, not package-specific)
SKIP_FILES = {
    "pom.xml",        # exists everywhere
    "CHANGELOG.md",   # exists everywhere
    "README.md",      # exists everywhere
    "module-info.java",
}


def find_package_root(skill_dir: Path) -> Optional[Path]:
    """Walk up from skill_dir to find the package root.

    Package skills live at: sdk/<service>/<package>/.github/skills/<name>/
    The package root is the directory containing .github/skills/.
    """
    current = skill_dir.resolve()
    while current != current.parent:
        if (current / ".github" / "skills").is_dir():
            # This is the package root if it also looks like a package
            # (has pom.xml, tsp-location.yaml, or src/)
            if any((current / f).exists() for f in ["pom.xml", "tsp-location.yaml", "src"]):
                return current
            # Otherwise it might be the repo root — keep looking
        # Go up one level
        current = current.parent
    return None


def read_skill_files(skill_dir: Path) -> str:
    """Read SKILL.md and all references/*.md into one string."""
    content = ""
    skill_md = skill_dir / "SKILL.md"
    if skill_md.is_file():
        content += skill_md.read_text(encoding="utf-8", errors="replace")

    refs_dir = skill_dir / "references"
    if refs_dir.is_dir():
        for ref_file in sorted(refs_dir.glob("*.md")):
            content += "\n" + ref_file.read_text(encoding="utf-8", errors="replace")

    return content


def extract_file_anchors(content: str) -> Set[str]:
    """Extract file path references from backtick-quoted text."""
    anchors = set()
    for match in FILE_PATTERN.finditer(content):
        name = match.group(1).strip()
        ext = match.group(2).lower()
        if ext not in FILE_EXTENSIONS:
            continue
        # Skip bare extensions (e.g., `.java` alone)
        if name == ext or name == ext.lstrip("."):
            continue
        # Skip if it's inside a command (starts with mvn, tsp-client, etc.)
        if any(name.startswith(prefix) for prefix in ["mvn ", "tsp-client ", "git ", "python "]):
            continue
        # Extract just the filename if it's a simple name
        basename = Path(name).name
        if basename in SKIP_FILES:
            continue
        anchors.add(name)
    return anchors


def extract_method_anchors(content: str) -> Set[str]:
    """Extract method name references (word followed by ())."""
    anchors = set()
    for match in METHOD_PATTERN.finditer(content):
        name = match.group(1)
        if name in SKIP_NAMES:
            continue
        # Skip common Java method names that exist everywhere
        if name in {"toString", "hashCode", "equals", "get", "set", "add", "remove",
                     "stream", "filter", "forEach", "ifPresent", "replace", "getBody",
                     "setName", "setType", "setBody", "setModifiers", "getEntries",
                     "customizeAst", "getClassByName", "getEnumByName", "getMethodsByName",
                     "getNameAsString", "isAnnotationPresent", "isPublic", "getType",
                     "getPackage", "getClass", "addMember", "addMarkerAnnotation",
                     "addVariable", "setInitializer", "parseBlock", "addArgument",
                     "setJavadocComment", "addExtendedType",
                     "createHttpPipeline", "buildHttpPipeline"}:
            continue
        anchors.add(name)
    return anchors


def extract_class_anchors(content: str) -> Set[str]:
    """Extract PascalCase class name references."""
    anchors = set()
    for match in CLASS_PATTERN.finditer(content):
        name = match.group(1)
        if name in SKIP_NAMES:
            continue
        anchors.add(name)
    return anchors


def verify_file_anchor(name: str, package_root: Path) -> CheckResult:
    """Check if a file reference resolves to an existing file."""
    # Try as relative path from package root
    candidate = package_root / name
    if candidate.is_file():
        return ("pass", "file", name, f"Found at {candidate.relative_to(package_root)}")

    # Try just the filename anywhere under package root
    basename = Path(name).name
    matches = list(package_root.rglob(basename))
    # Filter out TempTypeSpecFiles and target directories
    matches = [m for m in matches if "TempTypeSpecFiles" not in str(m) and "/target/" not in str(m)
               and "\\target\\" not in str(m)]
    if matches:
        return ("pass", "file", name, f"Found: {matches[0].relative_to(package_root)}")

    return ("fail", "file", name, "File not found in package")


def verify_method_anchor(name: str, package_root: Path) -> CheckResult:
    """Check if a method name exists in the package source."""
    # Search in .java files under the package
    for java_file in package_root.rglob("*.java"):
        if "TempTypeSpecFiles" in str(java_file) or "target" in str(java_file):
            continue
        try:
            text = java_file.read_text(encoding="utf-8", errors="replace")
            # Look for method declaration or reference
            if re.search(rf"\b{re.escape(name)}\s*\(", text):
                rel = java_file.relative_to(package_root)
                return ("pass", "method", name, f"Found in {rel}")
        except (OSError, PermissionError):
            continue

    return ("fail", "method", name, "Method not found in any .java file")


def verify_class_anchor(name: str, package_root: Path) -> CheckResult:
    """Check if a class/enum name exists as a .java file or in source."""
    # First check if there's a file named ClassName.java
    matches = list(package_root.rglob(f"{name}.java"))
    matches = [m for m in matches if "TempTypeSpecFiles" not in str(m) and "target" not in str(m)]
    if matches:
        rel = matches[0].relative_to(package_root)
        return ("pass", "class", name, f"Found: {rel}")

    # Search in source for class/enum/interface declaration
    for java_file in package_root.rglob("*.java"):
        if "TempTypeSpecFiles" in str(java_file) or "target" in str(java_file):
            continue
        try:
            text = java_file.read_text(encoding="utf-8", errors="replace")
            if re.search(rf"\b(?:class|enum|interface)\s+{re.escape(name)}\b", text):
                rel = java_file.relative_to(package_root)
                return ("pass", "class", name, f"Declared in {rel}")
        except (OSError, PermissionError):
            continue

    return ("fail", "class", name, "Class/enum not found in package")


# ---------------------------------------------------------------------------
# Display
# ---------------------------------------------------------------------------

STATUS_SYMBOLS = {"pass": "+", "warn": "!", "fail": "X"}


def supports_color() -> bool:
    if sys.platform == "win32":
        return "WT_SESSION" in os.environ or "ANSICON" in os.environ or "TERM" in os.environ
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


def format_result(result: CheckResult, use_color: bool) -> str:
    status, anchor_type, anchor_value, message = result
    symbol = STATUS_SYMBOLS[status]
    colors = {"pass": "\033[32m", "warn": "\033[33m", "fail": "\033[31m"}
    reset = "\033[0m"
    if use_color:
        return f"  {colors[status]}{symbol}{reset} [{anchor_type:6s}] {anchor_value}: {message}"
    return f"  {symbol} [{anchor_type:6s}] {anchor_value}: {message}"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: validate_skill_anchors.py <skill_directory>")
        print("  e.g.: validate_skill_anchors.py sdk/search/azure-search-documents/.github/skills/search-documents")
        sys.exit(2)

    skill_dir = Path(sys.argv[1]).resolve()
    if not (skill_dir / "SKILL.md").is_file():
        print(f"Error: {skill_dir / 'SKILL.md'} not found")
        sys.exit(2)

    package_root = find_package_root(skill_dir)
    if package_root is None:
        print(f"Error: Could not find package root for {skill_dir}")
        print("  Expected structure: sdk/<service>/<package>/.github/skills/<name>/")
        sys.exit(2)

    use_color = supports_color()
    print("=== SKILL ANCHOR VALIDATION ===")
    print(f"Skill:   {skill_dir}")
    print(f"Package: {package_root}")
    print()

    content = read_skill_files(skill_dir)

    file_anchors = extract_file_anchors(content)
    method_anchors = extract_method_anchors(content)
    class_anchors = extract_class_anchors(content)

    print(f"Found {len(file_anchors)} file refs, {len(method_anchors)} method refs, {len(class_anchors)} class refs")
    print()

    results: List[CheckResult] = []

    for anchor in sorted(file_anchors):
        results.append(verify_file_anchor(anchor, package_root))

    for anchor in sorted(method_anchors):
        results.append(verify_method_anchor(anchor, package_root))

    for anchor in sorted(class_anchors):
        results.append(verify_class_anchor(anchor, package_root))

    for result in results:
        print(format_result(result, use_color))

    pass_count = sum(1 for r in results if r[0] == "pass")
    fail_count = sum(1 for r in results if r[0] == "fail")

    print()
    print(f"Results: {pass_count} passed, {fail_count} failed")
    print()

    if fail_count > 0:
        print("=== ANCHOR VALIDATION FAILED ===")
        print("Stale references found. Update the skill to match current code.")
        sys.exit(1)
    else:
        print("=== ANCHOR VALIDATION PASSED ===")


if __name__ == "__main__":
    main()
