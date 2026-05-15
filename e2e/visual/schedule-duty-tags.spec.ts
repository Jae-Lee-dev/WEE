import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`DUT-03 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/schedule/duty-tags", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "근무 태그 목록" }),
    ).toBeVisible();
    const statusColumnOffset = await page.evaluate(() => {
      const header = document.querySelector(
        '[data-testid="duty-tags-list-status-header"]',
      );
      const firstStatus = document.querySelector(
        '[data-testid="duty-tags-row-first-status"]',
      );

      if (!(header instanceof HTMLElement) || !(firstStatus instanceof HTMLElement)) {
        throw new Error("duty tag list status column nodes not found");
      }

      return Math.abs(
        header.getBoundingClientRect().left -
          firstStatus.getBoundingClientRect().left,
      );
    });
    expect(statusColumnOffset).toBeLessThanOrEqual(1);
    const detailPanel = page.getByTestId("duty-tags-detail-panel");
    await expect(detailPanel).toHaveCSS("border-top-width", "0px");
    await expect(detailPanel).toHaveCSS("border-right-width", "0px");
    await expect(detailPanel).toHaveCSS("border-bottom-width", "0px");
    await expect(detailPanel).toHaveCSS("border-left-width", "0px");

    await captureActualScreenshot({
      page,
      screenId: "DUT-03",
      viewport,
    });
  });
}

test(`DUT-03 edit-tag-panel ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/duty-tags",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  const panel = page.getByTestId("duty-tags-detail-panel");

  await expect(panel.getByText("4건")).toBeVisible();
  await page.getByTestId("duty-tags-edit-trigger-first").click();
  await expect(panel).toHaveAttribute("data-duty-tags-panel-mode", "edit");
  await expect(
    panel.getByRole("heading", { name: "현재 사용 중인 근무" }),
  ).toBeVisible();
  await expect(panel.getByText("4건")).toBeVisible();
  await expect(panel.getByText("근무 목록을 불러오는 중입니다.")).toHaveCount(0);
  await expect(panel.getByTestId("duty-tags-assignment-list")).toHaveCSS(
    "overflow-y",
    "auto",
  );

  await captureActualScreenshot({
    page,
    screenId: "DUT-03",
    state: "edit-tag-panel",
    viewport: desktop,
  });
});

test("DUT-03 detail panel uses clicked tag", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/duty-tags",
    viewport: desktop,
  });

  await page.getByRole("button", { name: "행정 근무 태그 조회" }).click();
  const panel = page.getByTestId("duty-tags-detail-panel");

  await expect(panel.getByLabel("태그명")).toHaveValue("행정");
  await expect(panel.getByText("2건")).toBeVisible();
});

test("DUT-03 creates duty tags in dialog", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/duty-tags",
    viewport: desktop,
  });

  await page.getByRole("button", { name: "태그 추가" }).click();

  const dialog = page.getByTestId("duty-tags-create-dialog");

  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("duty-tags-detail-panel")).toHaveAttribute(
    "data-duty-tags-panel-mode",
    "view",
  );

  await dialog.getByLabel("태그명").fill("테스트 태그");
  await expect(dialog.getByRole("button", { name: "저장" })).toBeEnabled();
  await dialog.getByRole("button", { name: "저장" }).click();

  await expect(page.getByText("테스트 태그 근무 태그를 추가했습니다.")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByTestId("duty-tags-row-first").getByText("테스트 태그"),
  ).toBeVisible();
});

test("DUT-03 edits assignments and deletes duty tags", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/duty-tags",
    viewport: desktop,
  });

  await page.getByTestId("duty-tags-edit-trigger-first").click();
  const panel = page.getByTestId("duty-tags-detail-panel");

  await panel.getByLabel("태그명").fill("질문 수정");
  await panel.getByLabel("상태").click();
  await page.getByRole("option", { name: "비활성" }).click();
  await panel.getByRole("button", { name: "저장" }).click();

  await expect(page.getByText("질문 수정 근무 태그를 수정했습니다.")).toBeVisible();
  await expect(page.getByText("질문 수정", { exact: true })).toBeVisible();
  await expect(
    page.getByTestId("duty-tags-row-first").getByText("비활성"),
  ).toBeVisible();

  await panel.getByRole("button", { name: "삭제" }).click();
  await page
    .getByRole("dialog", { name: "근무 태그 삭제" })
    .getByRole("button", { name: "삭제" })
    .click();

  await expect(page.getByText("질문 수정 근무 태그를 삭제했습니다.")).toBeVisible();
  await expect(page.getByText("질문 수정", { exact: true })).toHaveCount(0);
});
