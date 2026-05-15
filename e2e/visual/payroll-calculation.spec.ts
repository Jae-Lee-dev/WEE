import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`PAY-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/payroll", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("payroll-calculation-default")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "조교 목록" }),
    ).toBeVisible();
    await expect(page.getByText("2026.04")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "PAY-01",
      viewport,
    });
  });
}

test("PAY-01 export includes objective payment columns", async ({
  page,
}) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "내보내기" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();

  expect(download.suggestedFilename()).toBe("payroll-2026.04.csv");
  expect(downloadPath).not.toBeNull();

  const csv = (await readFile(downloadPath ?? "", "utf8")).replace(/^\uFEFF/, "");
  const [header = "", firstRow = ""] = csv.split("\n");

  expect(header).toBe(
    [
      "산정 월",
      "조교",
      "지급 대상액",
      "일반근무",
      "추가근무",
      "보너스/차감",
      "세금",
      "명세 상태",
      "미처리 항목",
    ]
      .map((cell) => `"${cell}"`)
      .join(","),
  );
  expect(firstRow).toBe(
    [
      "2026.04",
      "김서연",
      "₩348,120",
      "₩300,000",
      "₩10,000",
      "+ ₩50,000",
      "₩11,880",
      "미확정",
      "미처리 4건",
    ]
      .map((cell) => `"${cell}"`)
      .join(","),
  );
});

test(`PAY-01 detail ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("payroll-calculation-first-detail").click();
  await expect(
    page.getByTestId("payroll-calculation-state-detail"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "급여 산정 내역" }),
  ).toBeVisible();
  await expect(page.getByText("현재 급여 계산")).toHaveCount(0);
  await expect(page.getByText("수기 보너스 차감")).toHaveCount(0);
  await expect(page.getByText("보너스/차감 항목")).toHaveCount(0);
  await expect(page.getByText("총 근무 시간")).toBeVisible();
  await expect(page.getByText("추가근무 수당")).toBeVisible();
  await expect(page.getByText("세전 보너스/차감")).toBeVisible();
  await expect(page.getByText("세후 보너스/차감")).toBeVisible();
  await expect(
    page.getByTestId("payroll-calculation-adjustment-line-pre_tax"),
  ).not.toContainText("₩");
  await expect(
    page.getByTestId("payroll-calculation-adjustment-line-post_tax"),
  ).not.toContainText("₩");
  await expect(page.getByText("신입 교육 지원")).toBeVisible();
  await expect(page.getByText("지각 차감")).toBeVisible();
  await expect(page.getByRole("heading", { name: "월 근무기록" })).toBeVisible();
  await expect(page.getByText("모의고사 채점")).toBeVisible();
  await expect(
    page.getByText("wr_worker_jung_20260424_duty_grading_fri"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "신입 교육 지원 삭제" }),
  ).toBeVisible();
  await expect(page.getByTestId("payroll-calculation-rounding-rule")).toHaveText(
    "근무시간 6분 단위 · 급여 원 단위",
  );
  await expect(
    page.getByRole("button", { name: "급여 산정" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "급여 산정 상세" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "급여 확정 (미처리 항목 4/4)" }),
  ).toBeDisabled();
  await expectPayrollDetailPanelsToShareHeight(page);

  await captureActualScreenshot({
    page,
    screenId: "PAY-01",
    state: "detail",
    viewport: desktop,
    fullPage: true,
  });
});

test("PAY-01 keeps list and detail scrolling inside payroll content", async ({
  page,
}) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);

  const tableBody = page.getByTestId("payroll-calculation-table-body");
  await expect(tableBody).toBeVisible();
  await tableBody.evaluate((element) => {
    element.scrollTop = 180;
  });
  await expect
    .poll(() => tableBody.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);

  await page.getByTestId("payroll-calculation-first-detail").click();
  const detailScroll = page.getByTestId("payroll-calculation-state-detail");
  await expect(detailScroll).toBeVisible();
  await detailScroll.evaluate((element) => {
    element.scrollTop = 180;
  });
  await expect
    .poll(() => detailScroll.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
});

