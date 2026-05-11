import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const auditScriptPath = fileURLToPath(
  new URL("./check-figma-first-guardrails.mjs", import.meta.url),
);
const tempRoot = mkdtempSync(join(tmpdir(), "wee-phase-scope-"));
const rootFiles = [
  "next.config.ts",
  "playwright.config.ts",
  "vitest.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "components.json",
];

function defaultAdminNavigationContent() {
  return `export const adminSections = [
  {
    tabs: [
      { href: "/dashboard", screenId: "DSH-01" },
      { href: "/dashboard/locations", screenId: "DSH-02" },
      { href: "/dashboard/workers", screenId: "DSH-03" },
      { href: "/dashboard/ai-monitoring", screenId: "DSH-04" },
    ],
  },
];

export const adminRouteRegistry = [
  {
    screenId: "DSH-01",
    href: "/dashboard",
    figmaBacked: true,
    status: "figma-backed",
  },
  {
    screenId: "DSH-02",
    href: "/dashboard/locations",
    figmaBacked: false,
    status: "deferred",
  },
  {
    screenId: "DSH-03",
    href: "/dashboard/workers",
    figmaBacked: false,
    status: "deferred",
  },
  {
    screenId: "DSH-04",
    href: "/dashboard/ai-monitoring",
    figmaBacked: false,
    status: "deferred",
  },
];
`;
}

