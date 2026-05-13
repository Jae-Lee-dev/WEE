import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
} from "./helpers";

const routePath = "/workers/worker_kim_seoyeon/payroll";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`WKR-05 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: routePath, viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("worker-detail-payroll-screen")).toBeVisible();
    await expect(page.getByRole("heading", { name: "급여 요약" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "최근 확정 급여명세" }),
    ).toBeVisible();
    await expect(page.getByText("₩ 586,002")).toBeVisible();
    await expect(page.getByTestId("worker-detail-payroll-issues")).toContainText(
      "처리 대기 건",
    );

    await captureActualScreenshot({
      page,
      screenId: "WKR-05",
      viewport,
    });
  });
}