test("PAY-01 opens monthly work-record item actions in a modal", async ({ page }) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("payroll-calculation-first-detail").click();
  await expect(page.getByText("REC-01에서 처리")).toHaveCount(0);

  await page.getByRole("button", { name: "처리하기" }).first().click();
  await expect(page.getByTestId("payroll-record-action-modal")).toBeVisible();
  await expect(page.getByTestId("record-detail-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "정상 처리" })).toBeVisible();

  await page.getByRole("button", { name: "정상 처리" }).click();
  await expect(page.getByTestId("record-action-confirm-dialog")).toBeVisible();
});

test(`PAY-01 adjustment form ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("payroll-calculation-first-detail").click();
  await page
    .getByTestId("payroll-calculation-add-adjustment-pre_tax")
    .click();
  await expect(
    page.getByTestId("payroll-calculation-state-detail"),
  ).toBeVisible();
  await expect(
    page.getByTestId("payroll-calculation-bonus-add-form"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "급여 산정 상세" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "보너스/차감 추가" }),
  ).toHaveCount(0);
  await expect(page.getByPlaceholder("예) 야근수당")).toBeVisible();
  const form = page.getByTestId("payroll-calculation-bonus-add-form");
  await expectAdjustmentFormControlsToShareHeight(form);
  await expectPayrollDetailPanelsToShareHeight(page);
  await form.getByRole("tab", { name: "-" }).click();
  await expect(form.getByRole("tab", { name: "-" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(form.getByRole("tab", { name: "세후" })).toHaveCount(0);

  await captureActualScreenshot({
    page,
    screenId: "PAY-01",
    state: "pre-tax-adjustment-form",
    viewport: desktop,
    fullPage: true,
  });
});

test("PAY-01 adjustment form stays inside calculation card on laptop", async ({
  page,
}) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("payroll-calculation-first-detail").click();
  await page
    .getByTestId("payroll-calculation-add-adjustment-pre_tax")
    .click();

  await expect(
    page.getByTestId("payroll-calculation-bonus-add-form"),
  ).toBeVisible();
  await expectAdjustmentFormControlsToShareHeight(
    page.getByTestId("payroll-calculation-bonus-add-form"),
  );
  await expectElementToStayInside(
    page.getByTestId("payroll-calculation-bonus-add-form-controls"),
    page.getByTestId("payroll-calculation-card"),
  );
});

async function expectAdjustmentFormControlsToShareHeight(form: Locator) {
  const controls = [
    form.getByLabel("항목명"),
    form.getByTestId("payroll-calculation-adjustment-operator"),
    form.getByLabel("지급액"),
    form.getByTestId("payroll-calculation-add-adjustment-submit"),
  ];

  await expect
    .poll(async () => {
      const boxes = await Promise.all(
        controls.map((control) => control.boundingBox()),
      );
      const heights = boxes.map((box) => box?.height ?? 0);

      return Math.max(...heights) - Math.min(...heights);
    })
    .toBeLessThanOrEqual(1);
}

async function expectPayrollDetailPanelsToShareHeight(page: Page) {
  const calculationCard = page.getByTestId("payroll-calculation-card");
  const openItemsPanel = page.getByTestId("payroll-calculation-open-items-panel");

  await expect
    .poll(async () => {
      const [calculationCardBox, openItemsPanelBox] = await Promise.all([
        calculationCard.boundingBox(),
        openItemsPanel.boundingBox(),
      ]);

      return Math.abs(
        (calculationCardBox?.height ?? 0) - (openItemsPanelBox?.height ?? 0),
      );
    })
    .toBeLessThanOrEqual(1);
}

async function expectElementToStayInside(
  child: ReturnType<Page["getByTestId"]>,
  parent: ReturnType<Page["getByTestId"]>,
) {
  await expect
    .poll(async () => {
      const [childBox, parentBox] = await Promise.all([
        child.boundingBox(),
        parent.boundingBox(),
      ]);

      if (!childBox || !parentBox) {
        return Number.POSITIVE_INFINITY;
      }

      return Math.max(
        parentBox.x - childBox.x,
        childBox.x + childBox.width - (parentBox.x + parentBox.width),
        0,
      );
    })
    .toBeLessThanOrEqual(1);
}

test(`PAY-01 no-open-items ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/payroll", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("payroll-calculation-first-detail").click();
  await page.getByTestId("payroll-calculation-show-no-open-items").click();
  await expect(
    page.getByTestId("payroll-calculation-state-no-open-items"),
  ).toBeVisible();
  await expect(page.getByText("퇴근시간 변경")).toBeVisible();
  await expect(page.getByRole("button", { name: "급여 확정" })).toBeEnabled();
  await expectPayrollDetailPanelsToShareHeight(page);

  await captureActualScreenshot({
    page,
    screenId: "PAY-01",
    state: "no-open-items",
    viewport: desktop,
    fullPage: true,
  });
});
