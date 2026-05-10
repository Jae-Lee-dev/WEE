import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`PAY-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/payroll", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("payroll-calculation-default")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "조교 목록" }),
    ).toBeVisible();
    await expect(page.getByText("2026.04")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "PAY-01",
      viewport,
    });
  });
}

test(`PAY-01 detail ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("payroll-calculation-first-detail").click();
  await expect(
    page.getByTestId("payroll-calculation-state-detail"),
  ).toBeVisible();
  await expect(page.getByText("급여 신청 목록")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "급여 확정 (미처리 항목 4/4)" }),
  ).toBeDisabled();

  await captureActualScreenshot({
    page,
    screenId: "PAY-01",
    state: "detail",
    viewport: desktop,
    fullPage: true,
  });
});

test(`PAY-01 bonus-add ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("payroll-calculation-first-detail").click();
  await page.getByTestId("payroll-calculation-add-adjustment").click();
  await expect(
    page.getByTestId("payroll-calculation-state-bonus-add"),
  ).toBeVisible();
  await expect(
    page.getByTestId("payroll-calculation-bonus-add-form"),
  ).toBeVisible();
  await expect(page.getByText("예) 야근수당")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "PAY-01",
    state: "bonus-add",
    viewport: desktop,
    fullPage: true,
  });
});

test(`PAY-01 no-open-items ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("payroll-calculation-first-detail").click();
  await page.getByTestId("payroll-calculation-show-no-open-items").click();
  await expect(
    page.getByTestId("payroll-calculation-state-no-open-items"),
  ).toBeVisible();
  await expect(page.getByText("퇴근시간 변경")).toBeVisible();
  await expect(page.getByRole("button", { name: "급여 확정" })).toBeEnabled();

  await captureActualScreenshot({
    page,
    screenId: "PAY-01",
    state: "no-open-items",
    viewport: desktop,
    fullPage: true,
  });
});
