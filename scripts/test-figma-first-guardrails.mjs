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
  {
    screenId: "AUTH-01",
    href: "/login",
    figmaBacked: false,
    status: "deferred",
  },
  {
    screenId: "AUTH-02",
    href: "/signup",
    figmaBacked: false,
    status: "deferred",
  },
  {
    screenId: "AUTH-03",
    href: "/forgot-password",
    figmaBacked: false,
    status: "deferred",
  },
  {
    screenId: "ONB-01",
    href: "/onboarding/workspace",
    figmaBacked: false,
    status: "deferred",
  },
  {
    screenId: "ONB-02",
    href: "/onboarding/setup",
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
  writeFixtureFile(
    root,
    "package.json",
    JSON.stringify({ dependencies: {}, devDependencies: {} }),
  );

  for (const file of rootFiles) {
    writeFixtureFile(root, file, file === "components.json" ? "{}" : "\n");
  }

  writeFixtureFile(
    root,
    "src/app/_config/admin-navigation.ts",
    defaultAdminNavigationContent(),
  );

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
    name: "e2e artifact root helper passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "e2e/visual/helpers.ts",
        'export const artifactRoot = process.env.ARTIFACT_ROOT ?? "../../artifacts";',
      );
    },
  },
  {
    name: "generic node env reference passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/dashboard/env-preview.ts",
        'export const isDevelopment = process.env.NODE_ENV === "development";',
      );
    },
  },
  {
    name: "generic node env assignment passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/dashboard/env-preview.ts",
        "export const nodeEnv = process.env.NODE_ENV;",
      );
    },
  },
  {
    name: "generic node env bracket reference passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/dashboard/env-preview.ts",
        'export const isDevelopment = process.env["NODE_ENV"] === "development";',
      );
    },
  },
  {
    name: "playwright base url env reference passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "playwright.config.ts",
        "export default { use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000' } };",
      );
    },
  },
  {
    name: "playwright base url bracket env reference passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "playwright.config.ts",
        'export default { use: { baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:3000" } };',
      );
    },
  },
  {
    name: "repository artifact directory is blocked",
    expectSuccess: false,
    expectedOutput: "Disallowed repository artifact directory",
    setup(root) {
      mkdirSync(join(root, "artifacts/actual/DSH-01"), { recursive: true });
    },
  },
  {
    name: "public artifact directory is blocked",
    expectSuccess: false,
    expectedOutput: "Disallowed repository artifact directory",
    setup(root) {
      mkdirSync(join(root, "public/artifacts/actual/DSH-01"), {
        recursive: true,
      });
    },
  },
  {
    name: "runtime artifact reference is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime artifact reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/dashboard/artifact.ts",
        'export const screenshot = "../../artifacts/figma/DSH-01/default-1920.png";',
      );
    },
  },
  {
    name: "runtime next public env reference is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/firebase-config.ts",
        "export const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;",
      );
    },
  },
  {
    name: "runtime bracket firebase env reference is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/firebase-config.ts",
        'export const projectId = process.env["FIREBASE_PROJECT_ID"];',
      );
    },
  },
  {
    name: "runtime bracket next public env reference is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/firebase-config.ts",
        'export const apiKey = process.env["NEXT_PUBLIC_FIREBASE_API_KEY"];',
      );
    },
  },
  {
    name: "runtime bracket database env reference is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/database-config.ts",
        'export const databaseUrl = process.env["DATABASE_URL"];',
      );
    },
  },
  {
    name: "runtime dynamic env key is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'const key = "FIREBASE_PROJECT_ID"; export const value = process.env[key];',
      );
    },
  },
  {
    name: "runtime optional dynamic env key is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'const key = "FIREBASE_PROJECT_ID"; export const value = process.env?.[key];',
      );
    },
  },
  {
    name: "runtime optional env property reference is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "export const projectId = process.env?.FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime template env key is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'const suffix = "FIREBASE_API_KEY"; export const value = process.env[`NEXT_PUBLIC_${suffix}`];',
      );
    },
  },
  {
    name: "runtime alternate env object access is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'const key = "FIREBASE_PROJECT_ID"; export const value = process["env"][key];',
      );
    },
  },
  {
    name: "runtime env alias is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "const env = process.env; export const value = env.FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime typed env alias is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "const env: NodeJS.ProcessEnv = process.env; export const value = env.FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime env destructuring is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "const { FIREBASE_PROJECT_ID } = process.env; export const projectId = FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime typed env destructuring is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "const { FIREBASE_PROJECT_ID }: NodeJS.ProcessEnv = process.env; export const projectId = FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime parenthesized env alias is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "const env = (process.env); export const value = env.FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime delayed env assignment is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "let env; env = process.env; export const value = env.FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime conditional delayed env assignment is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "let env; if (ready) env = process.env; export const value = env.FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime logical delayed env assignment is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "let env; env ||= process.env; export const value = env.FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime process env destructuring is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "const { env } = process; export const value = env.FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime optional process env access is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "export const value = process?.env?.FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime parenthesized env property access is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        "export const value = (process.env).FIREBASE_PROJECT_ID;",
      );
    },
  },
  {
    name: "runtime process module import is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'import nodeProcess from "node:process"; export const value = nodeProcess.env.FIREBASE_PROJECT_ID;',
      );
    },
  },
  {
    name: "runtime dynamic process module import is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'export async function readEnv() { const nodeProcess = await import("node:process"); return nodeProcess.env.FIREBASE_PROJECT_ID; }',
      );
    },
  },
  {
    name: "runtime compact process module import is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'import{env}from"node:process"; export const value = env.FIREBASE_PROJECT_ID;',
      );
    },
  },
  {
    name: "runtime spaced require process module import is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'const nodeProcess = require ("node:process"); export const value = nodeProcess.env.FIREBASE_PROJECT_ID;',
      );
    },
  },
  {
    name: "runtime mixed process module import is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'import process, { env } from "node:process"; export const value = env.FIREBASE_PROJECT_ID;',
      );
    },
  },
  {
    name: "runtime process module re-export is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-config.ts",
        'export { env } from "node:process";',
      );
    },
  },
  {
    name: "root config integration env reference is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "next.config.ts",
        "export default { env: { projectId: process.env.GOOGLE_CLOUD_PROJECT } };",
      );
    },
  },
  {
    name: "root config deployment env reference is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "next.config.ts",
        "export default { env: { vercelEnv: process . env . VERCEL_ENV } };",
      );
    },
  },
  {
    name: "next public env literal is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime integration environment reference",
    setup(root) {
      writeFixtureFile(
        root,
        "src/lib/env-names.ts",
        'export const firebaseApiKeyName = "NEXT_PUBLIC_FIREBASE_API_KEY";',
      );
    },
  },
  {
    name: "public svg artifact reference is blocked",
    expectSuccess: false,
    expectedOutput: "Runtime artifact reference",
    setup(root) {
      writeFixtureFile(
        root,
        "public/example.svg",
        '<svg><image href="../../artifacts/actual/DSH-01/default.png" /></svg>',
      );
    },
  },
  {
    name: "e2e submit helper wording is ignored",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "e2e/visual/submit.spec.ts",
        'test("submit visual state", async ({ page }) => { await page.locator("form").evaluate((form) => form.requestSubmit()); });',
      );
    },
  },
  {
    name: "e2e local array mutation helper is ignored",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "e2e/visual/collect.ts",
        "export function collect(items: string[]) { items.push('state'); return items; }",
      );
    },
  },
  {
    name: "render-only array spread is allowed",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/filter-tabs.tsx",
        `export function FilterPreview({ options }: { options: string[] }) {
  setMenuOpen((open) => !open);
  return <Tabs options={[...options]} />;
}
`,
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
    expectedOutput:
      "AdminRoutePage may only render deferred placeholder routes",
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
    expectedOutput:
      "AdminRoutePage may only render deferred placeholder routes",
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
    expectedOutput:
      "AdminRoutePage usage must use literal deferred route lookup",
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
    name: "entry route page deferred placeholder passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/(entry)/login/page.tsx",
        `import { EntryRoutePage } from "@/app/_components/EntryRoutePage";

export default function LoginPage() {
  return (
    <EntryRoutePage
      title="로그인"
      description="Wee 관리자 워크스페이스에 접속합니다."
      fields={[]}
      actionLabel="로그인"
      actionHref="/dashboard"
    />
  );
}
`,
      );
    },
  },
  {
    name: "figma backed route entry placeholder is blocked",
    expectSuccess: false,
    expectedOutput:
      "EntryRoutePage may only render deferred entry placeholders",
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/(admin)/dashboard/page.tsx",
        `import { EntryRoutePage } from "@/app/_components/EntryRoutePage";

export default function DashboardPage() {
  return (
    <EntryRoutePage
      title="로그인"
      description="잘못된 placeholder 사용"
      fields={[]}
      actionLabel="로그인"
      actionHref="/dashboard"
    />
  );
}
`,
      );
    },
  },
  {
    name: "entry route page outside page file is blocked",
    expectSuccess: false,
    expectedOutput:
      "EntryRoutePage usage must live in a literal App Router page file",
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/(entry)/login/LoginPlaceholder.tsx",
        `import { EntryRoutePage } from "@/app/_components/EntryRoutePage";

export function LoginPlaceholder() {
  return (
    <EntryRoutePage
      title="로그인"
      description="잘못된 placeholder 사용"
      fields={[]}
      actionLabel="로그인"
      actionHref="/dashboard"
    />
  );
}
`,
      );
    },
  },
  {
    name: "entry route page wrapper outside app is blocked",
    expectSuccess: false,
    expectedOutput:
      "EntryRoutePage usage must live in a literal App Router page file",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/auth/LoginPlaceholder.tsx",
        `import { EntryRoutePage } from "@/app/_components/EntryRoutePage";

export function LoginPlaceholder() {
  return (
    <EntryRoutePage
      title="로그인"
      description="잘못된 wrapper 사용"
      fields={[]}
      actionLabel="로그인"
      actionHref="/dashboard"
    />
  );
}
`,
      );
    },
  },
  {
    name: "entry route config mismatch is blocked",
    expectSuccess: false,
    expectedOutput: "Deferred entry route config mismatch",
    setup(root) {
      writeFixtureFile(
        root,
        "src/app/_config/admin-navigation.ts",
        defaultAdminNavigationContent().replace(
          `href: "/login",
    figmaBacked: false,
    status: "deferred",`,
          `href: "/login",
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
      writeFixtureFile(
        root,
        "src/lib/firebase.ts",
        'import { initializeApp } from "firebase/app";',
      );
    },
  },
  {
    name: "entry firebase auth signup transition passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "package.json",
        JSON.stringify({
          dependencies: { firebase: "^12.13.0" },
          devDependencies: {},
        }),
      );
      writeFixtureFile(
        root,
        "src/lib/firebase/client.ts",
        `import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export function getFirebaseAuth() {
  const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  });
  return getAuth(app);
}
`,
      );
      writeFixtureFile(
        root,
        "src/features/entry/signup-form.tsx",
        `"use client";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function SignupForm() {
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createUserWithEmailAndPassword(getFirebaseAuth(), "admin@wee.kr", "password1");
    router.push("/onboarding/workspace");
  }

  return (
    <form onSubmit={submit}>
      <button type="submit">가입</button>
    </form>
  );
}
`,
      );
    },
  },
  {
    name: "onboarding and location creation transition passes",
    expectSuccess: true,
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/entry/entry-screens.tsx",
        `export function WorkspaceOnboardingScreen() {
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form onSubmit={submit}>
      <button type="submit">소속 생성</button>
    </form>
  );
}
`,
      );
      writeFixtureFile(
        root,
        "src/features/settings/settings-locations-screen.tsx",
        `export function SettingsLocationsScreen() {
  const [locations, setLocations] = useState([]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocations((current) => [{ id: "location-1" }, ...current]);
  }

  return (
    <form onSubmit={submit}>
      <button type="submit">저장</button>
    </form>
  );
}
`,
      );
      writeFixtureFile(
        root,
        "src/features/entry/workspace-data-source.ts",
        `import { doc, runTransaction, setDoc } from "firebase/firestore";

