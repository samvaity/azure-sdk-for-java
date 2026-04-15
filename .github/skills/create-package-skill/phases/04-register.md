# Phase 4: Register 📋

> 📍 **Phase 4 — Register** | Add the skill to the find-package-skill discovery table.

## Step 1 — Update find-package-skill

Add a row to `.github/skills/find-package-skill/SKILL.md` in the **Package Skills** table:

```markdown
| `<package-name>` | `sdk/<service>/<package>/.github/skills/<skill-name>/SKILL.md` |
```

## Step 2 — Summary

Print a summary of everything created:

📋 **Package Skill Created**

| Item | Path | Status |
|---|---|---|
| SKILL.md | `sdk/<service>/<package>/.github/skills/<skill-name>/SKILL.md` | ✅ Created |
| architecture.md | `...references/architecture.md` | ✅/⏭️ Created/Skipped |
| customizations.md | `...references/customizations.md` | ✅/⏭️ Created/Skipped |
| find-package-skill | `.github/skills/find-package-skill/SKILL.md` | ✅ Updated |
| vally lint | 3/3 checks | ✅ Passed |
| Anchor check | N/N anchors | ✅ Passed |

**Next steps for the service team:**
1. Fill in any `<!-- TODO -->` sections with domain-specific knowledge
2. Test the skill by asking an agent to regenerate your package
3. Iterate: agent gets something wrong → update skill → test again
4. Submit a PR — the CI workflow will run `vally lint` automatically

**Maintaining your skill:**
- When your package's customizations change, update the skill
- Run `py -3 eng/common/scripts/validate_skill_anchors.py <skill-dir>` to check for stale references
- The CI will warn if watched source files change without a skill update

## Step 3 — CONFIRM

Question: "Register the skill in find-package-skill now (recommended), or skip?"

📍 **Phase 4 complete** | Skill registered | Wizard done 🎉
