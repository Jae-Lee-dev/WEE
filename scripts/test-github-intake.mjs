import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const intakeScriptPath = fileURLToPath(new URL("./check-github-intake.mjs", import.meta.url));
const tempRoot = mkdtempSync(join(tmpdir(), "wee-intake-"));
const requiredFiles = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/deferred-figma-screen.yml",
  ".github/ISSUE_TEMPLATE/deployment-setup.yml",
  ".github/ISSUE_TEMPLATE/alert-component.yml",
  ".github/ISSUE_TEMPLATE/backend-phase-switch.yml",
  ".github/pull_request_template.md",
];

function copyCurrentIntake(rootPath) {
  for (const file of requiredFiles) {
    const source = join(root, file);
    const target = join(rootPath, file);

    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target);
  }
}

function writeFixtureFile(rootPath, file, content) {
  const fullPath = join(rootPath, file);

  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function mutateFixtureFile(rootPath, file, mutate) {
  const fullPath = join(rootPath, file);
  const original = readFileSync(fullPath, "utf8");
  const next = mutate(original);

  if (next === original) {
    throw new Error(`${file}: mutation did not change fixture content`);
  }

  writeFileSync(fullPath, next);
}

function createFixture(name, setup) {
  const fixtureRoot = join(tempRoot, name.replaceAll(/\W+/g, "-").toLowerCase());

  copyCurrentIntake(fixtureRoot);
  setup?.(fixtureRoot);

  return fixtureRoot;
}

function runIntakeVerification(fixtureRoot) {
  const result = spawnSync(process.execPath, [intakeScriptPath], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });

  return {
    output: `${result.stdout}${result.stderr}`,
    status: result.status,
  };
}

const cases = [
  {
    name: "current intake passes",
    expectSuccess: true,
  },
  {
    name: "blank issues enabled fails",
    expectSuccess: false,
    expectedOutput: "blank_issues_enabled: false",
    setup(fixtureRoot) {
      writeFixtureFile(fixtureRoot, ".github/ISSUE_TEMPLATE/config.yml", "blank_issues_enabled: true\n");
    },
  },
  {
    name: "missing alert form fails",
    expectSuccess: false,
    expectedOutput: "alert-component.yml: missing required file",
    setup(fixtureRoot) {
      rmSync(join(fixtureRoot, ".github/ISSUE_TEMPLATE/alert-component.yml"));
    },
  },
  {
    name: "deferred phase safety required checkbox fails",
    expectSuccess: false,
    expectedOutput: 'checkbox "No Firebase imports or setup" in "phase-safety" must be present with required: true',
    setup(fixtureRoot) {
      mutateFixtureFile(fixtureRoot, ".github/ISSUE_TEMPLATE/deferred-figma-screen.yml", (content) =>
        content.replace("        - label: No Firebase imports or setup\n          required: true", "        - label: No Firebase imports or setup"),
      );
    },
  },
  {
    name: "alert phase safety required checkbox fails",
    expectSuccess: false,
    expectedOutput: 'checkbox "No fetch" in "phase-safety" must be present with required: true',
    setup(fixtureRoot) {
      mutateFixtureFile(fixtureRoot, ".github/ISSUE_TEMPLATE/alert-component.yml", (content) =>
        content.replace("        - label: No fetch\n          required: true", "        - label: No fetch"),
      );
    },
  },
  {
    name: "backend guardrail acknowledgement required checkbox fails",
    expectSuccess: false,
    expectedOutput:
      'checkbox "Environment variables and secrets must not be committed." in "guardrail-acknowledgement" must be present with required: true',
    setup(fixtureRoot) {
      mutateFixtureFile(fixtureRoot, ".github/ISSUE_TEMPLATE/backend-phase-switch.yml", (content) =>
        content.replace(
          "        - label: Environment variables and secrets must not be committed.\n          required: true",
          "        - label: Environment variables and secrets must not be committed.",
        ),
      );
    },
  },
  {
    name: "pull request phase safety fails",
    expectSuccess: false,
    expectedOutput: 'missing required snippet "No optimistic UI"',
    setup(fixtureRoot) {
      mutateFixtureFile(fixtureRoot, ".github/pull_request_template.md", (content) =>
        content.replace("- [ ] No optimistic UI", "- [ ] No optimistic updates"),
      );
    },
  },
  {
    name: "deployment readiness guardrail fails",
    expectSuccess: false,
    expectedOutput: 'missing required snippet "No Firebase/Auth/Firestore variables are being added in this request."',
    setup(fixtureRoot) {
      mutateFixtureFile(fixtureRoot, ".github/ISSUE_TEMPLATE/deployment-setup.yml", (content) =>
        content.replace("        - label: No Firebase/Auth/Firestore variables are being added in this request.\n          required: true", ""),
      );
    },
  },
];

let passed = 0;

try {
  for (const testCase of cases) {
    const fixtureRoot = createFixture(testCase.name, testCase.setup);
    const result = runIntakeVerification(fixtureRoot);
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

console.log(`GitHub intake guardrail self-test passed (${passed} cases).`);
