import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`WKR-06 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/workers/tags", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "근무자 태그 관리" }),
    ).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "WKR-06",
      viewport,
    });
  });
}

test(`WKR-06 edit-tag-panel ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers/tags", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  const panel = page.getByTestId("worker-tags-detail-panel");

  await expect(panel.getByText("3명")).toBeVisible();
  await page.getByTestId("worker-tags-edit-trigger-first").click();
  await expect(panel).toHaveAttribute("data-worker-tags-panel-mode", "edit");
  await expect(panel.getByText("3명")).toBeVisible();
  await expect(panel.getByText("조교 목록을 불러오는 중입니다.")).toHaveCount(0);

  const controlHeights = await panel.evaluate((root) => {
    const controls = ["태그명", "색상", "상태"].map((label) => {
      const control = root.querySelector(`[aria-label="${label}"]`);

      if (!(control instanceof HTMLElement)) {
        throw new Error(`${label} control not found`);
      }

      return control.getBoundingClientRect().height;
    });

    return controls;
  });
  expect(Math.max(...controlHeights) - Math.min(...controlHeights)).toBeLessThanOrEqual(
    1,
  );

  await captureActualScreenshot({
    page,
    screenId: "WKR-06",
    state: "edit-tag-panel",
    viewport: desktop,
  });
});

test("WKR-06 detail panel uses clicked tag", async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers/tags", viewport: desktop });

  await page.getByRole("button", { name: "신입 근무자 태그 조회" }).click();
  const panel = page.getByTestId("worker-tags-detail-panel");

  await expect(panel.getByLabel("태그명")).toHaveValue("신입");
  await expect(panel.getByText("3명")).toBeVisible();
});

test("WKR-06 creates worker tags in dialog", async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers/tags", viewport: desktop });

  await page.getByRole("button", { name: "태그 추가" }).click();

  const dialog = page.getByTestId("worker-tags-create-dialog");

  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("worker-tags-detail-panel")).toHaveAttribute(
    "data-worker-tags-panel-mode",
    "view",
  );

  await dialog.getByLabel("태그명").fill("테스트 태그");
  await expect(dialog.getByRole("button", { name: "저장" })).toBeEnabled();
  await dialog.getByRole("button", { name: "저장" }).click();

  await expect(
    page.getByText("테스트 태그 근무자 태그를 추가했습니다."),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByTestId("worker-tags-row-first").getByText("테스트 태그"),
  ).toBeVisible();
});

test("WKR-06 edits and deletes worker tags", async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers/tags", viewport: desktop });

  await page.getByTestId("worker-tags-edit-trigger-first").click();
  const panel = page.getByTestId("worker-tags-detail-panel");

  await panel.getByLabel("태그명").fill("베테랑 수정");
  await panel.getByLabel("상태").click();
  await page.getByRole("option", { name: "비활성" }).click();
  await panel.getByRole("button", { name: "저장" }).click();

  await expect(
    page.getByText("베테랑 수정 근무자 태그를 수정했습니다."),
  ).toBeVisible();
  await expect(
    page.getByTestId("worker-tags-row-first").getByText("베테랑 수정"),
  ).toBeVisible();
  await expect(
    page.getByTestId("worker-tags-row-first").getByText("비활성"),
  ).toBeVisible();

  await panel.getByRole("button", { name: "삭제" }).click();
  await panel
    .getByTestId("worker-tags-delete-confirm")
    .getByRole("button", { name: "삭제" })
    .click();

  await expect(
    page.getByText("베테랑 수정 근무자 태그를 삭제했습니다."),
  ).toBeVisible();
  await expect(page.getByText("베테랑 수정", { exact: true })).toHaveCount(0);
});
