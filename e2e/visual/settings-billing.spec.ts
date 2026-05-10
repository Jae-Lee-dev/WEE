import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SET-05 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/settings/billing", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("settings-billing-screen")).toBeVisible();
    await expect(page.getByText("Starter")).toBeVisible();
    await expect(page.getByText("Standard")).toBeVisible();
    await expect(page.getByText("19,000원")).toBeVisible();
    await expect(page.getByText("구독 해지")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "SET-05",
      viewport,
    });
  });
}
