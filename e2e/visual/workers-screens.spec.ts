import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";
const filterTabAnimationMs = 350;

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`WKR-02 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/workers", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "조교 목록" }),
    ).toBeVisible();
    await expect(
      page.getByText("마지막 업데이트: 2026.05.13 10:30"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "조교 목록 새로고침" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /소속 신청/ }).getByText("6"),
    ).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "WKR-02",
      viewport,
    });
  });
}

test(`WKR-02 active-filter ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("tab", { name: "전체 20" }).click();
  await expect(page.getByRole("tab", { name: "전체 20" })).toHaveAttribute(
    "data-state",
    "active",
  );
  await page.waitForTimeout(filterTabAnimationMs);

  await captureActualScreenshot({
    page,
    screenId: "WKR-02",
    state: "active-filter",
    viewport: desktop,
  });
});

test(`WKR-02 inactive-filter ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("tab", { name: "비활성 3" }).click();
  await expect(
    page.getByRole("tab", { name: "비활성 3" }),
  ).toHaveAttribute("data-state", "active");
  await page.waitForTimeout(filterTabAnimationMs);

  await captureActualScreenshot({
    page,
    screenId: "WKR-02",
    state: "inactive-filter",
    viewport: desktop,
  });
});

test(`WKR-02 filtering ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("workers-tag-filter-trigger").click();
  await expect(page.getByTestId("workers-tag-filter-menu")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-02",
    state: "filtering",
    viewport: desktop,
  });
});

test("WKR-02 search and tag filters rows", async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers", viewport: desktop });

  const searchInput = page.getByLabel("조교 이름 검색");
  await expect(searchInput).toBeEditable();
  await searchInput.fill("박정훈");
  await expect(page.getByText("박정훈")).toBeVisible();
  await expect(page.getByText("김서연")).toHaveCount(0);

  await searchInput.fill("");
  await page.getByTestId("workers-tag-filter-trigger").click();
  await page
    .getByTestId("workers-tag-filter-menu")
    .getByRole("option", { name: "신입" })
    .click();

  await expect(page.getByTestId("workers-tag-filter-trigger")).toContainText(
    "신입",
  );
  await expect(page.getByText("박정훈")).toBeVisible();
  await expect(page.getByText("김서연")).toHaveCount(0);
});

test(`WKR-02 pagination ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByText("1-15 / 15명")).toBeVisible();
  const pageSizeSelect = page.getByRole("combobox", {
    name: "페이지당 항목 수",
  });
  await expect(pageSizeSelect).toContainText("20개씩");
  await pageSizeSelect.click();
  await expect(page.getByRole("option", { name: "20개씩" })).toBeVisible();
  await expect(page.getByRole("option", { name: "50개씩" })).toBeVisible();
  await expect(page.getByRole("option", { name: "100개씩" })).toBeVisible();
  await expect(page.getByRole("option", { name: "500개씩" })).toBeVisible();
  await page.getByRole("option", { name: "50개씩" }).click();
  await expect(pageSizeSelect).toContainText("50개씩");
  await expect(page.getByText("1-15 / 15명")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-02",
    state: "pagination",
    viewport: desktop,
  });
});

test(`WKR-02 list frame owns scroll ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);

  const metrics = await page.evaluate(() => {
    const frame = document.querySelector('[data-testid="workers-list-frame"]');
    const filterToolbar = document.querySelector(
      '[data-testid="workers-filter-toolbar"]',
    );
    const tableScroll = document.querySelector(
      '[data-testid="workers-table-scroll"]',
    );
    const pagination = document.querySelector(
      'nav[aria-label="페이지네이션"]',
    );

    if (!frame || !filterToolbar || !tableScroll || !pagination) {
      return null;
    }

    const frameStyle = window.getComputedStyle(frame);
    const filterToolbarStyle = window.getComputedStyle(filterToolbar);
    const tableScrollStyle = window.getComputedStyle(tableScroll);
    const paginationStyle = window.getComputedStyle(pagination);

    return {
      filterToolbarInFrame: frame.contains(filterToolbar),
      filterToolbarPosition: filterToolbarStyle.position,
      frameDirection: frameStyle.flexDirection,
      frameDisplay: frameStyle.display,
      paginationShrink: paginationStyle.flexShrink,
      tableScrollOverflowY: tableScrollStyle.overflowY,
    };
  });

  expect(metrics).toEqual({
    filterToolbarInFrame: false,
    filterToolbarPosition: "static",
    frameDirection: "column",
    frameDisplay: "flex",
    paginationShrink: "0",
    tableScrollOverflowY: "auto",
  });
});

test("WKR-02 opens worker detail from linked row", async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers", viewport: desktop });
  await page.getByRole("link", { name: "김서연 조교 상세 보기" }).click();

  await expect(page).toHaveURL(/\/workers\/worker_kim_seoyeon$/);
  await expect(
    page.getByRole("heading", { name: "인적사항 · 계좌" }),
  ).toBeVisible();
});
