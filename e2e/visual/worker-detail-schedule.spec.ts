import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const routePath = "/workers/worker_kim_seoyeon/schedule";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`WKR-04 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: routePath, viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("worker-detail-schedule-screen")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "시간표 변경 이력" }),
    ).toBeVisible();
    await expect(page.getByText("영어 C반").first()).toBeVisible();
    await expect(page.getByTestId("worker-detail-recent-work-records")).toContainText(
      "근무기록으로 이동",
    );

    await captureActualScreenshot({
      page,
      screenId: "WKR-04",
      viewport,
    });
  });
}

test("WKR-04 full-page desktop-1920", async ({ page }) => {
  const viewport: VisualViewportName = "desktop-1920";

  await prepareVisualPage({ page, path: routePath, viewport });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("worker-detail-recent-work-records")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-04",
    state: "full-page",
    viewport,
    fullPage: true,
  });
});

test("WKR-04 default desktop-1920-tall", async ({ page }) => {
  const viewport: VisualViewportName = "desktop-1920-tall";

  await prepareVisualPage({ page, path: routePath, viewport });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("worker-detail-recent-work-records")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-04",
    viewport,
  });
});
