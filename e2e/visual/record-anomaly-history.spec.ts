import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`REC-02 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/records/anomaly-history",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("record-anomaly-history-screen")).toBeVisible();
    await expect(page.getByTestId("record-history-empty-detail")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "REC-02",
      viewport,
    });
  });
}

test(`REC-02 selected-history ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/records/anomaly-history",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("record-anomaly-history-first-detail").click();
  await expect(
    page.getByTestId("record-anomaly-history-selected-detail"),
  ).toBeVisible();
  await expect(
    page.getByTestId("record-anomaly-history-first-detail"),
  ).toHaveCSS("background-color", "rgb(35, 168, 102)");
  await expect(page.getByRole("heading", { name: "처리 전" })).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "REC-02",
    state: "selected-history",
    viewport: desktop,
  });
});
