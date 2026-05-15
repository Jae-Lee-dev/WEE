import { expect, test, type Page } from "playwright/test";
import {
  captureActualScreenshot,
  expectTimelineFrameOwnsStickyScroll,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const routePath = "/schedule/duties";
const desktop: VisualViewportName = "desktop-1920";
const laptop: VisualViewportName = "laptop-1366";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`DUT-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: routePath, viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("duty-timeline-view")).toBeVisible();
    const timelineHeaders = page
      .getByRole("grid", { name: "Duty timeline" })
      .getByRole("columnheader");
    await expect(timelineHeaders.nth(16)).toContainText("익일");
    await expect(timelineHeaders.nth(16)).toContainText("00");
    await expect(
      page.getByText("근무를 선택하면 근무 상세가 표시됩니다."),
    ).toBeVisible();
    await expect(page.getByText("이하은")).toHaveCount(0);
    await expect(page.getByText("질문")).toHaveCount(0);
    await expect(page.getByText("보강")).toHaveCount(0);

    await captureActualScreenshot({
      page,
      screenId: "DUT-01",
      viewport,
    });
  });
}

test(`DUT-01 list-view ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "목록 보기" }).click();
  await expect(page.getByTestId("duty-list-table")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DUT-01",
    state: "list-view",
    viewport: desktop,
  });
});

test("DUT-01 toolbar controls stay inside the screen frame", async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: laptop });
  await page.evaluate(() => document.fonts.ready);

  const metrics = await page.evaluate(() => {
    const screen = document.querySelector<HTMLElement>(
      "[data-testid='duty-list-screen']",
    );
    const controls = [
      document.querySelector<HTMLElement>(
        "[data-testid='duty-list-location-filter']",
      ),
      document.querySelector<HTMLElement>("[data-testid='duty-list-tag-filter']"),
      document.querySelector<HTMLElement>(
        "[data-testid='duty-list-status-filter']",
      ),
      document.querySelector<HTMLElement>("button[aria-label='타임라인 보기']"),
      document.querySelector<HTMLElement>("button[aria-label='목록 보기']"),
      [...document.querySelectorAll<HTMLElement>("button")].find((button) =>
        button.textContent?.includes("근무 개설"),
      ),
    ];

    if (!screen || controls.some((control) => !control)) {
      throw new Error("DUT-01 toolbar measurement target not found");
    }

    const screenRect = screen.getBoundingClientRect();

    return controls.map((control) => {
      const controlRect = control!.getBoundingClientRect();

      return {
        bottom: controlRect.bottom,
        top: controlRect.top,
        screenBottom: screenRect.bottom,
        screenTop: screenRect.top,
      };
    });
  });

  for (const metric of metrics) {
    expect(metric.top).toBeGreaterThanOrEqual(metric.screenTop);
    expect(metric.bottom).toBeLessThanOrEqual(metric.screenBottom);
  }
});

test(`DUT-01 selected-duty ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("duty-list-select-first").click();
  await expect(page.getByText("할당된 조교 (3명)")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DUT-01",
    state: "selected-duty",
    viewport: desktop,
  });
});

test("DUT-01 filter dropdowns update duty list", async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });

  await page.getByRole("button", { name: "목록 보기" }).click();
  await page.getByTestId("duty-list-tag-filter").click();
  await page.getByRole("option", { name: "질문" }).click();

  const table = page.getByTestId("duty-list-table");

  await expect(table.getByText("영어 C반")).toHaveCount(2);
  await expect(table.getByText("물리 F반")).toHaveCount(0);
  await expect(table.getByText("2건")).toBeVisible();
});

test("DUT-02 assigned worker links to worker schedule", async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });

  await page.getByTestId("duty-list-select-first").click();
  await expect(
    page.getByRole("link", { name: "김서연 월 19:00~21:00" }),
  ).toHaveAttribute("href", "/workers/worker_kim_seoyeon/schedule");
});

test(`DUT-01 create-duty-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "근무 개설" }).click();
  await expect(page.getByTestId("duty-list-create-dialog")).toBeVisible();
  await expect(page.getByTestId("duty-list-create-dialog").getByLabel("이름")).toBeEditable();
  await expect(
    page
      .getByTestId("duty-list-create-dialog")
      .locator("select#duty-create-locationId"),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("duty-list-create-dialog").getByRole("combobox", {
      name: "근무지",
    }),
  ).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DUT-01",
    state: "create-duty-dialog",
    viewport: desktop,
  });
});

