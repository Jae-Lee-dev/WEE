import { expect, test, type Page } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";
const laptop: VisualViewportName = "laptop-1366";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SET-03 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/settings/rules", viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("settings-rules-screen")).toBeVisible();
    await expect(page.getByText("시간 허용 오차")).toBeVisible();
    await expect(page.getByText("6분 단위")).toBeVisible();
    await expect(page.getByText("원 단위")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "SET-03",
      viewport,
    });
  });
}

test(`SET-03 rules-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/settings/rules", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("settings-rules-edit-trigger").click();

  await expect(page.getByTestId("settings-rules-dialog")).toBeVisible();
  await expect(page.getByLabel("시간 이상 허용 오차")).toHaveValue("5");
  await expect(page.getByLabel("근무 시간 올림 단위")).toHaveValue("6");
  await expect(page.getByLabel("급여 올림 단위")).toContainText("원 단위");

  await captureActualScreenshot({
    page,
    screenId: "SET-03",
    state: "rules-dialog",
    viewport: desktop,
  });
});

test(`SET-03 rules-dialog contained ${laptop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/settings/rules", viewport: laptop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("settings-rules-edit-trigger").click();

  await expectDialogContentContained(page, "settings-rules-dialog");
});

async function expectDialogContentContained(page: Page, testId: string) {
  const metrics = await page.getByTestId(testId).evaluate((dialog) => {
    const dialogRect = dialog.getBoundingClientRect();
    const visibleOverflow = Array.from(dialog.querySelectorAll("*")).filter(
      (node) => {
        if (!(node instanceof HTMLElement)) {
          return false;
        }

        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();

        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width === 0 ||
          rect.height === 0
        ) {
          return false;
        }

        return (
          rect.left < dialogRect.left - 1 ||
          rect.right > dialogRect.right + 1
        );
      },
    );

    return {
      dialogLeft: dialogRect.left,
      dialogRight: dialogRect.right,
      overflowCount: visibleOverflow.length,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.dialogLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.dialogRight).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.overflowCount).toBe(0);
}
