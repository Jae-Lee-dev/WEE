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

    const dividerMetrics = await page.evaluate(() => {
      const divider = document.querySelector(
        '[data-testid="sidebar-logo-divider"]',
      );
      const sidebar = divider?.closest("aside");

      if (!(divider instanceof HTMLElement) || !(sidebar instanceof HTMLElement)) {
        throw new Error("Sidebar logo divider measurement target not found");
      }

      const dividerRect = divider.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();

      return {
        dividerLeft: dividerRect.left,
        dividerRight: dividerRect.right,
        sidebarLeft: sidebarRect.left,
        sidebarRight: sidebarRect.right,
      };
    });

    expect(
      Math.abs(dividerMetrics.dividerLeft - dividerMetrics.sidebarLeft),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(dividerMetrics.dividerRight - dividerMetrics.sidebarRight),
    ).toBeLessThanOrEqual(1);

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
