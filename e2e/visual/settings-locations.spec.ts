import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SET-02 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/settings/locations",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);

    const screen = page.getByTestId("settings-locations-screen");
    await expect(screen).toBeVisible();
    await expect(screen).toContainText("근무지 추가");
    await expect(screen).toContainText("대치 A 학원");
    await expect(screen).toContainText("서울 강남구");
    await expect(screen).toContainText("100m");
    await expect(screen).toContainText("삭제");

    await captureActualScreenshot({
      page,
      screenId: "SET-02",
      viewport,
    });
  });
}

test(`SET-02 location-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/settings/locations",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("settings-locations-add-trigger").click();

  const dialog = page.getByTestId("settings-location-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("근무지 추가");
  await expect(dialog).toContainText("출퇴근 허용 반경");
  await expect(page.getByTestId("settings-location-map")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "SET-02",
    state: "location-dialog",
    viewport: desktop,
  });
});
