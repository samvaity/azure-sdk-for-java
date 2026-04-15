# Validation Tools for Package Skills

## vally lint (Structural Validation)

**Source**: `microsoft/evaluate` (currently private, will be public)
**Replaces**: `waza check` (Go-based, being deprecated)

```bash
# Install (once published)
npm install -g @microsoft/vally-cli

# Lint a skill
vally lint sdk/<service>/<package>/.github/skills/<skill-name>

# Lint all skills in repo
vally lint .github/skills
```

### What it checks

| Check | What it does | Common failure |
|---|---|---|
| `spec-compliance` | Validates frontmatter (name, description), name-directory match | Directory name doesn't match `name` field |
| `valid-refs` | All markdown links resolve to existing files | Broken link to reference file |
| `orphan-files` | No unreferenced files in references/ | File in references/ not linked from SKILL.md |

## validate_skill_anchors.py (Staleness Detection)

**Location**: `eng/common/scripts/validate_skill_anchors.py`
**Requires**: Python 3.8+ (stdlib only, zero pip dependencies)

```bash
py -3 eng/common/scripts/validate_skill_anchors.py <skill-directory>
```

### What it checks

Extracts code references from skill markdown and verifies they exist in the package:

| Anchor Type | How it's detected | What it verifies |
|---|---|---|
| File paths | Backtick-quoted names with extensions (`.java`, `.xml`, `.yaml`) | File exists in package |
| Method names | `methodName()` in backticks | Method declaration found in .java files |
| Class names | PascalCase words in backticks | Class/enum file exists or declaration found |

### What it catches

- Renamed methods (e.g., `includeOldApiVersions` → `addOldApiVersions`)
- Deleted files
- Cross-language pollution (e.g., `SearchModelFactory` from .NET referenced in Java skill)
- Typos in code references

## CI Workflow

Add to `.github/workflows/validate-skills.yml`:

```yaml
name: Validate Skills
on:
  pull_request:
    paths:
      - '.github/skills/**'
      - 'sdk/**/.github/skills/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install vally
        run: npm install -g @microsoft/vally-cli
      - name: Lint skills
        run: |
          vally lint .github/skills --strict
          find sdk -path '*/.github/skills/*/SKILL.md' -exec dirname {} \; | sort -u | while read dir; do
            vally lint "$(dirname "$dir")" --strict
          done
      - uses: actions/setup-python@v5
        with:
          python-version: '3.x'
      - name: Check anchors
        run: |
          find sdk -path '*/.github/skills/*/SKILL.md' -exec dirname {} \; | sort -u | while read dir; do
            python eng/common/scripts/validate_skill_anchors.py "$dir"
          done
```
