import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`LANDING-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("landing-page")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /조교 관리는 더 가볍게,\s*운영 통제는 더 정확하게\./,
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "무료로 시작하기" }).first(),
    ).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "LANDING-01",
      viewport,
    });
  });
}
