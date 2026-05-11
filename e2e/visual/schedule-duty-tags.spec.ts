import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`DUT-03 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/schedule/duty-tags", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "근무 태그 관리" }),
    ).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "DUT-03",
      viewport,
    });
  });
}

test(`DUT-03 edit-tag-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/duty-tags",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("duty-tags-edit-trigger-first").click();
  await expect(page.getByTestId("duty-tags-edit-dialog")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DUT-03",
    state: "edit-tag-dialog",
    viewport: desktop,
  });
});
