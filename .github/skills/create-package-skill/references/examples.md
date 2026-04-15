# Working Examples of Package Skills

## Cross-Language Examples

| Language | Package | Status | Link |
|---|---|---|---|
| **JavaScript** | `@azure/search-documents` | ✅ Live, tested with fake spec | [SKILL.md](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/search/search-documents/.github/skills/search-documents/SKILL.md) |
| **Python** | `azure-search-documents` | ✅ PR open, detailed `_patch.py` guide | [PR #45972](https://github.com/Azure/azure-sdk-for-python/pull/45972) |
| **.NET** | `Azure.Search.Documents` | ⏳ Placeholder with TODOs | [PR #57580](https://github.com/Azure/azure-sdk-for-net/pull/57580) |
| **Java** | `azure-search-documents` | ✅ Tested, 3/3 eval accuracy | `sdk/search/azure-search-documents/.github/skills/search-documents/` |

## Key Patterns from Working Skills

### JS Search Skill (most complete)
- Covers 4 clients, custom pagination, type mappings
- Has `references/` for customization merge flow and full type mapping tables
- Tested via regen against a fake spec branch

### Python Search Skill (best for post-regen)
- Step-by-step `_patch.py` verification checklist
- Per-file customization inventory (which `_patch.py` depends on which generated module)
- ApiVersion enum management
- Import verification commands

### Java Search Skill (best for error categorization)
- "Common Pitfalls" section at top (biggest eval impact)
- Error categorization table: generated file vs hand-written vs customization bug
- "Check SearchCustomizations.java FIRST" directive
- `@Generated` annotation guidance for mixed files

## Eval Data

| Metric | No Skill | Skill v1 | **Skill v2** |
|---|---|---|---|
| Correct fix location | 1/3 | 1/3 | **3/3** ✅ |
| Traced to customizations | 1/3 | 0/3 | **2/3** ✅ |
| Proposed durable fixes | 1/3 | 0/3 | **3/3** ✅ |

Key insight: **Skill structure matters more than skill volume.** v2 was shorter but performed better because of structural changes (pitfalls first, decision tables, "check X FIRST" directives).
