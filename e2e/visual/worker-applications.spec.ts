import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";
const segmentAnimationMs = 350;

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`WKR-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/workers/applications", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { name: "신청 목록" })).toBeVisible();
    await expect(
      page.getByText("신청 건을 선택하면").first(),
    ).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "WKR-01",
      viewport,
    });
  });
}

test(`WKR-01 selected-application ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-application-first-select").click();
  await expect(page.getByRole("heading", { name: "소속 승인" })).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-01",
    state: "selected-application",
    viewport: desktop,
  });
});

test(`WKR-01 tag-search ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-application-first-select").click();
  await page.getByTestId("worker-application-tag-search-trigger").click();
  await expect(page.getByTestId("worker-application-tag-menu")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-01",
    state: "tag-search",
    viewport: desktop,
  });
});

test(`WKR-01 tag-added ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-application-first-select").click();
  await page.getByTestId("worker-application-tag-search-trigger").click();
  await expect(page.getByTestId("worker-application-tag-menu")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-01",
    state: "tag-added",
    viewport: desktop,
  });
});

test(`WKR-01 monthly-pay-selected ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-application-first-select").click();
  await page.getByTestId("worker-application-tag-search-trigger").click();
  await page.getByTestId("worker-application-tag-option-first").click();
  await page.getByTestId("worker-application-pay-monthly").click();
  await expect(page.getByTestId("worker-application-pay-monthly")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.waitForTimeout(segmentAnimationMs);

  await captureActualScreenshot({
    page,
    screenId: "WKR-01",
    state: "monthly-pay-selected",
    viewport: desktop,
  });
});
