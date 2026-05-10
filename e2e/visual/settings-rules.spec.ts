import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SET-03 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/settings/rules", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("settings-rules-screen")).toBeVisible();
    await expect(page.getByText("시간 허용 오차")).toBeVisible();
    await expect(page.getByText("6분 단위")).toBeVisible();
    await expect(page.getByText("원 단위")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "SET-03",
      viewport,
    });
  });
}

test(`SET-03 rules-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/settings/rules", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("settings-rules-edit-trigger").click();

  await expect(page.getByTestId("settings-rules-dialog")).toBeVisible();
  await expect(page.getByLabel("시간 이상 허용 오차")).toHaveValue("5");
  await expect(page.getByLabel("근무 시간 올림 단위")).toHaveValue("6");
  await expect(page.getByLabel("급여 올림 단위")).toHaveValue("원 단위");

  await captureActualScreenshot({
    page,
    screenId: "SET-03",
    state: "rules-dialog",
    viewport: desktop,
  });
});
