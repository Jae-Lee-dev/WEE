import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`REC-05 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/records/overtime-history",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("record-overtime-history-screen")).toBeVisible();
    await expect(page.getByTestId("record-history-empty-detail")).toBeVisible();
    await expect(page.getByText("총 신청")).toBeVisible();
    await expect(page.getByText("신청됨")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "REC-05",
      viewport,
    });
  });
}

test(`REC-05 selected-overtime ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/records/overtime-history",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("record-overtime-history-first-detail").click();

  await expect(
    page.getByTestId("record-overtime-history-selected-detail"),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "신청 내용" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "처리 결과" })).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "REC-05",
    state: "selected-overtime",
    viewport: desktop,
  });
});
