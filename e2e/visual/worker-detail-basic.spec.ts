import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const routePath = "/workers/worker_kim_seoyeon";
const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`WKR-03 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: routePath,
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);

    const screen = page.getByTestId("worker-detail-basic-screen");
    await expect(screen).toBeVisible();
    await expect(screen).toContainText("김서연");
    await expect(screen).toContainText("인적사항 · 계좌");
    await expect(screen).toContainText("국민은행 123-456-789");
    await expect(screen).toContainText("급여 설정");
    await expect(screen).toContainText("₩10,000 / 시간");

    await captureActualScreenshot({
      page,
      screenId: "WKR-03",
      viewport,
    });
  });
}

test(`WKR-03 edit-info-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: routePath,
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-basic-edit-trigger").click();

  const dialog = page.getByTestId("worker-edit-info-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("조교 정보 수정");
  await expect(dialog).toContainText("급여 타입");
  await expect(dialog).toContainText("급여 설정 변경은 해당 월 1일부터 소급 적용됩니다");
  await expect(dialog).toContainText("저장");

  await captureActualScreenshot({
    page,
    screenId: "WKR-03",
    state: "edit-info-dialog",
    viewport: desktop,
  });
});

test(`WKR-03 delete-blocked-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: routePath,
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "조교 삭제" }).click();

  const dialog = page.getByTestId("worker-delete-blocked-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("조교를 삭제할 수 없습니다");
  await expect(dialog).toContainText("미처리 이상 플래그");
  await expect(dialog).toContainText("미지급 급여");
  await expect(dialog).toContainText("대기 중 추가근무");
  await expect(dialog).toContainText("확인");

  await captureActualScreenshot({
    page,
    screenId: "WKR-03",
    state: "delete-blocked-dialog",
    viewport: desktop,
  });
});
