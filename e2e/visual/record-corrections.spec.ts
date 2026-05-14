import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const desktop: VisualViewportName = "desktop-1920";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`REC-03 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({
      page,
      path: "/records/corrections",
      viewport,
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByTestId("record-corrections-screen")).toBeVisible();
    await expect(page.getByTestId("record-history-empty-detail")).toBeVisible();

    await captureActualScreenshot({
      page,
      screenId: "REC-03",
      viewport,
    });
  });
}

test(`REC-03 selected-correction ${desktop}`, async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/records/corrections",
    viewport: desktop,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId("record-corrections-first-detail").click();
  await expect(page.getByTestId("record-corrections-selected-detail")).toBeVisible();
  await expect(page.getByTestId("record-corrections-first-detail")).toHaveCSS(
    "background-color",
    "rgb(35, 168, 102)",
  );
  await expect(page.getByRole("heading", { name: "승인 결과" })).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "REC-03",
    state: "selected-correction",
    viewport: desktop,
  });
});

test("REC-03 filters correction rows", async ({ page }) => {
  await prepareVisualPage({
    page,
    path: "/records/corrections",
    viewport: desktop,
  });

  await expect(page.getByTestId("record-corrections-first-detail")).toBeVisible();

  await page
    .getByRole("combobox", { name: "급여 반영 (전체) 필터" })
    .click();
  await page.getByRole("option", { name: "보류" }).click();

  await expect(page.getByTestId("record-corrections-first-detail")).toHaveCount(
    0,
  );
  await expect(page.getByText("표시할 이력이 없습니다.")).toBeVisible();
});
