---
description: |
  Intelligent issue triage assistant for the Azure SDK for Java repository.
  Analyzes issue content, evaluates whether the author is a customer,
  predicts labels, looks up owners from CODEOWNERS, and provides
  analysis notes including debugging strategies and resource links.
  Implements the initial issue triage rules for the Azure SDK repository.

on:
  issues:
    types: [opened]
  workflow_dispatch:
    inputs:
      issue_number:
        description: "Issue number to triage (used when dispatched from another workflow)"
        required: true
        type: string
  reaction: eyes
  roles: all

permissions: read-all

network:
  allowed:
    - defaults
    - github

safe-outputs:
  report-failure-as-issue: false
  add-labels:
    max: 7
    target: "*"
  remove-labels:
    max: 7
    target: "*"
  add-comment:
    max: 2
    target: "*"
  assign-to-user:
    max: 1
    target: "*"
  noop:
    report-as-issue: false
  jobs:
    mention_owners:
      description: "Post a routing comment @mentioning team owners on the triggering issue; bypasses safe-outputs mention neutralization"
      runs-on: ubuntu-latest
      output: "Owner mention comment posted"
      permissions:
        issues: write
      inputs:
        message:
          description: "The comment body text without any @mentions or @ symbols"
          required: true
          type: string
        owners:
          description: "Comma-separated GitHub usernames to notify, without the @ prefix (e.g. 'user1, user2, Azure/team-name')"
          required: true
          type: string
      steps:
        - name: Post mention comment
          uses: actions/github-script@v9
          env:
            DISPATCH_ISSUE_NUMBER: "${{ github.event.inputs.issue_number || '' }}"
          with:
            script: |
              const fs = require('fs');
              const outputFile = process.env.GH_AW_AGENT_OUTPUT;

              function resolveIssueNumber() {
                if (Number.isInteger(context.issue?.number) && context.issue.number > 0) {
                  return context.issue.number;
                }
                const parsed = parseInt(process.env.DISPATCH_ISSUE_NUMBER, 10);
                if (Number.isInteger(parsed) && parsed > 0) {
                  return parsed;
                }
                return null;
              }

              const issueNumber = resolveIssueNumber();
              const owner = context.repo.owner;
              const repo = context.repo.repo;

              if (issueNumber === null) {
                core.setFailed(`Unable to determine a valid issue number. context.issue.number=${context.issue?.number ?? 'undefined'}, DISPATCH_ISSUE_NUMBER=${process.env.DISPATCH_ISSUE_NUMBER ?? 'undefined'}`);
                return;
              }

              async function failSafe(reason) {
                core.error(`mention_owners failed: ${reason}`);
                try {
                  await github.rest.issues.addLabels({
                    owner, repo, issue_number: issueNumber,
                    labels: ['needs-team-triage']
                  });
                  await github.rest.issues.createComment({
                    owner, repo, issue_number: issueNumber,
                    body: '⚠️ Automated triage was unable to complete owner notification for this issue. Routing for manual triage'
                  });
                } catch (recoveryError) {
                  core.error(`Recovery also failed: ${recoveryError.message}`);
                }
                core.setFailed(reason);
              }

              if (!outputFile) {
                await failSafe('No agent output path provided');
                return;
              }
              if (!fs.existsSync(outputFile)) {
                await failSafe(`Agent output file not found: ${outputFile}`);
                return;
              }

              let agentOutput;
              try {
                agentOutput = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
              } catch (parseError) {
                await failSafe(`Failed to parse agent output: ${parseError.message}`);
                return;
              }

              if (!agentOutput || !Array.isArray(agentOutput.items)) {
                await failSafe('Agent output missing items array');
                return;
              }

              const items = agentOutput.items.filter(i => i.type === 'mention_owners');
              if (items.length === 0) {
                await failSafe('No mention_owners items in agent output');
                return;
              }

              for (const item of items) {
                if (!item.owners || typeof item.owners !== 'string' || !item.owners.trim()) {
                  await failSafe('mention_owners item missing owners field');
                  return;
                }

                const mentions = item.owners
                  .split(/[\s,]+/)
                  .map(s => s.trim())
                  .filter(Boolean)
                  .map(raw => {
                    const normalized = raw.replace(/^\\?@/, '');
                    if (/\r|\n/.test(normalized)) return null;
                    if (!/^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)?$/.test(normalized)) return null;
                    return `@${normalized}`;
                  })
                  .filter(Boolean);

                if (mentions.length === 0) {
                  await failSafe('No valid owners after parsing owners field');
                  return;
                }

                const body = item.message
                  ? `${item.message}\n\n//cc: ${mentions.join(' ')}`
                  : mentions.join(' ');

                try {
                  await github.rest.issues.createComment({
                    owner, repo, issue_number: issueNumber,
                    body
                  });
                  core.info(`Posted routing comment on #${issueNumber} mentioning: ${mentions.join(', ')}`);
                } catch (apiError) {
                  await failSafe(`GitHub API error posting comment: ${apiError.message}`);
                  return;
                }
              }

tools:
  github:
    toolsets: [issues, pull_requests]
    lockdown: false
    allowed-repos: [azure/azure-sdk-for-java]
    min-integrity: none

timeout-minutes: 10
---

# Azure SDK for Java — Issue Triage

<!-- After editing this file, run 'gh aw compile' to regenerate the lock file -->

Your task is to analyze issue #${{ github.event.issue.number || github.event.inputs.issue_number }} and perform initial triage.

Follow the instructions in `eng/common/instructions/agentic-triage.md` to perform first-level triage.

## Java-Specific Context

When performing the triage steps from the base instructions, use this Java-specific context:

- **Package naming**: Maven artifacts beginning with `com.azure` (e.g. `com.azure:azure-cosmos`, `com.azure:azure-storage-blob`, `com.azure:azure-identity`)
- **Management packages**: Maven group `com.azure.resourcemanager` — these get the `Mgmt` type label
- **Search examples** (use these patterns when searching for similar issues):
  - By class name: `repo:azure/azure-sdk-for-java is:closed CosmosAsyncClient`
  - By error type: `repo:azure/azure-sdk-for-java is:closed NullPointerException SecretAsyncClient`
  - By method/module: `repo:azure/azure-sdk-for-java is:closed computeIfAbsent processorMap`
- **Documentation**: https://learn.microsoft.com/java/azure/
- **API reference**: https://azure.github.io/azure-sdk-for-java/
- **Troubleshooting guides**: `sdk/<service>/azure-<service>/TROUBLESHOOTING.md`

<!-- Add any Java-specific triage steps below this line -->
