import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const viewports: VisualViewportName[] = ["desktop-1920", "laptop-1366"];

for (const viewport of viewports) {
  test(`admin shell default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/dashboard", viewport });
    await expect(
      page.getByRole("navigation", { name: "관리자 메뉴" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "확인 필요" }),
    ).toBeVisible();
    await captureActualScreenshot({
      page,
      screenId: "SHELL-01",
      viewport,
    });
  });

  test(`foundation preview ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: "/design-system", viewport });
    await expect(
      page.getByRole("heading", { name: "Wee Admin Design Tokens" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Admin Screen Foundation" }),
    ).toBeVisible();
    await captureActualScreenshot({
      page,
      screenId: "FOUNDATION-PREVIEW",
      viewport,
      fullPage: true,
    });
  });
}
