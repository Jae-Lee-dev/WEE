import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
} from "./helpers";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`REC-04 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/records/attendance", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("record-attendance-screen")).toBeVisible();
    await expect(
      page.getByRole("table", { name: "출퇴근 이력 표" }),
    ).toBeVisible();
    await expect(page.getByText("전체 로그 (20)")).toBeVisible();
    await expect(page.getByText("이상 표시 (4)")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "REC-04",
      viewport,
    });
  });
}
