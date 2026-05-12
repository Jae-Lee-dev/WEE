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
    await expect(page.getByTestId("sidebar-workspace-name")).toHaveText(
      "김쌤 수학학원",
    );
    await expect(page.getByTestId("sidebar-account-name")).toHaveText("김준희");

    const logoHeaderMetrics = await page.evaluate(() => {
      const logoHeader = document.querySelector(
        '[data-testid="sidebar-logo-header"]',
      );
      const sidebar = logoHeader?.closest("aside");
      const adminHeader = document.querySelector("header");

      if (
        !(logoHeader instanceof HTMLElement) ||
        !(sidebar instanceof HTMLElement) ||
        !(adminHeader instanceof HTMLElement)
      ) {
        throw new Error("Sidebar logo header measurement target not found");
      }

      const logoHeaderRect = logoHeader.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      const adminHeaderRect = adminHeader.getBoundingClientRect();

      return {
        adminHeaderBottom: adminHeaderRect.bottom,
        logoHeaderBottom: logoHeaderRect.bottom,
        logoHeaderLeft: logoHeaderRect.left,
        logoHeaderRight: logoHeaderRect.right,
        sidebarLeft: sidebarRect.left,
        sidebarRight: sidebarRect.right,
      };
    });

    expect(
      Math.abs(logoHeaderMetrics.logoHeaderLeft - logoHeaderMetrics.sidebarLeft),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(
        logoHeaderMetrics.logoHeaderRight - logoHeaderMetrics.sidebarRight,
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(
        logoHeaderMetrics.logoHeaderBottom -
          logoHeaderMetrics.adminHeaderBottom,
      ),
    ).toBeLessThanOrEqual(1);

    const scrollMetrics = await page.evaluate(() => {
      const contentScroller = document.querySelector(
        '[data-testid="admin-shell-content-scroll"]',
      );
      const adminHeader = document.querySelector("header");

      if (
        !(contentScroller instanceof HTMLElement) ||
        !(adminHeader instanceof HTMLElement)
      ) {
        throw new Error("Admin shell scroll measurement target not found");
      }

      const beforeHeaderTop = adminHeader.getBoundingClientRect().top;
      contentScroller.scrollTop = 180;
      window.scrollTo(0, 180);
      const afterHeaderTop = adminHeader.getBoundingClientRect().top;
      const result = {
        contentOverflowY:
          contentScroller.scrollHeight - contentScroller.clientHeight,
        contentScrollTop: contentScroller.scrollTop,
        documentOverflowY:
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight,
        headerTopDelta: afterHeaderTop - beforeHeaderTop,
        windowScrollY: window.scrollY,
      };
      contentScroller.scrollTop = 0;

      return result;
    });

    expect(scrollMetrics.contentOverflowY).toBeGreaterThan(0);
    expect(scrollMetrics.contentScrollTop).toBeGreaterThan(0);
    expect(scrollMetrics.documentOverflowY).toBeLessThanOrEqual(1);
    expect(Math.abs(scrollMetrics.headerTopDelta)).toBeLessThanOrEqual(1);
    expect(scrollMetrics.windowScrollY).toBe(0);

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

test("admin shell account menu can log out", async ({ page }) => {
  await prepareVisualPage({ page, path: "/dashboard", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);

  await page.getByTestId("sidebar-account-trigger").click();
  await expect(page.getByRole("menuitem", { name: "로그아웃" })).toBeVisible();
  await page.getByRole("menuitem", { name: "로그아웃" }).click();

  await expect(page).toHaveURL(/\/login$/);
});
