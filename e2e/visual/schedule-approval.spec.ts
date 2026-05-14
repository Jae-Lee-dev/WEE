import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SCH-01 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/schedule", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "승인 대기 목록" }),
    ).toBeVisible();
    await expect(page.getByText("17건").first()).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "SCH-01",
      viewport,
    });
  });
}

test(`SCH-01 selected-request ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/schedule", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("schedule-approval-first-detail").click();
  await expect(page.getByTestId("schedule-approval-selected-state")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "승인 대기 목록" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "시간표 승인 상세" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "시간 조정" })).toBeVisible();
  await expect(
    page.getByTestId("schedule-approval-selected-timeline-block"),
  ).toContainText("수학 B반");
  await expect(
    page.getByTestId("schedule-approval-selected-timeline-block"),
  ).toContainText("19:00~21:00");

  await captureActualScreenshot({
    page,
    screenId: "SCH-01",
    state: "selected-request",
    viewport: desktop,
  });
});

test(`SCH-01 selected-request focus changes by row ${desktop}`, async ({
  page,
}) => {
  await prepareVisualPage({ page, path: "/schedule", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);

  await page
    .locator('[data-request-id="request-kim-seoyeon-initial-0415-1"]')
    .click();
  await expect(
    page.getByTestId("schedule-approval-selected-timeline-block"),
  ).toContainText("수학 B반");
  await expect(
    page.getByTestId("schedule-approval-selected-timeline-block"),
  ).toContainText("14:00~16:00");

  await page.getByRole("button", { name: "승인 대기 목록" }).click();
  await page.locator('[data-request-id="request-ihaeun-change-0415"]').click();
  await expect(
    page.getByTestId("schedule-approval-selected-state").locator("h2").first(),
  ).toHaveText("수학 A반");
  await expect(
    page.getByTestId("schedule-approval-selected-timeline-block"),
  ).toContainText("수학 A반");
  await expect(
    page.getByTestId("schedule-approval-selected-timeline-block"),
  ).toContainText("19:00~21:00");
});

test(`SCH-01 reject-dialog ${desktop}`, async ({ page }) => {
  await prepareVisualPage({ page, path: "/schedule", viewport: desktop });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("schedule-approval-first-detail").click();
  await page.getByTestId("schedule-approval-reject-trigger").click();
  await expect(page.getByTestId("schedule-approval-reject-dialog")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "SCH-01",
    state: "reject-dialog",
    viewport: desktop,
  });
});
