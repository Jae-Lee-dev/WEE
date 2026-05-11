import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  expectTimelineFrameOwnsStickyScroll,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";
const laptop: VisualViewportName = "laptop-1366";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SCH-02 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/schedule/timeline", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByText("선택된 조교가 없습니다."),
    ).toBeVisible();
    await expect(
      page.getByRole("grid", { name: "주간 근무 시간표" }),
    ).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "SCH-02",
      viewport,
    });
  });
}

test(`SCH-02 dropdown-open ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/timeline",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("schedule-timeline-location-filter").click();
  await expect(page.getByTestId("schedule-timeline-location-menu")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "SCH-02",
    state: "dropdown-open",
    viewport: desktop,
  });
});

test(`SCH-02 worker-selected ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/timeline",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("schedule-timeline-worker-select").click();
  await expect(
    page.getByRole("heading", { name: "김서연" }),
  ).toBeVisible();
  await expect(page.getByTestId("schedule-timeline-worker-detail-scroll"))
    .toHaveCSS("overflow-y", "auto");

  await captureActualScreenshot({
    page,
    screenId: "SCH-02",
    state: "worker-selected",
    viewport: desktop,
  });
});

test(`SCH-02 timeline owns sticky scroll ${laptop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/timeline",
    viewport: laptop,
  });
  await page.evaluate(() => document.fonts.ready);
  await expectTimelineFrameOwnsStickyScroll({
    frameTestId: "schedule-timeline-grid",
    page,
  });
});

test("SCH-02 selected worker action buttons link to worker detail", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/timeline",
    viewport: desktop,
  });
  await page.getByTestId("schedule-timeline-worker-select").click();

  await expect(
    page.getByRole("link", { name: "조교 시간표 편집" }),
  ).toHaveAttribute("href", "/workers/worker_kim_seoyeon/schedule");

  await page.getByRole("link", { name: "조교 상세 보기" }).click();
  await expect(page).toHaveURL(/\/workers\/worker_kim_seoyeon$/);
  await expect(
    page.getByRole("heading", { name: "인적사항 · 계좌" }),
  ).toBeVisible();
});
