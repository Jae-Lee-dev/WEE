import { expect, test, type Page } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";
const segmentAnimationMs = 350;

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`WKR-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/workers/applications", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { name: "신청 목록" })).toBeVisible();
    await expect(
      page.getByText("신청 건을 선택하면").first(),
    ).toBeVisible();
    await expectWorkerApplicationIndicatorToMatchList(page);

    await captureActualScreenshot({
      page,
      screenId: "WKR-01",
      viewport,
    });
  });
}

test(`WKR-01 selected-application ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-application-row-1").click();
  await expect(page.getByRole("heading", { name: "소속 승인" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "통장 사본 다운로드" }),
  ).toHaveAttribute("href", /worker-application-bankbook/);

  await captureActualScreenshot({
    page,
    screenId: "WKR-01",
    state: "selected-application",
    viewport: desktop,
  });
});

test(`WKR-01 tag-search ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-application-row-1").click();
  await page.getByRole("combobox", { name: "근무자 태그 검색" }).click();
  await expect(page.getByRole("listbox", { name: "태그 선택" })).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-01",
    state: "tag-search",
    viewport: desktop,
  });
});

test(`WKR-01 tag-added ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-application-row-1").click();
  await page
    .getByRole("combobox", { name: "근무자 태그 검색" })
    .fill("문서 검토");
  await page.getByRole("option", { name: "새 태그 문서 검토 선택" }).click();
  await expect(
    page.getByRole("button", { name: "문서 검토 태그 제거" }),
  ).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-01",
    state: "tag-added",
    viewport: desktop,
  });
});

test("WKR-01 tag picker ignores Enter while IME is composing", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  await page.getByTestId("worker-application-row-1").click();
  const tagInput = page.getByRole("combobox", { name: "근무자 태그 검색" });

  await tagInput.fill("문서 검토");
  await expect(
    page.getByRole("option", { name: "새 태그 문서 검토 선택" }),
  ).toBeVisible();

  await tagInput.evaluate((input) => {
    input.dispatchEvent(
      new CompositionEvent("compositionstart", {
        bubbles: true,
        cancelable: true,
      }),
    );
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "Enter",
        key: "Enter",
      }),
    );
  });

  await expect(
    page.getByRole("button", { name: "문서 검토 태그 제거" }),
  ).toHaveCount(0);
  await expect(tagInput).toHaveValue("문서 검토");

  await tagInput.evaluate((input) => {
    input.dispatchEvent(
      new CompositionEvent("compositionend", {
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await page.waitForTimeout(20);
  await tagInput.press("Enter");
  await expect(
    page.getByRole("button", { name: "문서 검토 태그 제거" }),
  ).toBeVisible();
});

test(`WKR-01 monthly-pay-selected ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-application-row-1").click();
  await page.getByRole("combobox", { name: "근무자 태그 검색" }).click();
  await page.getByRole("option", { name: "베테랑" }).click();
  await page.getByTestId("worker-application-pay-monthly").click();
  await expect(page.getByTestId("worker-application-pay-monthly")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("세율 직접 입력")).toHaveCount(0);
  await page.waitForTimeout(segmentAnimationMs);

  await captureActualScreenshot({
    page,
    screenId: "WKR-01",
    state: "monthly-pay-selected",
    viewport: desktop,
  });
});

test("WKR-01 row click toggles application selection", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/workers/applications",
    viewport: desktop,
  });
  const firstRow = page.getByTestId("worker-application-row-1");

  await firstRow.click();
  await expect(firstRow).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "소속 승인" })).toBeVisible();

  await firstRow.click();
  await expect(firstRow).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("신청 건을 선택하면").first()).toBeVisible();
});

async function expectWorkerApplicationIndicatorToMatchList(page: Page) {
  const listCount = page.getByTestId("worker-application-list-count");

  await expect(listCount).toHaveText(/\d+건/);

  const listCountText = await listCount.textContent();
  const rowCount = listCountText?.replace(/\D/g, "") ?? "";

  await expect(
    page
      .getByRole("link", { name: /소속 신청/ })
      .locator('[data-slot="badge"]')
      .first(),
  ).toHaveText(rowCount);
}
