#!/usr/bin/env node

/**
 * PayToll Node Generator
 *
 * Reads endpoints.yaml and generates .md skill graph nodes following the
 * established pattern from existing nodes (search-agents.md, create-task.md, etc.)
 *
 * Usage: node scripts/generate-paytoll-nodes.js
 *
 * Output: Creates .md files in the parent directory for each endpoint, pattern,
 * and operation defined in endpoints.yaml.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "..");

function loadManifest() {
  const manifestPath = join(OUTPUT_DIR, "endpoints.yaml");
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const content = readFileSync(manifestPath, "utf-8");
  return parseYaml(content);
}

function generateEndpointNode(endpoint, baseUrl) {
  const prereqLink = endpoint.prereq ? `[[${endpoint.prereq}]]` : "None";
  const nextLinks =
    endpoint.next && endpoint.next.length > 0
      ? endpoint.next.map((n) => `[[${n}]]`).join(", ")
      : "None";

  const paramsTable =
    endpoint.params && endpoint.params.length > 0
      ? `
## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
${endpoint.params.map((p) => `| \`${p.name}\` | ${p.type} | ${p.required ? "Yes" : "No"} | ${p.description || ""} |`).join("\n")}
`
      : "";

  const errorsTable =
    endpoint.errors && endpoint.errors.length > 0
      ? `
## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
${endpoint.errors.map((e) => `| \`${e.code}\` | ${e.meaning} | ${e.action} |`).join("\n")}
`
      : "";

  const decisionFlow = endpoint.decision_flow
    ? `
## Decision Flow

${endpoint.decision_flow}
`
    : "";

  const pollingNote = endpoint.polling
    ? `

**Polling Endpoint**: Use exponential backoff (5s initial, 60s max, 2x factor).
Register task in [[active-tasks]] and check on next opportunity rather than blocking.
`
    : "";

  const refundNote = endpoint.refund
    ? `

**Refund Flow**: This endpoint may trigger a refund. Check response for refund details.
`
    : "";

  const providerNote = endpoint.provider_side
    ? `

**Provider Side**: This endpoint is used when this agent is the *provider* of work,
not the *requester*. The agent completed work for another agent and is claiming payment.
`
    : "";

  return `---
name: ${endpoint.name}
description: >
  ${endpoint.description}
---

# ${toTitleCase(endpoint.name)}

${endpoint.description}

## When To Use

${endpoint.when_to_use || "- See workflow documentation"}

## Endpoint

\`\`\`
${endpoint.method} ${baseUrl}${endpoint.path}
\`\`\`

**Payment**: This endpoint costs ${endpoint.cost} via [[x402-protocol]].
${pollingNote}${refundNote}${providerNote}
## Request Construction

The skill script delegates to the TEE bridge via fd3:

\`\`\`javascript
import { x402Request } from './paytoll-client.js';

const response = await x402Request(
  '${baseUrl}${endpoint.path.replace(/\{(\w+)\}/g, "${input.$1}")}',
  '${endpoint.method}'${endpoint.method === "POST" ? `,
  {
${endpoint.params ? endpoint.params.filter((p) => p.required).map((p) => `    ${p.name}: input.${p.name}`).join(",\n") : "    // request body"}
  }` : ""}
);

if (response.error) {
  console.error(\`Failed: \${response.message}\`);
  // Handle error based on response.suggestedAction
} else {
  console.log('Success:', response.body);
}
\`\`\`
${paramsTable}
## Response Shape

\`\`\`json
${endpoint.response?.shape || "{ }"}
\`\`\`
${decisionFlow}${errorsTable}
## Workflow Context

- **Prerequisite**: ${prereqLink}
- **Next steps**: ${nextLinks}

## See Also

- [[hire-and-wait]] for the standard delegation workflow
- [[tee-wallet-bridge]] for how payments are signed
- [[session-spending]] for budget enforcement
`;
}

function generatePatternNode(pattern) {
  const refLinks =
    pattern.references && pattern.references.length > 0
      ? pattern.references.map((r) => `[[${r}]]`).join(", ")
      : "";

  return `---
name: ${pattern.name}
description: >
  ${pattern.description}
---

# ${toTitleCase(pattern.name)}

${pattern.description}

## When To Use

${pattern.when_to_use || "- See documentation below"}

${pattern.content || ""}

## Related Nodes

${refLinks}

## See Also

- [[index]] for the full skill graph overview
- [[tee-wallet-bridge]] for how payments are signed
`;
}

function generateOperationNode(operation) {
  const refLinks =
    operation.references && operation.references.length > 0
      ? operation.references.map((r) => `[[${r}]]`).join(", ")
      : "";

  return `---
name: ${operation.name}
description: >
  ${operation.description}
---

# ${toTitleCase(operation.name)}

${operation.description}

${operation.storage ? `## Storage Location\n\n\`\`\`\n${operation.storage}\n\`\`\`\n` : ""}

${operation.content || ""}

## Related Nodes

${refLinks}

## See Also

- [[index]] for the full skill graph overview
- [[tee-wallet-bridge]] for how the bridge manages state
`;
}

function toTitleCase(str) {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function main() {
  console.log("Loading manifest...");
  const manifest = loadManifest();

  let generated = 0;
  let skipped = 0;

  // Generate endpoint nodes
  if (manifest.endpoints) {
    for (const endpoint of manifest.endpoints) {
      const filename = `${endpoint.name}.md`;
      const filepath = join(OUTPUT_DIR, filename);

      // Skip if file already exists (don't overwrite manually created nodes)
      if (existsSync(filepath)) {
        console.log(`  Skipping ${filename} (already exists)`);
        skipped++;
        continue;
      }

      const content = generateEndpointNode(endpoint, manifest.base_url || "https://api.paytoll.org");
      writeFileSync(filepath, content);
      console.log(`  Generated ${filename}`);
      generated++;
    }
  }

  // Generate pattern nodes
  if (manifest.patterns) {
    for (const pattern of manifest.patterns) {
      const filename = `${pattern.name}.md`;
      const filepath = join(OUTPUT_DIR, filename);

      if (existsSync(filepath)) {
        console.log(`  Skipping ${filename} (already exists)`);
        skipped++;
        continue;
      }

      const content = generatePatternNode(pattern);
      writeFileSync(filepath, content);
      console.log(`  Generated ${filename}`);
      generated++;
    }
  }

  // Generate operation nodes
  if (manifest.operations) {
    for (const operation of manifest.operations) {
      const filename = `${operation.name}.md`;
      const filepath = join(OUTPUT_DIR, filename);

      if (existsSync(filepath)) {
        console.log(`  Skipping ${filename} (already exists)`);
        skipped++;
        continue;
      }

      const content = generateOperationNode(operation);
      writeFileSync(filepath, content);
      console.log(`  Generated ${filename}`);
      generated++;
    }
  }

  console.log(`\nDone! Generated ${generated} nodes, skipped ${skipped} existing.`);
}

main();
