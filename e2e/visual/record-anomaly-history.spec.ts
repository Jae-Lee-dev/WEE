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
  const firstRow = page.getByTestId("record-anomaly-history-first-detail");

  await expect(page.getByText("상세보기")).toHaveCount(0);
  await firstRow.click();
  await expect(
    page.getByTestId("record-anomaly-history-selected-detail"),
  ).toBeVisible();
  await expect(firstRow).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "처리 전" })).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "REC-02",
    state: "selected-history",
    viewport: desktop,
  });
});

test("REC-02 clicking focused history row clears detail focus", async ({
  page,
}) => {
  await prepareVisualPage({
    page,
    path: "/records/anomaly-history",
    viewport: desktop,
  });

  const firstRow = page.getByTestId("record-anomaly-history-first-detail");

  await firstRow.click();
  await expect(firstRow).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByTestId("record-anomaly-history-selected-detail"),
  ).toBeVisible();

  await firstRow.click();
  await expect(firstRow).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("record-history-empty-detail")).toBeVisible();
});
