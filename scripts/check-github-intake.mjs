import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/deferred-figma-screen.yml",
  ".github/ISSUE_TEMPLATE/deployment-setup.yml",
  ".github/ISSUE_TEMPLATE/alert-component.yml",
  ".github/ISSUE_TEMPLATE/backend-phase-switch.yml",
  ".github/pull_request_template.md",
];
const phaseSafetyLabels = [
  "No Firebase imports or setup",
  "No fetch",
  "No route handlers or server actions",
  "No validation schema generation",
  "No CRUD/business state transition logic",
  "No optimistic UI",
  "No local array add/edit/delete mutation",
  "No submit-driven approval/rejection/confirmation/save/delete behavior",
];
const prSafetyLabels = [
  "No Firebase imports or setup",
  "No `fetch`",
  "No route handlers",
  "No server actions",
  "No validation schema generation",
  "No CRUD/business state transition logic",
  "No optimistic UI",
  "No local array add/edit/delete mutation",
  "No submit-driven approval/rejection/confirmation/save/delete behavior",
];
const backendGuardrailLabels = [
  "This request explicitly changes the Figma-first guardrails only for the accepted scope.",
  "Static UI and Figma-backed visual evidence must not regress for screens touched by backend work.",
  "Any approval/rejection/confirmation/save/delete flow must be named before implementation starts.",
  "Environment variables and secrets must not be committed.",
  "Firestore rules, Auth roles, and deployment ownership have a named reviewer or owner.",
];
const expectedForms = [
  {
    file: ".github/ISSUE_TEMPLATE/deferred-figma-screen.yml",
    snippets: [
      "name: Deferred Figma screen request",
      "id: authoritative-frame",
      "id: evidence",
      "id: phase-safety",
      ...phaseSafetyLabels,
    ],
  },
  {
    file: ".github/ISSUE_TEMPLATE/deployment-setup.yml",
    snippets: [
      "name: Deployment setup request",
      "id: github-owner",
      "id: github-repo",
      "id: vercel-team",
      "id: vercel-project",
      "No Firebase/Auth/Firestore variables are being added in this request.",
      "CI should run `pnpm install --frozen-lockfile` and `pnpm verify`.",
    ],
  },
  {
    file: ".github/ISSUE_TEMPLATE/alert-component.yml",
    snippets: [
      "name: Alert component request",
      "id: authoritative-frame",
      "id: ownership",
      "id: visual-states",
      "id: storybook",
      "id: phase-safety",
      ...phaseSafetyLabels,
    ],
  },
  {
    file: ".github/ISSUE_TEMPLATE/backend-phase-switch.yml",
    snippets: [
      "name: Backend phase switch request",
      "Filing this request does not authorize broad backend work",
      "id: explicit-capabilities",
      "multiple: true",
      "id: auth-requirements",
      "id: data-model",
      "id: repo-boundary",
      "id: guardrail-acknowledgement",
      "Environment variables and secrets must not be committed.",
      "Firestore rules, Auth roles, and deployment ownership have a named reviewer or owner.",
    ],
  },
];

const findings = [];

function readRequiredFile(file) {
  try {
    return readFileSync(join(root, file), "utf8");
  } catch (error) {
    findings.push(`${file}: missing required file (${error.message})`);
    return "";
  }
}

function requireSnippet(file, content, snippet) {
  if (!content.includes(snippet)) {
    findings.push(`${file}: missing required snippet "${snippet}"`);
  }
}

function escapeRegExp(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractIssueFormItemBlock(file, content, id) {
  const marker = `id: ${id}`;
  const markerIndex = content.indexOf(marker);

  if (markerIndex === -1) {
    findings.push(`${file}: missing issue form item "${id}"`);
    return "";
  }

  const blockStart = content.lastIndexOf("\n  - type:", markerIndex);
  const nextBlockStart = content.indexOf("\n  - type:", markerIndex + marker.length);

  return content.slice(blockStart === -1 ? markerIndex : blockStart, nextBlockStart === -1 ? undefined : nextBlockStart);
}

function requireRequiredCheckboxOptions(file, content, id, labels) {
  const block = extractIssueFormItemBlock(file, content, id);

  requireSnippet(file, block, "type: checkboxes");

  for (const label of labels) {
    const requiredOptionPattern = new RegExp(`- label: ${escapeRegExp(label)}\\n\\s+required: true`);

    if (!requiredOptionPattern.test(block)) {
      findings.push(`${file}: checkbox "${label}" in "${id}" must be present with required: true`);
    }
  }
}

for (const file of requiredFiles) {
  readRequiredFile(file);
}

const config = readRequiredFile(".github/ISSUE_TEMPLATE/config.yml");
requireSnippet(".github/ISSUE_TEMPLATE/config.yml", config, "blank_issues_enabled: false");

for (const form of expectedForms) {
  const content = readRequiredFile(form.file);

  requireSnippet(form.file, content, "description:");
  requireSnippet(form.file, content, "title:");
  requireSnippet(form.file, content, "labels:");
  requireSnippet(form.file, content, "body:");

  for (const snippet of form.snippets) {
    requireSnippet(form.file, content, snippet);
  }
}

requireRequiredCheckboxOptions(
  ".github/ISSUE_TEMPLATE/deferred-figma-screen.yml",
  readRequiredFile(".github/ISSUE_TEMPLATE/deferred-figma-screen.yml"),
  "phase-safety",
  phaseSafetyLabels,
);
requireRequiredCheckboxOptions(
  ".github/ISSUE_TEMPLATE/alert-component.yml",
  readRequiredFile(".github/ISSUE_TEMPLATE/alert-component.yml"),
  "phase-safety",
  phaseSafetyLabels,
);
requireRequiredCheckboxOptions(
  ".github/ISSUE_TEMPLATE/backend-phase-switch.yml",
  readRequiredFile(".github/ISSUE_TEMPLATE/backend-phase-switch.yml"),
  "guardrail-acknowledgement",
  backendGuardrailLabels,
);

const pullRequestTemplate = readRequiredFile(".github/pull_request_template.md");
const requiredPullRequestSections = [
  "## Summary",
  "## Scope",
  "## Figma Evidence",
  "## Verification",
  "## Phase-Scope Safety",
];

for (const section of requiredPullRequestSections) {
  requireSnippet(".github/pull_request_template.md", pullRequestTemplate, section);
}

for (const safetyLabel of prSafetyLabels) {
  requireSnippet(".github/pull_request_template.md", pullRequestTemplate, safetyLabel);
}

if (findings.length > 0) {
  console.error("GitHub intake guardrail verification failed.");

  for (const finding of findings) {
    console.error(`- ${finding}`);
  }

  process.exit(1);
}

console.log("GitHub intake guardrail verification passed.");
