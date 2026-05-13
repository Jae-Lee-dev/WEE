import { expect, test } from "playwright/test";
import {
  captureActualScreenshot,
  prepareVisualPage,
  type VisualViewportName,
} from "./helpers";

const routePath = "/workers/worker_kim_seoyeon/schedule";

for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
  test(`WKR-04 default ${viewport}`, async ({ page }) => {
    await prepareVisualPage({ page, path: routePath, viewport });
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("worker-detail-schedule-screen")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "시간표 변경 이력" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("worker-detail-schedule-screen").getByRole("rowheader"),
    ).toHaveText(["일", "월", "화", "수", "목", "금", "토"]);
    const detailShell = page.getByTestId("worker-detail-shell");
    const detailTabs = detailShell.getByRole("navigation", {
      name: "조교 상세 탭",
    });

    await expect(detailTabs).toHaveCSS("padding-left", "16px");
    await expect(detailTabs.getByRole("tablist")).toHaveCSS(
      "justify-content",
      "flex-start",
    );
    await expect(detailTabs.getByRole("tab", { name: "시간표" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText("영어 C반").first()).toBeVisible();
    await expect(
      page.getByRole("gridcell", { name: /연구실 행정/ }),
    ).toHaveCSS("height", "54px");
    await expect(page.getByText("배정 없음")).toHaveCount(0);
    await expect(page.getByTestId("worker-detail-recent-work-records")).toContainText(
      "근무기록으로 이동",
    );
    await expect(page.getByRole("link", { name: "근무기록으로 이동" }))
      .toHaveAttribute("href", /\/records\?workerName=%EA%B9%80%EC%84%9C%EC%97%B0$/);

    await captureActualScreenshot({
      page,
      screenId: "WKR-04",
      viewport,
    });
  });
}

test("WKR-04 detail tabs route with shared tab semantics", async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: "desktop-1920" });

  await page
    .getByRole("navigation", { name: "조교 상세 탭" })
    .getByRole("tab", { name: "급여 현황" })
    .click();

  await expect(page).toHaveURL(/\/workers\/worker_kim_seoyeon\/payroll$/);
});

test("WKR-04 detail tabs animate between routes", async ({ page }) => {
  await prepareVisualPage({ page, path: routePath, viewport: "desktop-1920" });

  const samples = await page.evaluate(async () => {
    const nav = document.querySelector('[aria-label="조교 상세 탭"]');
    const indicator = nav?.querySelector('[data-testid="line-tabs-indicator"]');
    const payrollTab = Array.from(nav?.querySelectorAll('[role="tab"]') ?? [])
      .find((tab) => tab.textContent?.includes("급여 현황"));

    if (!(indicator instanceof HTMLElement) || !(payrollTab instanceof HTMLElement)) {
      throw new Error("Worker detail tabs animation target not found");
    }

    const readX = () => {
      const transform = getComputedStyle(indicator).transform;

      if (transform === "none") {
        return 0;
      }

      return new DOMMatrixReadOnly(transform).m41;
    };
    const beforeX = readX();
    const xValues: number[] = [];

    payrollTab.click();

    for (let index = 0; index < 40; index += 1) {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      xValues.push(readX());
    }

    return { beforeX, xValues };
  });

  const changedValues = samples.xValues
    .map((value) => Math.round(value))
    .filter((value) => value !== Math.round(samples.beforeX));

  expect(new Set(changedValues).size).toBeGreaterThan(2);
  await expect(page).toHaveURL(/\/workers\/worker_kim_seoyeon\/payroll$/);
});

test("WKR-04 full-page desktop-1920", async ({ page }) => {
  const viewport: VisualViewportName = "desktop-1920";

  await prepareVisualPage({ page, path: routePath, viewport });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("worker-detail-recent-work-records")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-04",
    state: "full-page",
    viewport,
    fullPage: true,
  });
});

test("WKR-04 default desktop-1920-tall", async ({ page }) => {
  const viewport: VisualViewportName = "desktop-1920-tall";

  await prepareVisualPage({ page, path: routePath, viewport });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("worker-detail-recent-work-records")).toBeVisible();

  await captureActualScreenshot({
    page,
    screenId: "WKR-04",
    viewport,
  });
});
