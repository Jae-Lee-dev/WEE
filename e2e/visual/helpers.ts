import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "playwright/test";

export type VisualViewportName =
  | "desktop-1920"
  | "desktop-1920-tall"
  | "laptop-1366";

export const visualViewports = {
  "desktop-1920": { width: 1920, height: 1080 },
  "desktop-1920-tall": { width: 1920, height: 1813 },
  "laptop-1366": { width: 1366, height: 768 },
} as const satisfies Record<VisualViewportName, { width: number; height: number }>;

export function resolveArtifactRoot() {
  return (
    process.env.ARTIFACT_ROOT ??
    path.resolve(process.cwd(), "../../../artifacts")
  );
}

export function actualScreenshotPath({
  screenId,
  state = "default",
  viewport,
}: {
  screenId: string;
  state?: string;
  viewport: VisualViewportName;
}) {
  return path.join(
    resolveArtifactRoot(),
    "actual",
    screenId,
    `${state}-${viewport}.png`,
  );
}

export async function prepareVisualPage({
  page,
  path: routePath,
  viewport,
  baseURL,
}: {
  page: Page;
  path: string;
  viewport: VisualViewportName;
  baseURL?: string;
}) {
  await page.setViewportSize(visualViewports[viewport]);
  await seedWorkspaceOnboardingState({ page, routePath });
  const url = new URL(
    routePath,
    baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
  );
  const response = await page.goto(url.toString(), { waitUntil: "networkidle" });

  if (!response?.ok()) {
    throw new Error(
      `Visual route ${url.pathname} returned ${response?.status() ?? "no response"}`,
    );
  }
}

async function seedWorkspaceOnboardingState({
  page,
  routePath,
}: {
  page: Page;
  routePath: string;
}) {
  const status = getPreviewWorkspaceStatus(routePath);

  if (!status) {
    return;
  }

  await page.addInitScript((workspaceStatus) => {
    const activeUserKey = "wee.admin.activeUserId.v1";
    const activeWorkspaceKey = "wee.admin.activeWorkspaceId.v1";
    const statusKeyPrefix = "wee.admin.workspaceStatus.v1";
    const visualUserId = "visual-admin";
    const visualWorkspaceId = "workspace_visual";

    window.localStorage.setItem(activeUserKey, visualUserId);
    window.localStorage.setItem(activeWorkspaceKey, visualWorkspaceId);
    window.localStorage.setItem(
      `${statusKeyPrefix}.${visualUserId}`,
      workspaceStatus,
    );
  }, status);
}

function getPreviewWorkspaceStatus(routePath: string) {
  if (routePath === "/onboarding/workspace") {
    return "missing";
  }

  if (routePath === "/onboarding/setup") {
    return "workspace-created";
  }

  if (isAdminRoute(routePath)) {
    return "setup-complete";
  }

  return null;
}

function isAdminRoute(routePath: string) {
  return (
    routePath.startsWith("/dashboard") ||
    routePath.startsWith("/workers") ||
    routePath.startsWith("/schedule") ||
    routePath.startsWith("/records") ||
    routePath.startsWith("/payroll") ||
    routePath.startsWith("/handover") ||
    routePath.startsWith("/settings")
  );
}

export async function captureActualScreenshot({
  page,
  screenId,
  state = "default",
  viewport,
  fullPage = false,
}: {
  page: Page;
  screenId: string;
  state?: string;
  viewport: VisualViewportName;
  fullPage?: boolean;
}) {
  const screenshotPath = actualScreenshotPath({ screenId, state, viewport });
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage });
  return screenshotPath;
}

export async function expectTimelineFrameOwnsStickyScroll({
  frameTestId,
  page,
}: {
  frameTestId: string;
  page: Page;
}) {
  const metrics = await page.evaluate((testId) => {
    const frame = document.querySelector(`[data-testid="${testId}"]`);
    if (!(frame instanceof HTMLElement)) {
      throw new Error(`Timeline frame not found: ${testId}`);
    }

    const grid = frame.querySelector('[role="grid"]');
    const header = grid
      ?.querySelector('[role="columnheader"]')
      ?.parentElement;
    const rowHeader = grid?.querySelector('[role="rowheader"]');
    const shellScroller = Array.from(document.querySelectorAll("div")).find(
      (element) =>
        element.className === "h-full overflow-y-auto overscroll-contain",
    );

    if (
      !(header instanceof HTMLElement) ||
      !(rowHeader instanceof HTMLElement) ||
      !shellScroller
    ) {
      throw new Error("Timeline sticky measurement target not found");
    }

    const beforeHeaderRect = header.getBoundingClientRect();
    const beforeRowHeaderRect = rowHeader.getBoundingClientRect();
    frame.scrollTop = 120;
    frame.scrollLeft = 120;
    const afterHeaderRect = header.getBoundingClientRect();
    const afterRowHeaderRect = rowHeader.getBoundingClientRect();
    const result = {
      frameScrollLeft: frame.scrollLeft,
      frameScrollTop: frame.scrollTop,
      headerLeftDelta: afterHeaderRect.left - beforeHeaderRect.left,
      headerTopDelta: afterHeaderRect.top - beforeHeaderRect.top,
      rowHeaderLeftDelta: afterRowHeaderRect.left - beforeRowHeaderRect.left,
      rowHeaderTopDelta: afterRowHeaderRect.top - beforeRowHeaderRect.top,
      shellOverflowY: shellScroller.scrollHeight - shellScroller.clientHeight,
    };

    frame.scrollTop = 0;
    frame.scrollLeft = 0;

    return result;
  }, frameTestId);

  expect(metrics.shellOverflowY).toBeLessThanOrEqual(1);
  expect(metrics.frameScrollLeft).toBeGreaterThan(0);
  expect(metrics.frameScrollTop).toBeGreaterThan(0);
  expect(Math.abs(metrics.headerTopDelta)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.rowHeaderLeftDelta)).toBeLessThanOrEqual(1);
  expect(metrics.headerLeftDelta).toBeLessThan(0);
  expect(metrics.rowHeaderTopDelta).toBeLessThan(0);
}
