import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3112";
const artifactRoot =
  process.env.ARTIFACT_ROOT ??
  path.resolve(process.cwd(), "../../../artifacts/admin-button-srs-audit");

const routeRegistry = [
  { screenId: "DSH-01", title: "운영 인박스", href: "/dashboard" },
  { screenId: "DSH-02", title: "근무지별 대시보드", href: "/dashboard/locations" },
  { screenId: "DSH-03", title: "근무자별 대시보드", href: "/dashboard/workers" },
  { screenId: "DSH-04", title: "AI 이상탐지/모니터링", href: "/dashboard/ai-monitoring" },
  { screenId: "WKR-01", title: "소속 신청", href: "/workers/applications" },
  { screenId: "WKR-02", title: "조교 목록", href: "/workers" },
  { screenId: "WKR-03", title: "조교 상세-기본 정보", href: "/workers/worker_kim_seoyeon" },
  {
    screenId: "WKR-04",
    title: "조교 상세-시간표",
    href: "/workers/worker_kim_seoyeon/schedule",
  },
  {
    screenId: "WKR-05",
    title: "조교 상세-급여 현황",
    href: "/workers/worker_kim_seoyeon/payroll",
  },
  { screenId: "WKR-06", title: "근무자 태그 관리", href: "/workers/tags" },
  { screenId: "SCH-01", title: "승인 대기", href: "/schedule" },
  { screenId: "SCH-02", title: "전체 시간표 타임라인", href: "/schedule/timeline" },
  { screenId: "DUT-01", title: "근무 목록", href: "/schedule/duties" },
  { screenId: "DUT-02", title: "근무 상세", href: "/schedule/duties/duty_english_c" },
  { screenId: "DUT-03", title: "근무 태그 관리", href: "/schedule/duty-tags" },
  { screenId: "REC-01", title: "근무 타임라인", href: "/records" },
  { screenId: "REC-05", title: "추가근무 이력", href: "/records/overtime-history" },
  { screenId: "REC-02", title: "이상감지처리 이력", href: "/records/anomaly-history" },
  { screenId: "REC-03", title: "이의신청 이력", href: "/records/corrections" },
  { screenId: "REC-04", title: "출퇴근 이력", href: "/records/attendance" },
  { screenId: "PAY-01", title: "급여 산정", href: "/payroll" },
  { screenId: "PAY-02", title: "급여 명세", href: "/payroll/statements" },
  { screenId: "HO-01", title: "문서 편집", href: "/handover" },
  { screenId: "SET-01", title: "소속", href: "/settings" },
  { screenId: "SET-02", title: "근무지", href: "/settings/locations" },
  { screenId: "SET-03", title: "운영 설정", href: "/settings/rules" },
  { screenId: "SET-04", title: "알림", href: "/settings/notifications" },
  { screenId: "SET-05", title: "요금제", href: "/settings/billing" },
];

const routeIdFilter = (process.env.AUDIT_ROUTE_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const routes =
  routeIdFilter.length > 0
    ? routeRegistry.filter((route) => routeIdFilter.includes(route.screenId))
    : routeRegistry;

const maxDepth = Number(process.env.AUDIT_MAX_DEPTH ?? 3);
const maxSequencesPerRoute = Number(process.env.AUDIT_MAX_SEQUENCES ?? 90);
const clickTimeoutMs = Number(process.env.AUDIT_CLICK_TIMEOUT_MS ?? 2500);
const settleMs = Number(process.env.AUDIT_SETTLE_MS ?? 200);
const routeNetworkIdleTimeoutMs = Number(
  process.env.AUDIT_ROUTE_NETWORK_IDLE_TIMEOUT_MS ?? 1200,
);

const storageSeed = {
  activeUserKey: "wee.admin.activeUserId.v1",
  activeWorkspaceKey: "wee.admin.activeWorkspaceId.v1",
  statusKeyPrefix: "wee.admin.workspaceStatus.v1",
  userId: "visual-admin",
  workspaceId: "workspace_visual",
};

await mkdir(artifactRoot, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1920, height: 1080 },
});
await context.addInitScript((seed) => {
  window.localStorage.setItem(seed.activeUserKey, seed.userId);
  window.localStorage.setItem(seed.activeWorkspaceKey, seed.workspaceId);
  window.localStorage.setItem(
    `${seed.statusKeyPrefix}.${seed.userId}`,
    "setup-complete",
  );
}, storageSeed);

