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
    const timelineHeaders = page
      .getByRole("grid", { name: "주간 근무 시간표" })
      .getByRole("columnheader");
    await expect(timelineHeaders).toHaveCount(19);
    await expect(timelineHeaders.first()).toContainText("08");
    await expect(timelineHeaders.nth(15)).toContainText("23");
    await expect(timelineHeaders.nth(16)).toContainText("익일");
    await expect(timelineHeaders.nth(16)).toContainText("00");
    await expect(timelineHeaders.nth(17)).not.toContainText("익일");
    await expect(timelineHeaders.last()).not.toContainText("익일");
    await expect(timelineHeaders.last()).toContainText("02");
    const nextDayBoundaryMarkers = page
      .getByRole("grid", { name: "주간 근무 시간표" })
      .getByTestId("timeline-next-day-boundary");
    await expect(nextDayBoundaryMarkers).toHaveCount(8);
    await expect(nextDayBoundaryMarkers.first()).toHaveCSS("width", "3px");
    await expect(nextDayBoundaryMarkers.first()).toHaveCSS(
      "background-image",
      /linear-gradient/,
    );
    await expect(
      page
        .getByRole("grid", { name: "주간 근무 시간표" })
        .getByRole("rowheader", { name: "월" }),
    ).toHaveCSS("border-bottom-color", "rgb(229, 231, 235)");

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

test("SCH-02 filters timeline blocks and worker context", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/timeline",
    viewport: desktop,
  });

  await page.getByTestId("schedule-timeline-location-filter").click();
  await page
    .getByTestId("schedule-timeline-location-menu")
    .getByRole("option", { name: "송파 E학원" })
    .click();

  const grid = page.getByRole("grid", { name: "주간 근무 시간표" });
  await expect(page.getByTestId("schedule-timeline-location-filter"))
    .toContainText("송파 E학원");
  await expect(grid).toContainText("국어 E반");
  await expect(grid).not.toContainText("화학 G반");

  await page.getByTestId("schedule-timeline-worker-select").click();
  const detail = page.getByTestId("schedule-timeline-worker-detail-scroll");
  await expect(detail).toContainText("송파 E학원");
  await expect(detail).not.toContainText("잠실 C학원");
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
