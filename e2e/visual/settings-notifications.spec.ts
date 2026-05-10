import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SET-04 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/settings/notifications",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);

    await expect(
      page.getByTestId("settings-notifications-screen"),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "항목" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "웹" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "카카오" })).toBeVisible();
    await expect(page.getByText("추가근무 신청")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "SET-04",
      viewport,
    });
  });
}
