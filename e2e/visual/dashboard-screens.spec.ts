import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "playwright/test";
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
    await expect
      .poll(async () =>
        page.getByTestId("dashboard-inbox-table-scroll").evaluate((element) =>
          element.scrollWidth <= element.clientWidth + 1,
        ),
      )
      .toBe(true);

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
    await expect(page.getByRole("heading", { name: "급여 상세" })).toBeVisible();
    await expect(page.getByTestId("dashboard-worker-payroll-detail")).toContainText(
      "일반근무",
    );
    await expect(page.getByTestId("dashboard-worker-payroll-detail")).toContainText(
      "추가근무",
    );
    await expect(page.getByTestId("dashboard-worker-payroll-detail")).toContainText(
      "보류·미처리 1건",
    );
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
  await selectOption(page, "dashboard-location-select", "잠실 C학원");
  await expect(page.getByText("240h")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DSH-02",
    state: "location-jamsil",
    viewport: desktop,
  });
});

test("DSH-02 location export includes objective attendance fields", async ({
  page,
}) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/locations",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "필터 기준 엑셀 내보내기" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(download.suggestedFilename()).toBe(
    "wee-location-dashboard-daechi-2026-04.csv",
  );
  expect(downloadPath).not.toBeNull();

  const csv = (await readFile(downloadPath ?? "", "utf8")).replace(/^\uFEFF/, "");
  const [header = "", firstRow = ""] = csv.split("\n");

  expect(header).toBe(
    [
      "조교",
      "근무지",
      "집계 기간",
      "근무시간",
      "근태 이슈",
      "지각",
      "위치이상",
      "결근",
      "이상 비율",
    ]
      .map((cell) => `"${cell}"`)
      .join(","),
  );
  expect(firstRow).toBe(
    [
      "김서연",
      "대치 A학원",
      "2026년 4월",
      "48h",
      "2건",
      "1회",
      "1건",
      "0건",
      "4.2%",
    ]
      .map((cell) => `"${cell}"`)
      .join(","),
  );
});

test(`DSH-03 search-worker ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/workers",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("dashboard-worker-search").fill("최민준");
  await expect(page.getByText("조교 목록")).toHaveCount(0);
  await expect(page.getByText("조교 목록 (1/6명)")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-worker-option")).toHaveCount(1);
  await expect(page.getByText("재확정 필요")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DSH-03",
    state: "search-worker",
    viewport: desktop,
  });
});

test(`DSH-03 search-worker-tag ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/workers",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("dashboard-worker-search").fill("과학");
  await expect(page.getByText("조교 목록")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-worker-tag-select")).toHaveCount(0);
  await expect(page.getByTestId("dashboard-worker-option")).toHaveCount(2);

  await captureActualScreenshot({
    page,
    screenId: "DSH-03",
    state: "search-worker-tag",
    viewport: desktop,
  });
});

test("DSH-03 weekly trend uses Sunday to Saturday order", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/workers",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await selectOption(page, "dashboard-worker-period-select", "최근 1주");

  const labels = await page
    .getByRole("region", { name: "근무시간 추이" })
    .getByRole("listitem")
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute("aria-label")?.split(" ")[0] ?? ""),
    );

  expect(labels).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
});

test("DSH-03 worker export includes work hours and payroll detail", async ({
  page,
}) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/workers",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "선택 기간 엑셀 내보내기" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(download.suggestedFilename()).toBe("wee-worker-dashboard-month.csv");
  expect(downloadPath).not.toBeNull();

  const csv = (await readFile(downloadPath ?? "", "utf8")).replace(/^\uFEFF/, "");
  const [header = "", firstRow = ""] = csv.split("\n");

  expect(header).toBe(
    [
      "조교",
      "집계 기간",
      "근무시간",
      "예상 급여",
      "일반근무",
      "추가근무",
      "보너스",
      "추가근무 미처리",
      "이상 플래그",
      "지각률",
    ]
      .map((cell) => `"${cell}"`)
      .join(","),
  );
  expect(header).not.toContain("태그");
  expect(firstRow).toBe(
    [
      "김서연",
      "최근 1개월",
      "48h",
      "552,000원",
      "492,000원",
      "35,000원",
      "25,000원",
      "1건",
      "1건",
      "4.2%",
    ]
      .map((cell) => `"${cell}"`)
      .join(","),
  );
});

test("DSH-03 detail panel owns vertical scroll", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/workers",
    viewport: "laptop-1366",
  });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("dashboard-worker-detail-scroll")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="admin-shell-content-scroll"]');
    const detail = document.querySelector('[data-testid="dashboard-worker-detail-scroll"]');
    const search = document.querySelector('[data-testid="dashboard-worker-search"]');

    if (
      !(shell instanceof HTMLElement) ||
      !(detail instanceof HTMLElement) ||
      !(search instanceof HTMLElement)
    ) {
      throw new Error("Dashboard worker scroll measurement target not found");
    }

    const searchTopBefore = search.getBoundingClientRect().top;
    detail.scrollTop = 160;
    const searchTopAfter = search.getBoundingClientRect().top;

    return {
      detailOverflowY: detail.scrollHeight - detail.clientHeight,
      detailScrollTop: detail.scrollTop,
      searchTopDelta: searchTopAfter - searchTopBefore,
      shellOverflowY: shell.scrollHeight - shell.clientHeight,
    };
  });

  expect(metrics.shellOverflowY).toBeLessThanOrEqual(1);
  expect(metrics.detailOverflowY).toBeGreaterThan(0);
  expect(metrics.detailScrollTop).toBeGreaterThan(0);
  expect(Math.abs(metrics.searchTopDelta)).toBeLessThanOrEqual(1);
});

test(`DSH-04 analysis-last-month ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/dashboard/ai-monitoring",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await selectOption(page, "dashboard-ai-period-select", "지난 달");
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

async function selectOption(
  page: Page,
  testId: string,
  label: string,
) {
  await page.getByTestId(testId).click();
  await page.getByRole("option", { name: label }).click();
}
