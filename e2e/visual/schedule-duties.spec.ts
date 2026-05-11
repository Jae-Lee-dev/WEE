import { expect, test } from "playwright/test";
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

test(`DUT-01 create-duty-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "근무 개설" }).click();
  await expect(page.getByTestId("duty-list-create-dialog")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "DUT-01",
    state: "create-duty-dialog",
    viewport: desktop,
  });
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

test(`DUT-01 timeline owns sticky scroll ${laptop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: laptop });
  await page.evaluate(() => document.fonts.ready);
  await expectTimelineFrameOwnsStickyScroll({
    frameTestId: "duty-timeline-view",
    page,
  });
});