function writeFixtureFile(root, file, content) {
  const fullPath = join(root, file);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function createFixture(name, setup) {
  const root = join(tempRoot, name);

  mkdirSync(join(root, "src/app"), { recursive: true });
  mkdirSync(join(root, "e2e"), { recursive: true });
  writeFixtureFile(root, "package.json", JSON.stringify({ dependencies: {}, devDependencies: {} }));

  for (const file of rootFiles) {
    writeFixtureFile(root, file, file === "components.json" ? "{}" : "\n");
  }

  writeFixtureFile(root, "src/app/_config/admin-navigation.ts", defaultAdminNavigationContent());

  setup?.(root);

  return root;
}

function runAudit(root) {
  const result = spawnSync(process.execPath, [auditScriptPath], {
    cwd: root,
    encoding: "utf8",
  });

  return {
    output: `${result.stdout}${result.stderr}`,
    status: result.status,
  };
}

const cases = [
  {
    name: "clean fixture passes",
    expectSuccess: true,
  },
  {
    name: "issue template guardrail wording is ignored",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        ".github/ISSUE_TEMPLATE/example.yml",
        "Firebase, fetch, route handlers, server actions, and validation schemas are forbidden.",
      );
    },
  },
  {
    name: "admin route page deferred placeholder passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/(admin)/dashboard/locations/page.tsx",
        `import { AdminRoutePage } from "@/app/_components/AdminRoutePage";
import { findScreenByHref } from "@/app/_config/admin-navigation";

export default function LocationsDashboardPage() {
  return <AdminRoutePage screen={findScreenByHref("/dashboard/locations")} />;
}
`,
      );
    },
  },
  {
    name: "figma backed admin route placeholder is blocked",
    expectSuccess: false,
    expectedOutput: "AdminRoutePage may only render deferred placeholder routes",
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/(admin)/dashboard/page.tsx",
        `import { AdminRoutePage } from "@/app/_components/AdminRoutePage";
import { findScreenByHref } from "@/app/_config/admin-navigation";

export default function DashboardPage() {
  return <AdminRoutePage screen={findScreenByHref("/dashboard")} />;
}
`,
      );
    },
  },
  {
    name: "figma backed route with deferred lookup is blocked",
    expectSuccess: false,
    expectedOutput: "AdminRoutePage may only render deferred placeholder routes",
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/(admin)/dashboard/page.tsx",
        `import { AdminRoutePage } from "@/app/_components/AdminRoutePage";
import { findScreenByHref } from "@/app/_config/admin-navigation";

export default function DashboardPage() {
  return <AdminRoutePage screen={findScreenByHref("/dashboard/locations")} />;
}
`,
      );
    },
  },
  {
    name: "deferred placeholder route lookup mismatch is blocked",
    expectSuccess: false,
    expectedOutput: "AdminRoutePage route lookup must match page route",
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/(admin)/dashboard/locations/page.tsx",
        `import { AdminRoutePage } from "@/app/_components/AdminRoutePage";
import { findScreenByHref } from "@/app/_config/admin-navigation";

export default function LocationsDashboardPage() {
  return <AdminRoutePage screen={findScreenByHref("/dashboard/workers")} />;
}
`,
      );
    },
  },
  {
    name: "nonliteral admin route page lookup is blocked",
    expectSuccess: false,
    expectedOutput: "AdminRoutePage usage must use literal deferred route lookup",
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/(admin)/dashboard/locations/page.tsx",
        `import { AdminRoutePage } from "@/app/_components/AdminRoutePage";
import { findScreenByHref } from "@/app/_config/admin-navigation";

export default function LocationsDashboardPage() {
  const screen = findScreenByHref("/dashboard/locations");
  return <AdminRoutePage screen={screen} />;
}
`,
      );
    },
  },
  {
    name: "deferred placeholder route config mismatch is blocked",
    expectSuccess: false,
    expectedOutput: "Deferred placeholder route config mismatch",
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/_config/admin-navigation.ts",
        defaultAdminNavigationContent().replace(
          `href: "/dashboard/locations",
    figmaBacked: false,
    status: "deferred",`,
          `href: "/dashboard/locations",
    figmaBacked: true,
    status: "figma-backed",`,
        ),
      );
    },
  },
  {
    name: "route js backend file is blocked",
    expectSuccess: false,
    expectedOutput: "Disallowed App Router backend file",
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/api/example/route.js",
        "export async function GET() { return Response.json({ ok: true }); }",
      );
    },
  },
  {
    name: "firebase import is blocked",
    expectSuccess: false,
    expectedOutput: "Firebase import or require",
    setup(root) {
      writeFixtureFile(root, "src/lib/firebase.ts", 'import { initializeApp } from "firebase/app";');
    },
  },
  {
    name: "fetch call is blocked",
    expectSuccess: false,
    expectedOutput: "fetch call",
    setup(root) {
      writeFixtureFile(root, "src/features/dashboard/load.ts", 'export function load() { return fetch("/api"); }');
    },
  },
  {
    name: "server action directive is blocked",
    expectSuccess: false,
    expectedOutput: "server action directive",
    setup(root) {
      writeFixtureFile(root, "src/features/workers/actions.ts", '"use server";\nexport async function save() {}');
    },
  },
  {
    name: "next response api is blocked",
    expectSuccess: false,
    expectedOutput: "NextResponse route handler API",
    setup(root) {
      writeFixtureFile(root, "src/features/workers/response.ts", 'import { NextResponse } from "next/server";');
    },
  },
  {
    name: "firestore helper is blocked",
    expectSuccess: false,
    expectedOutput: "Firestore mutation/helper",
    setup(root) {
      writeFixtureFile(root, "src/features/workers/store.ts", 'export function save() { return addDoc(collection(db, "workers"), {}); }');
    },
  },
  {
    name: "optimistic ui is blocked",
    expectSuccess: false,
    expectedOutput: "optimistic UI",
    setup(root) {
      writeFixtureFile(root, "src/features/workers/use-worker.ts", "export function useWorker() { return useOptimistic([]); }");
    },
  },
  {
    name: "validation dependency is blocked",
    expectSuccess: false,
    expectedOutput: "Disallowed package dependency",
    setup(root) {
      writeFixtureFile(
        root,
        "package.json",
        JSON.stringify({ dependencies: { zod: "^4.0.0" }, devDependencies: {} }),
      );
    },
  },
];

let passed = 0;

try {
  for (const testCase of cases) {
    const root = createFixture(testCase.name.replaceAll(/\W+/g, "-").toLowerCase(), testCase.setup);
    const result = runAudit(root);
    const succeeded = result.status === 0;

    if (succeeded !== testCase.expectSuccess) {
      throw new Error(
        `${testCase.name}: expected ${testCase.expectSuccess ? "success" : "failure"} but got ${
          succeeded ? "success" : "failure"
        }\n${result.output}`,
      );
    }

    if (testCase.expectedOutput && !result.output.includes(testCase.expectedOutput)) {
      throw new Error(`${testCase.name}: expected output to include "${testCase.expectedOutput}"\n${result.output}`);
    }

    passed += 1;
  }
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

console.log(`Figma-first phase guardrail self-test passed (${passed} cases).`);
