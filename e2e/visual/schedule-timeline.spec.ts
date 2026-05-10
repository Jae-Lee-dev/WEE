import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`SCH-02 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/schedule/timeline", viewport });
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByText("선택된 조교가 없습니다."),
    ).toBeVisible();
    await expect(
      page.getByRole("grid", { name: "주간 근무 시간표" }),
    ).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "SCH-02",
      viewport,
    });
  });
}

test(`SCH-02 dropdown-open ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/timeline",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("schedule-timeline-location-filter").click();
  await expect(page.getByTestId("schedule-timeline-location-menu")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "SCH-02",
    state: "dropdown-open",
    viewport: desktop,
  });
});

test(`SCH-02 worker-selected ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/schedule/timeline",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("schedule-timeline-worker-select").click();
  await expect(
    page.getByRole("heading", { name: "이하은" }),
  ).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "SCH-02",
    state: "worker-selected",
    viewport: desktop,
  });
});
