import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`PAY-02 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/payroll/statements",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);

    const screen = page.getByTestId("payroll-statements-screen");
    await expect(screen).toBeVisible();
    await expect(page.getByTestId("payroll-statements-month-select")).toHaveText(
      "2026.04",
    );
    await expect(screen).toContainText("전체 명세");
    await expect(screen).toContainText("처리 중");
    await expect(screen).toContainText("지급 완료");
    await expect(page.getByTestId("payroll-statements-table")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "PAY-02",
      viewport,
    });
  });
}

test(`PAY-02 statement-detail ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/payroll/statements",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("payroll-statements-first-detail").click();

  await expect(page.getByTestId("payroll-statements-detail")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "급여 명세 목록" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "2026년 4월 명세 상세" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "계산 기준" })).toBeVisible();
  await expect(page.getByText("근무시간 올림")).toBeVisible();
  await expect(page.getByText("6분 단위")).toBeVisible();
  await expect(page.getByText("급여 올림")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "PAY-02",
    state: "statement-detail",
    viewport: desktop,
  });
});
