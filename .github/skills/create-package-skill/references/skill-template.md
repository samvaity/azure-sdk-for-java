# SKILL.md Template for Azure SDK Package Skills

Use this template when creating a new package skill. Replace placeholders with package-specific content.

```yaml
---
name: <package-name-without-azure-prefix>
description: '<Brief description of what this skill covers>. WHEN: regenerate <package>; modify <package>; fix <package> bug; add <package> feature; <package> tsp-client update.'
---
```

## Required Sections (in order)

### Common Pitfalls
List 3-5 most dangerous mistakes. This section MUST come first — agents read it before analyzing errors.

### Architecture
Source layout, generated vs hand-written code, customization mechanism.

### Regeneration Workflow (if TypeSpec-generated)
Phased workflow: update tsp-location → generate → build/fix → service version → breaking changes → test → changelog → version.

### Key Files
Table of important files and their purpose.

### Post-Regeneration Customizations (if customizations exist)
Per-method documentation with "when to update" guidance.

### Testing Notes
Commands, recorded test setup, environment requirements.

### References
Table linking to references/*.md files.

## Structural Rules

| Rule | Enforced By |
|---|---|
| `name` matches directory name | `vally lint` |
| All markdown links resolve | `vally lint` |
| No orphaned reference files | `vally lint` |
| Code references still exist in codebase | `validate_skill_anchors.py` |
| SKILL.md under 5000 tokens | `vally lint` |
| Reference files under 1000 tokens each | Manual check |
| Trigger phrases include package name | Manual review |
| No cross-language content | `validate_skill_anchors.py` (detects missing classes) |
