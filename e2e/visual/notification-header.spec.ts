import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SHELL-NOTIFICATION open-panel ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/dashboard", viewport });
    await page.evaluate(() => document.fonts.ready);

    await page.getByTestId("header-notification-trigger").click();
    await expect(page.getByTestId("header-notification-trigger")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(page.getByTestId("header-notification-panel")).toBeVisible();
    await expect(
      page
        .getByTestId("header-notification-panel")
        .getByRole("heading", { name: "확인 필요" }),
    ).toBeVisible();
    await expect(page.getByText("김서연 · 위치 이상 · 수학 A반")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "SHELL-NOTIFICATION",
      state: "open-panel",
      viewport,
    });
  });
}
