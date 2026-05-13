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
    await expect(
      page.getByRole("link", { name: "통장 사본 다운로드" }),
    ).toHaveAttribute("href", /worker-kim-seoyeon-bankbook/);

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
  await expect(dialog.getByRole("tab", { name: "시급" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(dialog.getByRole("button", { name: "저장" })).toBeDisabled();

  await captureActualScreenshot({
    page,
    screenId: "WKR-03",
    state: "edit-info-dialog",
    viewport: desktop,
  });
});

test("WKR-03 edits worker info in dialog", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: routePath,
    viewport: desktop,
  });
  await page.getByTestId("worker-basic-edit-trigger").click();

  const dialog = page.getByTestId("worker-edit-info-dialog");
  const saveButton = dialog.getByRole("button", { name: "저장" });

  await expect(saveButton).toBeDisabled();

  await dialog.getByLabel("이름").fill("김서연 수정");
  await dialog.getByLabel("급여 금액").fill("12000");
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("조교 정보를 수정했습니다.")).toBeVisible();
  await expect(page.getByTestId("worker-detail-basic-screen")).toContainText(
    "김서연 수정",
  );
  await expect(page.getByTestId("worker-detail-basic-screen")).toContainText(
    "₩12,000 / 시간",
  );
});

test("WKR-03 switches pay type through shared segment", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: routePath,
    viewport: desktop,
  });
  await page.getByTestId("worker-basic-edit-trigger").click();

  const dialog = page.getByTestId("worker-edit-info-dialog");
  await dialog.getByRole("tab", { name: "월급" }).click();

  await expect(dialog.getByRole("tab", { name: "월급" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(dialog.getByText("원/월")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "저장" })).toBeEnabled();
});

test("WKR-03 warns before closing dirty edit dialog", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: routePath,
    viewport: desktop,
  });
  await page.getByTestId("worker-basic-edit-trigger").click();

  const editDialog = page.getByTestId("worker-edit-info-dialog");
  await editDialog.getByLabel("이름").fill("김서연 수정");

  let alertMessage = "";
  page.once("dialog", async (browserDialog) => {
    alertMessage = browserDialog.message();
    await browserDialog.accept();
  });

  await editDialog.getByRole("button", { name: "취소" }).click();

  expect(alertMessage).toContain("저장하지 않은 수정사항");
  await expect(editDialog).toBeVisible();
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
