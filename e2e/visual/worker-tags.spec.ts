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

test(`WKR-06 edit-tag-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers/tags", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("worker-tags-edit-trigger-first").click();
  await expect(page.getByTestId("worker-tags-edit-dialog")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-06",
    state: "edit-tag-dialog",
    viewport: desktop,
  });
});

test("WKR-06 edit dialog uses clicked tag", async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers/tags", viewport: desktop });

  await page.getByRole("button", { name: "수정" }).nth(1).click();
  const dialog = page.getByTestId("worker-tags-edit-dialog");
  await expect(dialog.getByLabel("태그명")).toHaveValue("신입");
  await expect(dialog.getByText("3명")).toBeVisible();
});

test("WKR-06 edits and deletes worker tags", async ({ page }) => {
  await prepareVisualPage({ page, path: "/workers/tags", viewport: desktop });

  await page.getByTestId("worker-tags-edit-trigger-first").click();
  const dialog = page.getByTestId("worker-tags-edit-dialog");

  await dialog.getByLabel("태그명").fill("베테랑 수정");
  await dialog.getByLabel("상태").click();
  await page.getByRole("option", { name: "비활성" }).click();
  await dialog.getByRole("button", { name: "저장" }).click();

  await expect(
    page.getByText("베테랑 수정 근무자 태그를 수정했습니다."),
  ).toBeVisible();
  await expect(page.getByText("베테랑 수정", { exact: true })).toBeVisible();
  await expect(page.getByText("비활성")).toBeVisible();

  await page.getByRole("button", { name: "삭제" }).first().click();
  await page
    .getByRole("dialog", { name: "근무자 태그 삭제" })
    .getByRole("button", { name: "삭제" })
    .click();

  await expect(
    page.getByText("베테랑 수정 근무자 태그를 삭제했습니다."),
  ).toBeVisible();
  await expect(page.getByText("베테랑 수정", { exact: true })).toHaveCount(0);
});