export async function createWorkspace(db, uid) {
  const workspaceRef = doc(db, "workspaces", "workspace_1");
  await runTransaction(db, async (transaction) => {
    transaction.set(workspaceRef, { managerUid: uid });
  });
  return setDoc(doc(db, "users", uid), { activeWorkspaceId: workspaceRef.id }, { merge: true });
}
`,
      );
      writeFixtureFile(
        root,
        "src/features/settings/settings-locations-data-source.ts",
        `import { collection, doc, writeBatch } from "firebase/firestore";

export function createLocation(db, workspaceId, input) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "workspaces", workspaceId, "locations")), input);
  return batch.commit();
}
`,
      );
    },
  },
  {
    name: "fetch call is blocked",
    expectSuccess: false,
    expectedOutput: "fetch call",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/dashboard/load.ts",
        'export function load() { return fetch("/api"); }',
      );
    },
  },
  {
    name: "submit-driven form primitive is blocked",
    expectSuccess: false,
    expectedOutput: "Submit-driven UI primitive",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/settings/location-form.tsx",
        `export function LocationForm() {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <button type="submit">저장</button>
    </form>
  );
}
`,
      );
    },
  },
  {
    name: "form data construction is blocked",
    expectSuccess: false,
    expectedOutput: "Submit-driven UI primitive",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/payroll/payroll-submit.ts",
        "export function collect(form: HTMLFormElement) { return new FormData(form); }",
      );
    },
  },
  {
    name: "submit type expression is blocked",
    expectSuccess: false,
    expectedOutput: "Submit-driven UI primitive",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/settings/submit-button.tsx",
        'export function SubmitButton() { return <button type={"submit"}>저장</button>; }',
      );
    },
  },
  {
    name: "submit type variable is blocked",
    expectSuccess: false,
    expectedOutput: "Submit-driven UI primitive",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/settings/submit-button-variable.tsx",
        'export function SubmitButton() { const buttonType = "submit"; return <button type={buttonType}>저장</button>; }',
      );
    },
  },
  {
    name: "submit type object property is blocked",
    expectSuccess: false,
    expectedOutput: "Submit-driven UI primitive",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/settings/submit-button-props.tsx",
        'export const submitButtonProps = { type: "submit" };',
      );
    },
  },
  {
    name: "programmatic submit primitive is blocked",
    expectSuccess: false,
    expectedOutput: "Submit-driven UI primitive",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/settings/programmatic-submit.tsx",
        `export function ProgrammaticSubmit({ form }: { form: HTMLFormElement }) {
  return <button formAction="/api/settings" onClick={() => form.requestSubmit()}>저장</button>;
}
`,
      );
    },
  },
  {
    name: "react form action hook is blocked",
    expectSuccess: false,
    expectedOutput: "Submit-driven UI primitive",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/use-submit.tsx",
        "export function useSubmitPreview() { return useActionState(async () => null, null); }",
      );
    },
  },
  {
    name: "react form status hook is blocked",
    expectSuccess: false,
    expectedOutput: "Submit-driven UI primitive",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/use-submit-status.tsx",
        "export function SubmitStatusPreview() { const status = useFormStatus(); return status.pending; }",
      );
    },
  },
  {
    name: "local array push mutation is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-tags.ts",
        "export function addTag(tags: string[]) { tags.push('신규'); return tags; }",
      );
    },
  },
  {
    name: "local array splice mutation is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-tags.ts",
        "export function removeTag(tags: string[]) { tags.splice(0, 1); return tags; }",
      );
    },
  },
  {
    name: "state setter filter deletion is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        "export function removeWorker(id: string) { setWorkers((workers) => workers.filter((worker) => worker.id !== id)); }",
      );
    },
  },
  {
    name: "state setter map edit is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        "export function updateWorker(id: string) { setWorkers((workers) => workers.map((worker) => worker.id === id ? worker : worker)); }",
      );
    },
  },
  {
    name: "state setter spread add is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        "export function addWorker(worker: Worker) { setWorkers((workers) => [...workers, worker]); }",
      );
    },
  },
  {
    name: "state setter empty array replacement is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        "export function clearWorkers() { setWorkers([]); }",
      );
    },
  },
  {
    name: "state setter array literal replacement is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        "export function replaceWorkers(worker: Worker) { setWorkers([worker]); }",
      );
    },
  },
  {
    name: "state setter concat add is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        "export function addWorker(worker: Worker) { setWorkers((workers) => workers.concat(worker)); }",
      );
    },
  },
  {
    name: "state setter slice deletion is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        "export function removeFirstWorker() { setWorkers((workers) => workers.slice(1)); }",
      );
    },
  },
  {
    name: "state setter toSpliced edit is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        "export function replaceWorker(worker: Worker) { setWorkers((workers) => workers.toSpliced(0, 1, worker)); }",
      );
    },
  },
  {
    name: "state setter with edit is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        "export function replaceWorker(worker: Worker) { setWorkers((workers) => workers.with(0, worker)); }",
      );
    },
  },
  {
    name: "state setter block body filter deletion is blocked",
    expectSuccess: false,
    expectedOutput: "Local array add/edit/delete mutation",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/worker-list.tsx",
        `export function removeWorker(id: string) {
  setWorkers((workers) => {
    return workers.filter((worker) => worker.id !== id);
  });
}
`,
      );
    },
  },
  {
    name: "server action directive is blocked",
    expectSuccess: false,
    expectedOutput: "server action directive",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/actions.ts",
        '"use server";\nexport async function save() {}',
      );
    },
  },
  {
    name: "next response api is blocked",
    expectSuccess: false,
    expectedOutput: "NextResponse route handler API",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/response.ts",
        'import { NextResponse } from "next/server";',
      );
    },
  },
  {
    name: "firestore helper is blocked",
    expectSuccess: false,
    expectedOutput: "Firestore mutation/helper",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/store.ts",
        'export function save() { return addDoc(collection(db, "workers"), {}); }',
      );
    },
  },
  {
    name: "optimistic ui is blocked",
    expectSuccess: false,
    expectedOutput: "optimistic UI",
    setup(root) {
      writeFixtureFile(
        root,
        "src/features/workers/use-worker.ts",
        "export function useWorker() { return useOptimistic([]); }",
      );
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
        JSON.stringify({
          dependencies: { zod: "^4.0.0" },
          devDependencies: {},
        }),
      );
    },
  },
];

let passed = 0;

try {
  for (const testCase of cases) {
    const root = createFixture(
      testCase.name.replaceAll(/\W+/g, "-").toLowerCase(),
      testCase.setup,
    );
    const result = runAudit(root);
    const succeeded = result.status === 0;

    if (succeeded !== testCase.expectSuccess) {
      throw new Error(
        `${testCase.name}: expected ${testCase.expectSuccess ? "success" : "failure"} but got ${
          succeeded ? "success" : "failure"
        }\n${result.output}`,
      );
    }

    if (
      testCase.expectedOutput &&
      !result.output.includes(testCase.expectedOutput)
    ) {
      throw new Error(
        `${testCase.name}: expected output to include "${testCase.expectedOutput}"\n${result.output}`,
      );
    }

    passed += 1;
  }
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

console.log(`Figma-first phase guardrail self-test passed (${passed} cases).`);
