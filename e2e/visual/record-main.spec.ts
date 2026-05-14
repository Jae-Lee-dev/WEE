import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  expectTimelineFrameOwnsStickyScroll,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`REC-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/records", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("record-main-screen")).toBeVisible();
    const breadcrumbs = page.getByTestId("admin-header-breadcrumbs");
    await expect(breadcrumbs.getByRole("link", { name: "근무 기록" }))
      .toHaveAttribute("href", "/records");
    await expect(
      breadcrumbs.getByRole("heading", { name: "근무 타임라인" }),
    ).toBeVisible();
    await expect(page.getByText("05.03 (일) ~ 05.09 (토)")).toBeVisible();
    const grid = page.getByRole("grid", { name: "주간 근무기록" });
    await expect(grid).toBeVisible();
    const timelineHeaders = grid.getByRole("columnheader");
    await expect(timelineHeaders).toHaveCount(19);
    await expect(timelineHeaders.first()).toContainText("08");
    await expect(timelineHeaders.nth(15)).toContainText("23");
    await expect(timelineHeaders.nth(16)).toContainText("익일");
    await expect(timelineHeaders.nth(16)).toContainText("00");
    await expect(timelineHeaders.nth(17)).not.toContainText("익일");
    await expect(timelineHeaders.last()).not.toContainText("익일");
    await expect(timelineHeaders.last()).toContainText("02");
    const nextDayBoundaryMarkers = grid.getByTestId("timeline-next-day-boundary");
    await expect(nextDayBoundaryMarkers).toHaveCount(8);
    await expect(grid.getByRole("rowheader", { name: "일" })).toHaveClass(
      /text-red-500/,
    );
    await expect(grid.getByRole("rowheader", { name: "토" })).toHaveClass(
      /text-blue-500/,
    );

    if (viewport === "laptop-1366") {
      await expectTimelineFrameOwnsStickyScroll({
        frameTestId: "record-timeline-scroll",
        page,
      });
    }

    await captureActualScreenshot({
      page,
      screenId: "REC-01",
      viewport,
    });
  });
}

test(`REC-01 normal-selected ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/records", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("record-block-normal").click();
  await expect(page.getByText("이하은 · 영어 C반")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "REC-01",
    state: "normal-selected",
    viewport: desktop,
  });
});

test("REC-01 uses shared selects and edits selected records", async ({ page }) => {
  await prepareVisualPage({ page, path: "/records", viewport: desktop });

  await expect(page.locator("select[aria-label='조교 필터']")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "조교 필터" })).toBeVisible();

  await page.getByTestId("record-block-normal").click();
  await page.getByTestId("record-detail-action-edit").click();

  const detail = page.getByTestId("record-detail-panel");

  await detail.getByLabel("수정 사유").fill("출퇴근 시간 확인");
  await detail.getByLabel("출근 시간").fill("14:10");
  await detail.getByRole("button", { name: "보류" }).click();
  await detail.getByRole("button", { name: "확인" }).click();

  await expect(
    detail.getByText("근무기록 수정 내용을 적용했습니다."),
  ).toBeVisible();
});

test("REC-01 workerName query applies worker filter", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/records?workerName=이하은",
    viewport: desktop,
  });

  await expect(page.getByRole("combobox", { name: "조교 필터" })).toContainText(
    "이하은",
  );
  await expect(
    page.locator("[data-record-block-id='record-lee-haeun-english-c-mon']"),
  ).toBeVisible();
  await expect(
    page.locator("[data-record-block-id='record-song-hyunwoo-physics-f-mon']"),
  ).toHaveCount(0);
});

test(`REC-01 anomaly-step-1 ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/records", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("record-block-anomaly").click();
  await expect(page.getByText("송현우 · 물리 F반")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "REC-01",
    state: "anomaly-step-1",
    viewport: desktop,
  });
});

test(`REC-01 anomaly-step-2 ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/records", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("record-block-anomaly").click();
  await page.getByTestId("record-detail-action-mark-normal").click();
  await expect(
    page.getByText("이상이 없다고 판단하여 플래그를 닫습니다."),
  ).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "REC-01",
    state: "anomaly-step-2",
    viewport: desktop,
  });
});

test(`REC-01 anomaly-step-3 ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/records", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("record-block-anomaly").click();
  await page.getByTestId("record-detail-action-edit").click();
  await expect(page.getByText("수정 사유")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "REC-01",
    state: "anomaly-step-3",
    viewport: desktop,
    fullPage: true,
  });
});

test(`REC-01 anomaly-step-4 ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/records", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("record-block-anomaly").click();
  await page.getByTestId("record-detail-action-delete").click();
  await expect(
    page.getByText("해당 근무기록이 삭제되어 결근으로 처리됩니다."),
  ).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "REC-01",
    state: "anomaly-step-4",
    viewport: desktop,
  });
});
