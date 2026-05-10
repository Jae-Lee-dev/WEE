import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`REC-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/records", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("record-main-screen")).toBeVisible();
    await expect(page.getByText("05.04 (월) ~ 05.10 (일)")).toBeVisible();

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
