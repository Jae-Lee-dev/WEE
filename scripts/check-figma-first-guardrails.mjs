import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
const artifactRoot = "../../artifacts";
const disallowedRepositoryArtifactDirs = ["artifacts", "public/artifacts"];
const adminRoutePageFile = "src/app/_components/AdminRoutePage.tsx";
const entryRoutePageFile = "src/app/_components/EntryRoutePage.tsx";
const adminNavigationRegistryFile = "src/app/_config/admin-navigation.ts";
const allowedAdminRoutePageDeferredHrefs = [
  "/dashboard/locations",
  "/dashboard/workers",
  "/dashboard/ai-monitoring",
];
const allowedEntryRoutePageDeferredHrefs = [
  "/login",
  "/signup",
  "/forgot-password",
  "/onboarding/workspace",
  "/onboarding/setup",
];
const allowedFirebaseAuthTransitionFiles = new Set([
  "src/features/entry/signup-form.tsx",
  "src/lib/firebase/client.ts",
]);
const allowedSubmitDrivenTransitionFiles = new Set([
  "src/features/entry/signup-form.tsx",
]);
const allowedLocalArrayMutationTransitionFiles = new Set([
  "src/features/entry/signup-form.tsx",
]);
const allowedRuntimeEnvTransitionFiles = new Set([
  "src/lib/firebase/client.ts",
]);
const allowedDependencies = new Set(["firebase"]);
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
const publicTextExtensions = new Set([
  ...codeExtensions,
  ".css",
  ".htm",
  ".html",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
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
const runtimeArtifactReferencePattern =
  /\bARTIFACT_ROOT\b|(?:^|["'`(])(?:\.{1,2}\/)*artifacts\//;
const runtimeIntegrationEnvPattern =
  /\bNEXT_PUBLIC_[A-Z0-9_]+\b|\bprocess\s*\.\s*env\s*(?:(?:\?\.\s*|\.\s*)(?:NEXT_PUBLIC_[A-Z0-9_]+|FIREBASE[A-Z0-9_]*|FIRESTORE[A-Z0-9_]*|AUTH[A-Z0-9_]*|GOOGLE[A-Z0-9_]*|GCLOUD[A-Z0-9_]*|VERCEL[A-Z0-9_]*|DATABASE[A-Z0-9_]*)|\[\s*["'](?:NEXT_PUBLIC_[A-Z0-9_]+|FIREBASE[A-Z0-9_]*|FIRESTORE[A-Z0-9_]*|AUTH[A-Z0-9_]*|GOOGLE[A-Z0-9_]*|GCLOUD[A-Z0-9_]*|VERCEL[A-Z0-9_]*|DATABASE[A-Z0-9_]*)["']\s*\])/;
const runtimeDynamicEnvAccessPattern =
  /\bprocess\s*\.\s*env\s*(?:\?\.\s*)?\[\s*(?!["'](?:NODE_ENV|PLAYWRIGHT_BASE_URL)["']\s*\])/;
const runtimeOptionalProcessEnvPattern = /\bprocess\s*\?\.\s*env\b/;
const runtimeAlternateEnvAccessPattern = /\bprocess\s*\[\s*["']env["']\s*\]/;
const runtimeEnvAliasPattern =
  /\b(?:const|let|var)\s+(?:\{[^}]*\}|[A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\(?\s*process\s*(?:\.|\?\.)\s*env\b\s*\)?(?!\s*(?:\.|\[|\?\.))/;
const runtimeEnvObjectAssignmentPattern =
  /(?:^|[^.\w$])[A-Za-z_$][\w$]*\s*(?:=|\|\|=|&&=|\?\?=)\s*\(?\s*process\s*(?:\.|\?\.)\s*env\b\s*\)?(?!\s*(?:\.|\[|\?\.))/;
const runtimeProcessEnvDestructurePattern =
  /\b(?:const|let|var)\s+\{[^}]*\benv\b[^}]*\}\s*(?::[^=]+)?=\s*process\b/;
const runtimeProcessModuleImportPattern =
  /\b(?:(?:import|export)\b[\s\S]{0,160}\bfrom\s*["'](?:node:)?process["']|import\s*\(\s*["'](?:node:)?process["']\s*\)|require\s*\(["'](?:node:)?process["']\))/;
const submitDrivenUiRules = [
  {
    name: "form element",
    pattern: /<form\b/,
  },
  {
    name: "onSubmit handler",
    pattern: /\bonSubmit\s*=/,
  },
  {
    name: "formAction handler",
    pattern: /\bformAction\s*=/,
  },
  {
    name: "submit type literal",
    pattern: /\btype\s*(?:=|:)\s*(?:["']submit["']|\{\s*["']submit["']\s*\})/,
  },
  {
    name: "submit type variable",
    pattern: /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*(?:type|Type)[\w$]*\s*(?::[^=]+)?=\s*["']submit["']/,
  },
  {
    name: "submit event cancellation",
    pattern: /\bpreventDefault\s*\(/,
  },
  {
    name: "programmatic submit",
    pattern: /\brequestSubmit\s*\(/,
  },
  {
    name: "form data construction",
    pattern: /\bnew\s+FormData\s*\(/,
  },
  {
    name: "React form action hook",
    pattern: /\buseActionState\s*\(/,
  },
  {
    name: "React form status hook",
    pattern: /\buseFormStatus\s*\(/,
  },
];
const localArrayMutationRules = [
  {
    name: "array-like mutating method",
    pattern: /\.(?:push|splice|unshift|pop|shift)\s*\(/,
  },
  {
    name: "state setter array literal replacement",
    pattern:
      /\bset[A-Z][\w$]*\s*\(\s*(?:(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*)?\[[^\]]*\]/,
  },
  {
    name: "state setter array transform",
    pattern:
      /\bset[A-Z][\w$]*\s*\(\s*(?:(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*(?:\{[\s\S]{0,160}\breturn\s+)?)?[A-Za-z_$][\w$]*\s*\.\s*(?:filter|map|concat|slice|toSpliced|with)\s*\(/,
  },
  {
    name: "state setter array spread",
    pattern:
      /\bset[A-Z][\w$]*\s*\(\s*(?:(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*)?\[\s*\.\.\.[A-Za-z_$][\w$]*/,
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

function auditRepositoryArtifactDirs() {
  for (const artifactDir of disallowedRepositoryArtifactDirs) {
    const fullPath = join(root, artifactDir);

    if (existsSync(fullPath)) {
      addFinding("Disallowed repository artifact directory", fullPath, `use ${artifactRoot} outside the repo`);
    }
  }
}

function auditRuntimeArtifactReference(file, content) {
  const rel = relative(root, file);

  if (!rel.startsWith("src/") && !rel.startsWith("public/")) {
    return;
  }

  if (runtimeArtifactReferencePattern.test(content)) {
    addFinding("Runtime artifact reference", file, `screenshot artifacts must stay under ${artifactRoot}`);
  }
}

function auditRuntimeIntegrationEnvReference(file, content) {
  const rel = relative(root, file);

  if (!rel.startsWith("src/") && !rootFiles.includes(rel)) {
    return;
  }

  if (allowedRuntimeEnvTransitionFiles.has(rel)) {
    return;
  }

  if (
    runtimeIntegrationEnvPattern.test(content) ||
    runtimeDynamicEnvAccessPattern.test(content) ||
    runtimeOptionalProcessEnvPattern.test(content) ||
    runtimeAlternateEnvAccessPattern.test(content) ||
    runtimeEnvAliasPattern.test(content) ||
    runtimeEnvObjectAssignmentPattern.test(content) ||
    runtimeProcessEnvDestructurePattern.test(content) ||
    runtimeProcessModuleImportPattern.test(content)
  ) {
    addFinding(
      "Runtime integration environment reference",
      file,
      "Firebase/Auth/Firestore/deployment env setup is deferred until the backend/integration phase",
    );
  }
}

function auditSubmitDrivenUi(file, content) {
  const rel = relative(root, file);

  if (!rel.startsWith("src/")) {
    return;
  }

  if (allowedSubmitDrivenTransitionFiles.has(rel)) {
    return;
  }

  for (const rule of submitDrivenUiRules) {
    if (rule.pattern.test(content)) {
      addFinding(
        "Submit-driven UI primitive",
        file,
        `${rule.name} is deferred until the backend/business transition phase`,
      );
    }
  }
}

function auditLocalArrayMutation(file, content) {
  const rel = relative(root, file);

  if (!rel.startsWith("src/")) {
    return;
  }

  if (allowedLocalArrayMutationTransitionFiles.has(rel)) {
    return;
  }

  for (const rule of localArrayMutationRules) {
    if (rule.pattern.test(content)) {
      addFinding(
        "Local array add/edit/delete mutation",
        file,
        `${rule.name} is deferred until the backend/business transition phase`,
      );
    }
  }
}

function getNavigationRouteBlock(content, href) {
  const hrefNeedle = `href: "${href}"`;
  const registryStart = content.indexOf("export const adminRouteRegistry");
  const searchStart = registryStart === -1 ? 0 : registryStart;
  const hrefIndex = content.indexOf(hrefNeedle, searchStart);

  if (hrefIndex === -1) {
    return null;
  }

  const start = content.lastIndexOf("\n  {", hrefIndex);
  const end = content.indexOf("\n  },", hrefIndex);

  if (start === -1 || end === -1) {
    return content.slice(Math.max(0, hrefIndex - 200), Math.min(content.length, hrefIndex + 200));
  }

  return content.slice(start, end + 5);
}

function auditAllowedAdminRoutePageConfigs() {
  const configPath = join(root, adminNavigationRegistryFile);
  const content = readFileSync(configPath, "utf8");

  for (const href of allowedAdminRoutePageDeferredHrefs) {
    const block = getNavigationRouteBlock(content, href);

    if (!block) {
      addFinding("Deferred placeholder route config missing", configPath, href);
      continue;
    }

    if (!block.includes("figmaBacked: false") || !block.includes('status: "deferred"')) {
      addFinding(
        "Deferred placeholder route config mismatch",
        configPath,
        `${href} must remain figmaBacked: false with status: "deferred" while AdminRoutePage is allowed`,
      );
    }
  }
}

function auditAllowedEntryRoutePageConfigs() {
  const configPath = join(root, adminNavigationRegistryFile);
  const content = readFileSync(configPath, "utf8");

  for (const href of allowedEntryRoutePageDeferredHrefs) {
    const block = getNavigationRouteBlock(content, href);

    if (!block) {
      addFinding("Deferred entry route config missing", configPath, href);
      continue;
    }

    if (!block.includes("figmaBacked: false") || !block.includes('status: "deferred"')) {
      addFinding(
        "Deferred entry route config mismatch",
        configPath,
        `${href} must remain figmaBacked: false with status: "deferred" while EntryRoutePage is allowed`,
      );
    }
  }
}

function getAppRouteHrefFromPageFile(rel) {
  const parts = rel.split("/");
  const filename = parts.at(-1) ?? "";

  if (parts[0] !== "src" || parts[1] !== "app" || !/^page\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/.test(filename)) {
    return null;
  }

  const routeSegments = parts.slice(2, -1).filter((segment) => {
    return !(segment.startsWith("(") && segment.endsWith(")")) && !segment.startsWith("@");
  });

  return routeSegments.length === 0 ? "/" : `/${routeSegments.join("/")}`;
}

function auditAdminRoutePageUsage(file, content) {
  const rel = relative(root, file);

  if (!rel.startsWith("src/app/") || rel === adminRoutePageFile) {
    return;
  }

  const adminRoutePageUses = content.match(/<AdminRoutePage\b/g)?.length ?? 0;

  if (adminRoutePageUses === 0) {
    return;
  }

  const routeHref = getAppRouteHrefFromPageFile(rel);

  if (!routeHref) {
    addFinding(
      "AdminRoutePage usage must live in a literal App Router page file",
      file,
      "expected src/app/.../page.tsx",
    );
    return;
  }

  if (!allowedAdminRoutePageDeferredHrefs.includes(routeHref)) {
    addFinding(
      "AdminRoutePage may only render deferred placeholder routes",
      file,
      `${routeHref} is not in the deferred placeholder route allowlist`,
    );
  }

  const hrefs = Array.from(
    content.matchAll(
      /<AdminRoutePage\b(?:(?!<AdminRoutePage\b)[\s\S])*?screen=\{\s*findScreenByHref\(\s*["']([^"']+)["']\s*\)\s*\}/g,
    ),
    (match) => match[1],
  );

  if (hrefs.length !== adminRoutePageUses) {
    addFinding(
      "AdminRoutePage usage must use literal deferred route lookup",
      file,
      "expected findScreenByHref(\"/dashboard/...deferred\")",
    );
    return;
  }

  for (const href of hrefs) {
    if (!allowedAdminRoutePageDeferredHrefs.includes(href)) {
      addFinding(
        "AdminRoutePage may only render deferred placeholder routes",
        file,
        `${href} is not in the deferred placeholder allowlist`,
      );
    }

    if (href !== routeHref) {
      addFinding(
        "AdminRoutePage route lookup must match page route",
        file,
        `page route ${routeHref} must not render ${href}`,
      );
    }
  }
}

function auditEntryRoutePageUsage(file, content) {
  const rel = relative(root, file);

  if (!rel.startsWith("src/") || rel === entryRoutePageFile) {
    return;
  }

  const entryRoutePageUses = content.match(/<EntryRoutePage\b/g)?.length ?? 0;

  if (entryRoutePageUses === 0) {
    return;
  }

  const routeHref = getAppRouteHrefFromPageFile(rel);

  if (!routeHref) {
    addFinding(
      "EntryRoutePage usage must live in a literal App Router page file",
      file,
      "expected src/app/.../page.tsx",
    );
    return;
  }

  if (!allowedEntryRoutePageDeferredHrefs.includes(routeHref)) {
    addFinding(
      "EntryRoutePage may only render deferred entry placeholders",
      file,
      `${routeHref} is not in the deferred entry route allowlist`,
    );
  }
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
      if (
        rule.name === "Firebase import or require" &&
        allowedFirebaseAuthTransitionFiles.has(rel)
      ) {
        continue;
      }

      if (rule.pattern.test(content)) {
        addFinding(rule.name, file, `matched ${rule.pattern}`);
      }
    }

    auditRuntimeArtifactReference(file, content);
    auditRuntimeIntegrationEnvReference(file, content);
    auditSubmitDrivenUi(file, content);
    auditLocalArrayMutation(file, content);
    auditAdminRoutePageUsage(file, content);
    auditEntryRoutePageUsage(file, content);
  }
}

if (existsSync(join(root, "public"))) {
  for (const file of listFiles(join(root, "public"))) {
    if (!publicTextExtensions.has(getExtension(file))) {
      continue;
    }

    const content = readFileSync(file, "utf8");
    auditRuntimeArtifactReference(file, content);
  }
}

auditRepositoryArtifactDirs();
auditAllowedAdminRoutePageConfigs();
auditAllowedEntryRoutePageConfigs();

for (const file of rootFiles) {
  const fullPath = join(root, file);
  const content = readFileSync(fullPath, "utf8");

  for (const rule of contentRules) {
    if (rule.pattern.test(content)) {
      addFinding(rule.name, fullPath, `matched ${rule.pattern}`);
    }
  }

  auditRuntimeIntegrationEnvReference(fullPath, content);
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
    if (allowedDependencies.has(dependencyName)) {
      continue;
    }

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
