import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

const filterStates = [
  { state: "filter-affiliation", testId: "dashboard-filter-affiliation" },
  { state: "filter-schedule", testId: "dashboard-filter-schedule" },
  { state: "filter-overtime", testId: "dashboard-filter-overtime" },
  { state: "filter-correction", testId: "dashboard-filter-correction" },
  { state: "filter-anomaly", testId: "dashboard-filter-anomaly" },
  { state: "filter-payroll", testId: "dashboard-filter-payroll" },
] as const;

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`DSH-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/dashboard", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "확인 필요" }),
    ).toBeVisible();
    await expect(page.getByText("24건")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "DSH-01",
      viewport,
    });
  });
}

test(`SHELL-01 default ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/dashboard", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("navigation", { name: "관리자 메뉴" })).toBeVisible();
  await expect(page.getByText("Wee")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "SHELL-01",
    viewport: desktop,
  });
});

for (const { state, testId } of filterStates) {
  test(`DSH-01 ${state} ${desktop}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/dashboard", viewport: desktop });
    await page.evaluate(() => document.fonts.ready);
    await page.getByTestId(testId).click();
    await expect(page.getByTestId(testId)).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await captureActualScreenshot({
      page,
      screenId: "DSH-01",
      state,
      viewport: desktop,
    });
  });
}

test(`DSH-01 filter-dropdown ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/dashboard", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("dashboard-filter-affiliation").click();
  await page.getByTestId("dashboard-filter-trigger").click();
  await expect(page.getByTestId("dashboard-filter-menu")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DSH-01",
    state: "filter-dropdown",
    viewport: desktop,
  });
});
