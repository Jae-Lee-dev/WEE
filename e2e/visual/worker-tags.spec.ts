import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`WKR-06 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/workers/tags", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "근무자 태그 관리" }),
    ).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "WKR-06",
      viewport,
    });
  });
}

test(`WKR-06 edit-tag-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers/tags", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-tags-edit-trigger-first").click();
  await expect(page.getByTestId("worker-tags-edit-dialog")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-06",
    state: "edit-tag-dialog",
    viewport: desktop,
  });
});

test("WKR-06 edit dialog uses clicked tag", async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers/tags", viewport: desktop });

  await page.getByRole("button", { name: "수정" }).nth(1).click();
  const dialog = page.getByTestId("worker-tags-edit-dialog");
  await expect(dialog.getByLabel("태그명")).toHaveValue("신입");
  await expect(dialog.getByText("3명")).toBeVisible();
});