const allResults = [];

try {
  for (const route of routes) {
    const page = await context.newPage();
    let routeResult;
    try {
      routeResult = await auditRoute(page, route);
    } catch (error) {
      routeResult = {
        route,
        clickLimitReached: false,
        clicks: [],
        errors: [
          {
            path: "(route)",
            error: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
    allResults.push(routeResult);
    await page.close();
    console.log(
      `${route.screenId} ${route.href}: ${routeResult.clicks.length} clicks, ${routeResult.errors.length} errors`,
    );
    await writeSummary(allResults);
  }
} finally {
  await browser.close();
}

await writeSummary(allResults);

async function writeSummary(results) {
  const summary = {
    generatedAt: new Date().toISOString(),
    baseURL,
    artifactRoot,
    maxDepth,
    maxSequencesPerRoute,
    routeFilter: routeIdFilter,
    routeCount: routes.length,
    completedRouteCount: results.length,
    totalClicks: results.reduce((sum, result) => sum + result.clicks.length, 0),
    totalErrors: results.reduce((sum, result) => sum + result.errors.length, 0),
    routes: results,
  };

  await writeFile(
    path.join(artifactRoot, "button-click-results.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(artifactRoot, "button-click-summary.md"),
    renderMarkdown(summary),
    "utf8",
  );
}

function routeURL(href) {
  return new URL(href, baseURL).toString();
}

async function auditRoute(page, route) {
  const pageErrors = [];
  const consoleErrors = [];
  const downloads = [];
  const dialogs = [];
  const fileChoosers = [];

  page.on("pageerror", (error) => {
    pageErrors.push(firstLine(error.message));
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(firstLine(message.text()));
    }
  });
  page.on("dialog", async (dialog) => {
    dialogs.push({
      type: dialog.type(),
      message: dialog.message(),
    });
    if (dialog.type() === "beforeunload") {
      await dialog.accept().catch(() => {});
    } else {
      await dialog.dismiss().catch(() => {});
    }
  });
  page.on("download", (download) => {
    downloads.push(download.suggestedFilename());
  });
  page.on("filechooser", async (fileChooser) => {
    fileChoosers.push(fileChooser.isMultiple() ? "multiple" : "single");
    await fileChooser.setFiles([]).catch(() => {});
  });

  const queue = [[]];
  const visited = new Set([""]);
  const clicks = [];
  const errors = [];

  while (queue.length > 0 && clicks.length < maxSequencesPerRoute) {
    const parentPath = queue.shift();

    await resetToRoute(page, route.href);
    const parentReplay = await replaySequence(page, parentPath);
    if (!parentReplay.ok) {
      errors.push({
        path: parentPath.map((step) => step.label).join(" > "),
        error: parentReplay.error,
      });
      continue;
    }

    const buttons = await collectButtons(page);

    for (const button of buttons) {
      if (button.disabled || button.hidden || button.name === "") {
        continue;
      }
      if (clicks.length >= maxSequencesPerRoute) {
        break;
      }

      const nextPath = [...parentPath, button.selector];
      const pathKey = nextPath.map((step) => step.key).join(" > ");
      if (visited.has(pathKey)) {
        continue;
      }
      visited.add(pathKey);

      await resetToRoute(page, route.href);
      const replay = await replaySequence(page, parentPath);
      if (!replay.ok) {
        errors.push({
          path: parentPath.map((step) => step.label).join(" > "),
          error: replay.error,
        });
        continue;
      }

      const beforeState = await collectState(page);
      const clickResult = await clickButtonBySelector(page, button.selector);
      const afterState = await collectState(page);
      const record = {
        path: nextPath.map((step) => step.label),
        depth: nextPath.length,
        clicked: button,
        ok: clickResult.ok,
        error: clickResult.error,
        before: beforeState,
        after: afterState,
        pageErrors: drainIssues(pageErrors),
        consoleErrors: drainIssues(consoleErrors),
        downloads: drain(downloads),
        dialogs: drain(dialogs),
        fileChoosers: drain(fileChoosers),
      };
      clicks.push(record);
      if (clicks.length % 10 === 0) {
        console.log(
          `${route.screenId} ${route.href}: ${clicks.length}/${maxSequencesPerRoute} click sequences`,
        );
      }

      if (!clickResult.ok) {
        errors.push({
          path: record.path.join(" > "),
          error: clickResult.error,
        });
        continue;
      }

      if (nextPath.length < maxDepth && shouldExpand(afterState, beforeState)) {
        queue.push(nextPath);
      }
    }
  }

  return {
    route,
    clickLimitReached: clicks.length >= maxSequencesPerRoute,
    clicks,
    errors,
  };
}

async function resetToRoute(page, href) {
  await page.goto(routeURL(href), { waitUntil: "domcontentloaded", timeout: 15_000 });
  await page
    .waitForLoadState("networkidle", {
      timeout: routeNetworkIdleTimeoutMs,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
}

async function replaySequence(page, sequence) {
  for (const step of sequence) {
    const result = await clickButtonBySelector(page, step);
    if (!result.ok) {
      return result;
    }
  }

  return { ok: true };
}

async function clickButtonBySelector(page, selector) {
  try {
    const candidates = page.locator(selector.css);
    const candidateIndex = await candidates.evaluateAll((elements, visibleNth) => {
      let seen = 0;

      for (let index = 0; index < elements.length; index += 1) {
        const element = elements[index];

        if (!(element instanceof HTMLElement)) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none";

        if (!visible) {
          continue;
        }

        if (seen === visibleNth) {
          return index;
        }

        seen += 1;
      }

      return -1;
    }, selector.nth);

    if (candidateIndex < 0) {
      throw new Error(`Button not found for selector ${selector.css} nth ${selector.nth}`);
    }

    const candidate = candidates.nth(candidateIndex);

    await candidate.scrollIntoViewIfNeeded({ timeout: clickTimeoutMs });
    await Promise.race([
      candidate.click({ timeout: clickTimeoutMs }),
      page.waitForEvent("download", { timeout: clickTimeoutMs }).catch(() => null),
      page.waitForEvent("filechooser", { timeout: clickTimeoutMs }).catch(() => null),
    ]);
    await page.waitForTimeout(settleMs);
    await page.waitForLoadState("networkidle", { timeout: 700 }).catch(() => {});
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function collectButtons(page) {
  return page.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll('button, [role="button"], [role="tab"]'),
    );
    const visibleElements = elements.filter((element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    });

    const sameKeyCount = new Map();
    const sameSelectorCount = new Map();

    return visibleElements.map((element, index) => {
      const name = getAccessibleName(element);
      const testId = element.getAttribute("data-testid") ?? "";
      const role = element.getAttribute("role") ?? element.tagName.toLowerCase();
      const pressed = element.getAttribute("aria-pressed");
      const expanded = element.getAttribute("aria-expanded");
      const selected = element.getAttribute("aria-selected");
      const disabled =
        element.hasAttribute("disabled") ||
        element.getAttribute("aria-disabled") === "true";
      const baseKey = `${role}:${testId}:${name}`;
      const nthByKey = sameKeyCount.get(baseKey) ?? 0;
      sameKeyCount.set(baseKey, nthByKey + 1);
      const css = createStableSelector(element);
      const nthBySelector = sameSelectorCount.get(css) ?? 0;
      sameSelectorCount.set(css, nthBySelector + 1);

      return {
        name,
        role,
        testId,
        disabled,
        hidden: element.getAttribute("aria-hidden") === "true",
        pressed,
        expanded,
        selected,
        index,
        selector: {
          css,
          nth: nthBySelector,
          key: `${baseKey}:${nthByKey}`,
          label: name || testId || `${role}#${index}`,
        },
      };
    });

    function getAccessibleName(element) {
      const ariaLabel = element.getAttribute("aria-label")?.trim();
      if (ariaLabel) {
        return normalize(ariaLabel);
      }
      const labelledBy = element.getAttribute("aria-labelledby");
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ")
          .trim();
        if (text) {
          return normalize(text);
        }
      }
      return normalize(element.textContent ?? "");
    }

    function createStableSelector(element) {
      const testId = element.getAttribute("data-testid");
      if (testId) {
        return `[data-testid="${cssEscape(testId)}"]`;
      }

      const role = element.getAttribute("role");
      if (role === "tab") {
        return '[role="tab"]';
      }
      if (role === "button") {
        return '[role="button"]';
      }

      return "button";
    }

    function normalize(value) {
      return value.replace(/\s+/g, " ").trim();
    }

    function cssEscape(value) {
      if (window.CSS?.escape) {
        return window.CSS.escape(value);
      }

      return value.replace(/"/g, '\\"');
    }
  });
}

async function collectState(page) {
  return page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).map(
      (dialog) => normalize(dialog.textContent ?? "").slice(0, 300),
    );
    const alerts = Array.from(
      document.querySelectorAll('[role="alert"], [role="status"], [data-testid="wee-toast"]'),
    ).map((node) => normalize(node.textContent ?? "").slice(0, 220));
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((node) => normalize(node.textContent ?? ""))
      .filter(Boolean)
      .slice(0, 8);
    const selectedButtons = Array.from(
      document.querySelectorAll(
        'button[aria-pressed="true"], [role="tab"][aria-selected="true"], button[data-selected="true"]',
      ),
    )
      .map((node) => normalize(node.textContent ?? node.getAttribute("aria-label") ?? ""))
      .filter(Boolean)
      .slice(0, 12);
    const visibleButtonCount = Array.from(
      document.querySelectorAll('button, [role="button"], [role="tab"]'),
    ).filter((element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    }).length;

    return {
      url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      dialogs,
      alerts,
      headings,
      selectedButtons,
      visibleButtonCount,
    };

    function normalize(value) {
      return value.replace(/\s+/g, " ").trim();
    }
  });
}

function shouldExpand(afterState, beforeState) {
  return (
    afterState.url !== beforeState.url ||
    afterState.dialogs.length > beforeState.dialogs.length ||
    afterState.visibleButtonCount !== beforeState.visibleButtonCount ||
    afterState.selectedButtons.join("|") !== beforeState.selectedButtons.join("|") ||
    afterState.headings.join("|") !== beforeState.headings.join("|")
  );
}

function drain(values) {
  const drained = values.splice(0, values.length);
  return drained;
}

function drainIssues(values) {
  const drained = drain(values);
  const counts = new Map();

  for (const value of drained) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([message, count]) => ({
    message,
    count,
  }));
}

function firstLine(value) {
  return String(value).split("\n")[0].slice(0, 500);
}

function renderMarkdown(summary) {
  const lines = [
    "# Admin Button Click Audit Raw Summary",
    "",
    `- Generated: ${summary.generatedAt}`,
    `- Base URL: ${summary.baseURL}`,
    `- Routes: ${summary.routeCount}`,
    `- Click attempts: ${summary.totalClicks}`,
    `- Click/replay errors: ${summary.totalErrors}`,
    `- Max depth: ${summary.maxDepth}`,
    `- Max sequences per route: ${summary.maxSequencesPerRoute}`,
    "",
    "| Screen | Route | Clicks | Errors | Limit |",
    "| --- | --- | ---: | ---: | --- |",
  ];

  for (const result of summary.routes) {
    lines.push(
      `| ${result.route.screenId} ${result.route.title} | \`${result.route.href}\` | ${result.clicks.length} | ${result.errors.length} | ${result.clickLimitReached ? "yes" : "no"} |`,
    );
  }

  lines.push("", "## Errors", "");
  const errored = summary.routes.filter((result) => result.errors.length > 0);
  if (errored.length === 0) {
    lines.push("No click/replay errors were recorded.");
  } else {
    for (const result of errored) {
      lines.push(`### ${result.route.screenId} ${result.route.href}`);
      for (const error of result.errors.slice(0, 20)) {
        lines.push(`- ${error.path || "(route load)"}: ${error.error.split("\n")[0]}`);
      }
      if (result.errors.length > 20) {
        lines.push(`- ... ${result.errors.length - 20} more`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}
