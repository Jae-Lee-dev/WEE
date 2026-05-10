import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

const codeRoots = ["src", "e2e"];
const rootFiles = [
  "next.config.ts",
  "playwright.config.ts",
  "vitest.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "components.json",
];
const codeExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".json",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);
const disallowedRouteFiles = new Set([
  "route.cjs",
  "route.cts",
  "route.js",
  "route.jsx",
  "route.mjs",
  "route.mts",
  "route.ts",
  "route.tsx",
  "actions.cjs",
  "actions.cts",
  "actions.js",
  "actions.jsx",
  "actions.mjs",
  "actions.mts",
  "actions.ts",
  "actions.tsx",
  "server.cjs",
  "server.cts",
  "server.js",
  "server.jsx",
  "server.mjs",
  "server.mts",
  "server.ts",
  "server.tsx",
]);
const disallowedDependencies = [
  /^firebase$/,
  /^firebase-admin$/,
  /^@firebase\//,
  /^zod$/,
  /^yup$/,
  /^valibot$/,
  /^joi$/,
  /^arktype$/,
  /^@sinclair\/typebox$/,
];
const contentRules = [
  {
    name: "Firebase import or require",
    pattern:
      /\b(?:from\s+["'](?:firebase(?:\/[^"']*)?|firebase-admin|@firebase\/[^"']+)["']|require\(["'](?:firebase(?:\/[^"']*)?|firebase-admin|@firebase\/[^"']+)["']\))/,
  },
  {
    name: "fetch call",
    pattern: /\bfetch\s*\(/,
  },
  {
    name: "server action directive",
    pattern: /["']use server["']/,
  },
  {
    name: "NextResponse route handler API",
    pattern: /\bNextResponse\b/,
  },
  {
    name: "Firestore mutation/helper",
    pattern:
      /\b(?:addDoc|setDoc|updateDoc|deleteDoc|collection|writeBatch|runTransaction)\s*\(/,
  },
  {
    name: "optimistic UI",
    pattern: /\b(?:useOptimistic|optimistic)\b/i,
  },
  {
    name: "validation schema library import",
    pattern:
      /\b(?:from\s+["'](?:zod|yup|valibot|joi|arktype|@sinclair\/typebox)["']|require\(["'](?:zod|yup|valibot|joi|arktype|@sinclair\/typebox)["']\))/,
  },
];

const findings = [];

function listFiles(path) {
  const files = [];

  for (const entry of readdirSync(path)) {
    if (entry === "node_modules" || entry === ".next" || entry === "storybook-static") {
      continue;
    }

    const entryPath = join(path, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      files.push(...listFiles(entryPath));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function getExtension(file) {
  const match = file.match(/(\.[^.]+)$/);
  return match?.[1] ?? "";
}

function addFinding(kind, file, detail) {
  findings.push({
    kind,
    file: relative(root, file),
    detail,
  });
}

for (const codeRoot of codeRoots) {
  const fullRoot = join(root, codeRoot);
  const files = listFiles(fullRoot);

  for (const file of files) {
    const rel = relative(root, file);
    const filename = rel.split("/").at(-1);

    if (rel.startsWith("src/app/") && disallowedRouteFiles.has(filename)) {
      addFinding("Disallowed App Router backend file", file, filename);
    }

    if (!codeExtensions.has(getExtension(file))) {
      continue;
    }

    const content = readFileSync(file, "utf8");

    for (const rule of contentRules) {
      if (rule.pattern.test(content)) {
        addFinding(rule.name, file, `matched ${rule.pattern}`);
      }
    }
  }
}

for (const file of rootFiles) {
  const fullPath = join(root, file);
  const content = readFileSync(fullPath, "utf8");

  for (const rule of contentRules) {
    if (rule.pattern.test(content)) {
      addFinding(rule.name, fullPath, `matched ${rule.pattern}`);
    }
  }
}

const packageJsonPath = join(root, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const dependencyGroups = [
  packageJson.dependencies ?? {},
  packageJson.devDependencies ?? {},
  packageJson.optionalDependencies ?? {},
  packageJson.peerDependencies ?? {},
];

for (const group of dependencyGroups) {
  for (const dependencyName of Object.keys(group)) {
    if (disallowedDependencies.some((pattern) => pattern.test(dependencyName))) {
      addFinding("Disallowed package dependency", packageJsonPath, dependencyName);
    }
  }
}

if (findings.length > 0) {
  console.error("Figma-first phase guardrail audit failed.");

  for (const finding of findings) {
    console.error(`- ${finding.kind}: ${finding.file} (${finding.detail})`);
  }

  process.exit(1);
}

console.log("Figma-first phase guardrail audit passed.");