test("DUT-01 creates duty through data source", async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "근무 개설" }).click();

  const dialog = page.getByTestId("duty-list-create-dialog");
  await dialog.getByLabel("이름").fill("수학 A반 질문");
  await dialog.getByLabel("근무 태그 (복수 가능)").fill("질문");
  await dialog.getByRole("combobox", { name: "근무지" }).click();
  await page.getByRole("option", { name: "대치 A학원" }).click();
  await dialog.getByRole("button", { name: "월" }).click();
  await dialog.getByLabel("시작 시간").fill("09:00");
  await dialog.getByLabel("종료 시간").fill("11:00");
  await dialog.getByRole("button", { name: "근무 저장" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("duty-list-screen")).toContainText(
    "수학 A반 질문 근무를 개설했습니다.",
  );
  await expect(page.getByTestId("duty-detail-panel")).toContainText(
    "수학 A반 질문",
  );
  await expect(page.getByTestId("duty-detail-panel")).toContainText("대치 A학원");
});

test("DUT-01 create duty operation period follows SRS", async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "근무 개설" }).click();

  const dialog = page.getByTestId("duty-list-create-dialog");
  await dialog.getByLabel("이름").fill("운영 기간 테스트");
  await dialog.getByRole("combobox", { name: "근무지" }).click();
  await page.getByRole("option", { name: "대치 A학원" }).click();
  await dialog.getByRole("button", { name: "월" }).click();
  await dialog.getByLabel("시작 시간").fill("09:00");
  await dialog.getByLabel("종료 시간").fill("11:00");
  await dialog.getByLabel("운영 시작일").fill("2026-05-04");
  await expect(dialog.getByLabel("운영 종료일")).toBeEnabled();
  await dialog.getByLabel("운영 종료일").fill("2026-05-18");
  await expect(dialog).toContainText("총 3회 운영");

  await dialog.getByRole("button", { name: "화" }).click();
  await expect(dialog.getByLabel("운영 종료일")).toHaveValue("");

  await dialog.getByLabel("운영 종료일").fill("2026-05-18");
  await dialog.getByRole("button", { name: "근무 저장" }).click();
  await expect(dialog).toContainText("운영 시작일은 선택한 요일과 같아야 합니다.");
});

test(`DUT-01 edit-basic-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("duty-list-select-first").click();
  await page.getByRole("button", { name: "기본 정보 수정" }).click();
  await expect(page.getByTestId("duty-list-edit-basic-dialog")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DUT-01",
    state: "edit-basic-dialog",
    viewport: desktop,
  });
});

test(`DUT-01 edit-time-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("duty-list-select-first").click();
  await page.getByRole("button", { name: "시간 조정" }).click();
  await expect(page.getByTestId("duty-list-edit-time-dialog")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DUT-01",
    state: "edit-time-dialog",
    viewport: desktop,
  });
});

test(`DUT-01 dialogs fit viewport ${laptop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: laptop });
  await page.evaluate(() => document.fonts.ready);

  await page.getByRole("button", { name: "근무 개설" }).click();
  await expectDialogWithinViewport(page, "duty-list-create-dialog");
  await page
    .getByTestId("duty-list-create-dialog")
    .getByRole("button", { name: "취소" })
    .click();

  await page.getByTestId("duty-list-select-first").click();
  await page.getByRole("button", { name: "기본 정보 수정" }).click();
  await expectDialogWithinViewport(page, "duty-list-edit-basic-dialog");
  await page
    .getByTestId("duty-list-edit-basic-dialog")
    .getByRole("button", { name: "취소" })
    .click();

  await page.getByRole("button", { name: "시간 조정" }).click();
  await expectDialogWithinViewport(page, "duty-list-edit-time-dialog");
});

test(`DUT-01 timeline owns sticky scroll ${laptop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: laptop });
  await page.evaluate(() => document.fonts.ready);
  await expectTimelineFrameOwnsStickyScroll({
    frameTestId: "duty-timeline-view",
    page,
  });
});

async function expectDialogWithinViewport(page: Page, testId: string) {
  const dialog = page.getByTestId(testId);
  await expect(dialog).toBeVisible();

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (!box || !viewport) {
    return;
  }

  const verticalInset = 24;
  expect(box.y).toBeGreaterThanOrEqual(verticalInset - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(
    viewport.height - verticalInset + 1,
  );
}
