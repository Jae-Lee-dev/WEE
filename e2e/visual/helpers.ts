import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";

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
