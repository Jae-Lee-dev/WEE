import { expect, test, type Page } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const routePath = "/workers/worker_kim_seoyeon";
const desktop: VisualViewportName = "desktop-1920";
const laptop: VisualViewportName = "laptop-1366";

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
    await expect(screen).toContainText("원천징수");
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
  await expect(dialog).toContainText("원천징수");
  await expect(dialog).toContainText("급여 설정 변경은 해당 월 1일부터 소급 적용됩니다");
  await expect(
    dialog.getByRole("combobox", { name: "근무자 태그 검색" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "베테랑 태그 제거" }),
  ).toBeVisible();
  await expect(dialog.getByRole("tab", { name: "시급" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(dialog.getByRole("tab", { name: "3.3%" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(dialog.getByText("세율 방식")).toHaveCount(0);
  await expect(dialog.getByLabel("세율", { exact: true })).toHaveCount(0);
  const statusSelect = dialog.getByLabel("소속 상태");
  const effectiveFromInput = dialog.getByLabel("적용 시작");
  const payInput = dialog.getByLabel("급여 금액");
  const payTypeControl = dialog
    .getByTestId("worker-edit-pay-type-control")
    .locator("[data-slot='tabs-list']");
  const withholdingControl = dialog
    .getByTestId("worker-edit-withholding-control")
    .locator("[data-slot='tabs-list']");
  const payrollRowMetrics = {
    payTypeHeight: await payTypeControl.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    ),
    statusHeight: await statusSelect.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    ),
    statusTop: await statusSelect.evaluate((element) =>
      Math.round(element.getBoundingClientRect().top),
    ),
    effectiveFromHeight: await effectiveFromInput.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    ),
    effectiveFromTop: await effectiveFromInput.evaluate((element) =>
      Math.round(element.getBoundingClientRect().top),
    ),
    inputHeight: await payInput.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    ),
    inputTop: await payInput.evaluate((element) =>
      Math.round(element.getBoundingClientRect().top),
    ),
    withholdingHeight: await withholdingControl.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    ),
    withholdingTop: await withholdingControl.evaluate((element) =>
      Math.round(element.getBoundingClientRect().top),
    ),
  };
  expect(payrollRowMetrics.payTypeHeight).toBe(44);
  expect(payrollRowMetrics.statusHeight).toBe(44);
  expect(payrollRowMetrics.effectiveFromHeight).toBe(
    payrollRowMetrics.statusHeight,
  );
  expect(payrollRowMetrics.effectiveFromTop).toBe(payrollRowMetrics.statusTop);
  expect(payrollRowMetrics.inputHeight).toBe(payrollRowMetrics.payTypeHeight);
  expect(payrollRowMetrics.withholdingHeight).toBe(
    payrollRowMetrics.payTypeHeight,
  );
  expect(payrollRowMetrics.inputTop).toBe(payrollRowMetrics.withholdingTop);
  await expect(dialog.getByRole("button", { name: "저장" })).toBeDisabled();

  await captureActualScreenshot({
    page,
    screenId: "WKR-03",
    state: "edit-info-dialog",
    viewport: desktop,
  });
});

test(`WKR-03 edit-info-dialog contained ${laptop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: routePath,
    viewport: laptop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-basic-edit-trigger").click();

  await expectScrollableDialogContained(page, "worker-edit-info-dialog");
});

async function expectScrollableDialogContained(page: Page, testId: string) {
  const metrics = await page.getByTestId(testId).evaluate((dialog) => {
    const dialogRect = dialog.getBoundingClientRect();
    const footer = dialog.querySelector('[data-slot="dialog-footer"]');
    const scroller = Array.from(dialog.children).find((node) => {
      if (!(node instanceof HTMLElement)) {
        return false;
      }

      return window.getComputedStyle(node).overflowY === "auto";
    });

    if (!(footer instanceof HTMLElement) || !(scroller instanceof HTMLElement)) {
      throw new Error("Dialog layout targets not found");
    }

    const footerRect = footer.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();

    return {
      dialogBottom: dialogRect.bottom,
      dialogLeft: dialogRect.left,
      dialogRight: dialogRect.right,
      dialogTop: dialogRect.top,
      footerBottom: footerRect.bottom,
      footerTop: footerRect.top,
      scrollerBottom: scrollerRect.bottom,
      scrollerClientHeight: scroller.clientHeight,
      scrollerScrollHeight: scroller.scrollHeight,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.dialogLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.dialogRight).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.dialogTop).toBeGreaterThanOrEqual(0);
  expect(metrics.dialogBottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.scrollerBottom).toBeLessThanOrEqual(metrics.footerTop);
  expect(metrics.footerBottom).toBeLessThanOrEqual(metrics.dialogBottom);
  expect(metrics.scrollerScrollHeight).toBeGreaterThan(
    metrics.scrollerClientHeight,
  );
}

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

test("WKR-03 switches withholding through shared segment", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: routePath,
    viewport: desktop,
  });
  await page.getByTestId("worker-basic-edit-trigger").click();

  const dialog = page.getByTestId("worker-edit-info-dialog");
  await dialog.getByRole("tab", { name: "없음" }).click();

  await expect(dialog.getByRole("tab", { name: "없음" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(dialog.getByRole("button", { name: "저장" })).toBeEnabled();
});

test("WKR-03 confirms before closing dirty edit dialog", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: routePath,
    viewport: desktop,
  });
  await page.getByTestId("worker-basic-edit-trigger").click();

  const editDialog = page.getByTestId("worker-edit-info-dialog");
  await editDialog.getByLabel("이름").fill("김서연 수정");

  let dismissedConfirmMessage = "";
  page.once("dialog", async (browserDialog) => {
    expect(browserDialog.type()).toBe("confirm");
    dismissedConfirmMessage = browserDialog.message();
    await browserDialog.dismiss();
  });

  await editDialog.getByRole("button", { name: "취소" }).click();

  expect(dismissedConfirmMessage).toContain("저장하지 않은 수정사항");
  await expect(editDialog).toBeVisible();

  let acceptedConfirmMessage = "";
  page.once("dialog", async (browserDialog) => {
    expect(browserDialog.type()).toBe("confirm");
    acceptedConfirmMessage = browserDialog.message();
    await browserDialog.accept();
  });

  await editDialog.getByRole("button", { name: "취소" }).click();

  expect(acceptedConfirmMessage).toContain("저장하지 않은 수정사항");
  await expect(editDialog).toHaveCount(0);
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
