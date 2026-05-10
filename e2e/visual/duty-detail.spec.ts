import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const routePath = "/schedule/duties/duty_english_c";
const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`DUT-02 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: routePath, viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("duty-detail-panel")).toContainText("영어 C반");
    await expect(page.getByTestId("duty-detail-panel")).toContainText(
      "할당된 조교 (3명)",
    );

    await captureActualScreenshot({
      page,
      screenId: "DUT-02",
      viewport,
    });
  });
}

test(`DUT-02 edit-basic-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "기본 정보 수정" }).click();
  await expect(page.getByTestId("duty-list-edit-basic-dialog")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DUT-02",
    state: "edit-basic-dialog",
    viewport: desktop,
  });
});

test(`DUT-02 edit-time-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "시간 조정" }).click();
  await expect(page.getByTestId("duty-list-edit-time-dialog")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DUT-02",
    state: "edit-time-dialog",
    viewport: desktop,
  });
});
