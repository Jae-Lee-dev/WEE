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
    await expect(page.getByText("17/20명")).toBeVisible();

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

test(`WKR-02 pagination ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByText("1-10 / 15명")).toBeVisible();
  await page.getByRole("button", { name: "다음 페이지" }).click();
  await expect(page.getByText("11-15 / 15명")).toBeVisible();
  await expect(page.getByText("김도윤")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-02",
    state: "pagination",
    viewport: desktop,
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
