import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

const filterStates = [
  {
    state: "filter-affiliation",
    optionId: "affiliation",
    option: "소속 신청 대기",
  },
  {
    state: "filter-schedule",
    optionId: "schedule",
    option: "시간표 승인 대기",
  },
  {
    state: "filter-overtime",
    optionId: "overtime",
    option: "추가근무 승인 대기",
  },
  {
    state: "filter-correction",
    optionId: "correction",
    option: "이의신청 처리 대기",
  },
  {
    state: "filter-anomaly",
    optionId: "anomaly",
    option: "이상 플래그 미처리",
  },
  {
    state: "filter-payroll",
    optionId: "payroll",
    option: "급여 재확정 필요",
  },
] as const;

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`DSH-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/dashboard", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "확인 필요" }),
    ).toBeVisible();
    await expect(page.getByText("24건")).toBeVisible();
    await expect(page.getByTestId("dashboard-filter-trigger")).toContainText(
      "전체 유형",
    );
    await expect(page.getByTestId("dashboard-filter-affiliation")).toHaveCount(
      0,
    );

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

for (const { state, optionId, option } of filterStates) {
  test(`DSH-01 ${state} ${desktop}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/dashboard", viewport: desktop });
    await page.evaluate(() => document.fonts.ready);
    await page.getByTestId("dashboard-filter-trigger").click();
    await page.getByTestId(`dashboard-filter-option-${optionId}`).click();
    await expect(page.getByTestId("dashboard-filter-trigger")).toContainText(
      option,
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
  await page.getByTestId("dashboard-filter-trigger").click();
  await page.getByTestId("dashboard-filter-option-affiliation").click();
  await page.getByTestId("dashboard-filter-trigger").click();
  await expect(page.getByTestId("dashboard-filter-menu")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DSH-01",
    state: "filter-dropdown",
    viewport: desktop,
  });
});

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`DSH-02 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/dashboard/locations",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "조교별 근태 현황" }),
    ).toBeVisible();
    await expect(page.getByText("312h")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "DSH-02",
      viewport,
    });
  });

  test(`DSH-03 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/dashboard/workers",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("dashboard-workers-screen")).toBeVisible();
    await expect(page.getByRole("heading", { name: "최근 명세 상태" })).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "DSH-03",
      viewport,
    });
  });

  test(`DSH-04 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/dashboard/ai-monitoring",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "AI 이상탐지 실행" }),
    ).toBeVisible();
    await expect(page.getByText("Standard 플랜")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "DSH-04",
      viewport,
    });
  });
}

test(`DSH-02 location-jamsil ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/locations",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("dashboard-location-select").selectOption("jamsil");
  await expect(page.getByText("240h")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DSH-02",
    state: "location-jamsil",
    viewport: desktop,
  });
});

test(`DSH-03 search-worker ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/workers",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("dashboard-worker-search").fill("최민준");
  await expect(page.getByText("조교 목록 (1/6명)")).toBeVisible();
  await expect(page.getByText("재확정 필요")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DSH-03",
    state: "search-worker",
    viewport: desktop,
  });
});

test(`DSH-03 tag-science ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/workers",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("dashboard-worker-tag-select").selectOption("science");
  await expect(page.getByText("조교 목록 (2/6명)")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DSH-03",
    state: "tag-science",
    viewport: desktop,
  });
});

test(`DSH-04 analysis-last-month ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/ai-monitoring",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("dashboard-ai-period-select").selectOption("last-month");
  await page.getByTestId("dashboard-ai-run-analysis").click();
  await expect(
    page.locator("div").filter({ hasText: /^지난 달$/ }).last(),
  ).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DSH-04",
    state: "analysis-last-month",
    viewport: desktop,
  });
});
