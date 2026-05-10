import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SET-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/settings",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);

    const screen = page.getByTestId("settings-workspace-screen");
    await expect(screen).toBeVisible();
    await expect(screen).toContainText("사업장 이름");
    await expect(screen).toContainText("김쌤 수학학원");
    await expect(screen).toContainText("WEE-ABC123");
    await expect(screen).toContainText("02-1234-5678");

    await captureActualScreenshot({
      page,
      screenId: "SET-01",
      viewport,
    });
  });
}

test(`SET-01 edit-workspace-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/settings",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("settings-workspace-edit-trigger").click();

  const dialog = page.getByTestId("settings-workspace-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("사업장 정보 수정");
  await expect(dialog).toContainText("사업자등록번호");
  await expect(dialog).toContainText("저장");

  await captureActualScreenshot({
    page,
    screenId: "SET-01",
    state: "edit-workspace-dialog",
    viewport: desktop,
  });
});
