import { expect, test } from "playwright/test";
import { captureActualScreenshot, prepareVisualPage } from "./helpers";

const entryPages = [
  {
    screenId: "AUTH-01",
    path: "/login",
    testId: "login-screen",
    heading: "로그인",
  },
  {
    screenId: "AUTH-02",
    path: "/signup",
    testId: "signup-screen",
    heading: "회원가입",
  },
  {
    screenId: "AUTH-03",
    path: "/forgot-password",
    testId: "forgot-password-screen",
    heading: "아이디/비밀번호 찾기",
  },
  {
    screenId: "ONB-01",
    path: "/onboarding/workspace",
    testId: "workspace-onboarding-screen",
    heading: "사업장 생성",
  },
  {
    screenId: "ONB-02",
    path: "/onboarding/setup",
    testId: "setup-guide-screen",
    heading: "초기 설정 가이드",
  },
] as const;

for (const entryPage of entryPages) {
  for (const viewport of ["desktop-1920", "laptop-1366"] as const) {
    test(`${entryPage.screenId} default ${viewport}`, async ({ page }) => {
      await prepareVisualPage({ page, path: entryPage.path, viewport });
      await page.evaluate(() => document.fonts.ready);

      await expect(
        page.getByRole("heading", { name: entryPage.heading, level: 1 }),
      ).toBeVisible();
      await expect(page.getByTestId(entryPage.testId)).toBeVisible();

      await captureActualScreenshot({
        page,
        screenId: entryPage.screenId,
        viewport,
      });
    });
  }
}

test("AUTH-01 keeps login layout compact without page scroll", async ({ page }) => {
  await prepareVisualPage({ page, path: "/login", viewport: "laptop-1366" });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('nav[aria-label="진입 메뉴"]')).toHaveCount(0);

  const rememberCheckbox = page.getByRole("checkbox", {
    name: "로그인 유지",
  });
  await expect(rememberCheckbox).toBeVisible();
  await rememberCheckbox.click();
  await expect(rememberCheckbox).toHaveAttribute("data-state", "checked");

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const loginScreen = document.querySelector('[data-testid="login-screen"]');
    const card = loginScreen?.parentElement?.parentElement;
    const socialButtons = Array.from(
      document.querySelectorAll('[aria-label="소셜 로그인"] button'),
    );
    const socialRects = socialButtons.map((button) =>
      button.getBoundingClientRect(),
    );
    const checkbox = document.querySelector('[role="checkbox"]');

    return {
      cardWidth: card?.getBoundingClientRect().width ?? 0,
      checkboxBackground:
        checkbox instanceof HTMLElement
          ? getComputedStyle(checkbox).backgroundColor
          : "",
      pageOverflowY: Math.max(
        root.scrollHeight - root.clientHeight,
        body.scrollHeight - body.clientHeight,
      ),
      socialButtonCount: socialButtons.length,
      socialButtonHeights: socialRects.map((rect) => rect.height),
      socialButtonTops: socialRects.map((rect) => rect.top),
      socialButtonWidths: socialRects.map((rect) => rect.width),
    };
  });

  expect(metrics.pageOverflowY).toBeLessThanOrEqual(1);
  expect(metrics.cardWidth).toBeLessThanOrEqual(480);
  expect(metrics.checkboxBackground).not.toBe("rgb(0, 0, 0)");
  expect(metrics.socialButtonCount).toBe(3);

  for (const [index, width] of metrics.socialButtonWidths.entries()) {
    expect(
      Math.abs(width - metrics.socialButtonHeights[index]),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(metrics.socialButtonTops[0] - metrics.socialButtonTops[index]),
    ).toBeLessThanOrEqual(1);
  }
});
